const AiProvider = require('./ai.interface');
const config = require('../../config');
const { BadRequestError, UnauthorizedError, ProviderUnavailableError } = require('../../utils/errors');

// Strict Zero-Billing Policy: Only approved Google AI Studio Free Tier models are permitted.
const ALLOWED_FREE_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];

/**
 * Gemini AI Provider adapter conforming to EcoRevive V2 AI Foundation specification.
 *
 * Implements bounded retry, per-attempt timeouts, shared request deadline (25,000 ms),
 * primary-to-fallback failover, and graceful degradation ($0.00 cost commitment).
 */
class GeminiAiProvider extends AiProvider {
  constructor(options = {}) {
    super();
    this.name = 'GeminiAiProvider';
    this.apiKey = options.apiKey !== undefined ? options.apiKey : config.ai.apiKey;
    this.timeoutMs = options.timeoutMs !== undefined ? options.timeoutMs : config.ai.timeoutMs;
    this.overallDeadlineMs = options.overallDeadlineMs !== undefined ? options.overallDeadlineMs : config.ai.overallDeadlineMs;
    this.baseUrl = options.baseUrl || 'https://generativelanguage.googleapis.com';
    this.primaryModel = options.primaryModel || config.ai.primaryModel || 'gemini-3.8-flash';
    this.fallbackModel = options.fallbackModel || config.ai.fallbackModel || 'gemini-3.5-flash-lite';
    this.retryBackoffMs = options.retryBackoffMs !== undefined ? options.retryBackoffMs : 1000;
    this.disableJitter = Boolean(options.disableJitter);
    this.fetch = options.fetch || globalThis.fetch;

    // Zero-billing policy enforcement: Validate that only approved free-tier models are used
    if (!ALLOWED_FREE_MODELS.includes(this.primaryModel)) {
      throw new Error(
        `Invalid primary model "${this.primaryModel}". Zero-billing policy permits only free-tier models: ${ALLOWED_FREE_MODELS.join(', ')}`
      );
    }
    if (!ALLOWED_FREE_MODELS.includes(this.fallbackModel)) {
      throw new Error(
        `Invalid fallback model "${this.fallbackModel}". Zero-billing policy permits only free-tier models: ${ALLOWED_FREE_MODELS.join(', ')}`
      );
    }

    if (!this.apiKey) {
      throw new Error('Gemini API key is required. Keep AI_PROVIDER=mock for offline operation.');
    }
  }

  /**
   * Constructs the Google AI Studio Gemini generateContent request body.
   *
   * @param {object} params
   * @param {string} [params.systemPrompt]
   * @param {Array<{role: string, content: string}>} [params.messages]
   * @param {number} [params.temperature=0.7]
   * @param {number} [params.maxTokens=800]
   * @returns {object} Formatted payload
   */
  formatGeminiRequest({ systemPrompt, messages = [], temperature = 0.7, maxTokens = 800 }) {
    const contents = [];

    if (Array.isArray(messages)) {
      for (const msg of messages) {
        contents.push({
          // In Gemini API, assistant completions are mapped to role 'model'
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(msg.content || '') }],
        });
      }
    }

    const payload = {
      contents,
      generationConfig: {
        temperature: typeof temperature === 'number' ? temperature : 0.7,
        maxOutputTokens: typeof maxTokens === 'number' ? maxTokens : 800,
      },
    };

    if (systemPrompt && typeof systemPrompt === 'string' && systemPrompt.trim()) {
      payload.systemInstruction = {
        parts: [{ text: systemPrompt.trim() }],
      };
    }

    return payload;
  }

  /**
   * Performs an individual HTTP request attempt to a specific model.
   *
   * @param {string} model
   * @param {object} payload
   * @param {number} attemptTimeoutMs
   * @param {AbortSignal} [parentSignal]
   * @returns {Promise<object>}
   */
  async executeAttempt(model, payload, attemptTimeoutMs, parentSignal) {
    const url = `${this.baseUrl}/v1beta/models/${model}:generateContent`;

    // Attempt controller linked to timeout and parentSignal
    const attemptController = new AbortController();
    let isTimedOut = false;

    const timer = setTimeout(() => {
      isTimedOut = true;
      attemptController.abort(new DOMException(`Request to ${model} timed out after ${attemptTimeoutMs}ms`, 'TimeoutError'));
    }, attemptTimeoutMs);

    const onParentAbort = () => {
      attemptController.abort(parentSignal.reason || 'CLIENT_DISCONNECTED');
    };

    if (parentSignal) {
      if (parentSignal.aborted) {
        clearTimeout(timer);
        const abortErr = new DOMException('Request aborted prior to attempt', 'AbortError');
        abortErr.reason = parentSignal.reason;
        throw abortErr;
      }
      parentSignal.addEventListener('abort', onParentAbort, { once: true });
    }

    try {
      const response = await this.fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(payload),
        signal: attemptController.signal,
      });

      clearTimeout(timer);
      if (parentSignal) {
        parentSignal.removeEventListener('abort', onParentAbort);
      }

      if (!response.ok) {
        let errorData = null;
        try {
          errorData = await response.json();
        } catch (_parseErr) {
          // If response body is not JSON, errorData remains null
        }

        const providerMessage = errorData?.error?.message || `HTTP ${response.status}`;
        const err = new Error(providerMessage);
        err.statusCode = response.status;
        err.status = errorData?.error?.status || null;
        err.isProviderError = true;
        throw err;
      }

      const json = await response.json();
      const candidate = json.candidates?.[0];
      const text = candidate?.content?.parts?.map(p => p.text).join('') || '';
      const finishReason = candidate?.finishReason;

      if (!text && !finishReason) {
        const malformedErr = new Error('Provider returned malformed candidate payload');
        malformedErr.isMalformed = true;
        malformedErr.statusCode = 502;
        throw malformedErr;
      }

      const usage = json.usageMetadata
        ? {
            promptTokens: json.usageMetadata.promptTokenCount || 0,
            completionTokens: json.usageMetadata.candidatesTokenCount || 0,
            totalTokens: json.usageMetadata.totalTokenCount || 0,
          }
        : undefined;

      return {
        content: text,
        model,
        usage,
        finishReason: finishReason || 'STOP',
        costIncurred: '$0.00',
      };
    } catch (err) {
      clearTimeout(timer);
      if (parentSignal) {
        parentSignal.removeEventListener('abort', onParentAbort);
      }

      if (isTimedOut) {
        const timeoutErr = new DOMException(`Attempt to ${model} timed out after ${attemptTimeoutMs}ms`, 'TimeoutError');
        timeoutErr.isTimeout = true;
        throw timeoutErr;
      }

      throw err;
    }
  }

  /**
   * Helper to sleep asynchronously in a manner that cancels immediately if parent signal fires.
   *
   * @param {number} ms
   * @param {AbortSignal} [signal]
   * @returns {Promise<void>}
   */
  cancellableSleep(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal && signal.aborted) {
        const abortErr = new DOMException('Request cancelled', 'AbortError');
        abortErr.reason = signal.reason;
        return reject(abortErr);
      }

      const timer = setTimeout(resolve, ms);

      if (signal) {
        const onAbort = () => {
          clearTimeout(timer);
          const abortErr = new DOMException('Request cancelled during backoff', 'AbortError');
          abortErr.reason = signal.reason;
          reject(abortErr);
        };
        signal.addEventListener('abort', onAbort, { once: true });
      }
    });
  }

  /**
   * Classifies error and handles non-transient failures immediately.
   *
   * @param {Error} err
   * @param {AbortSignal} [parentSignal]
   */
  handleErrorClassification(err, parentSignal) {
    // If client cancelled or parent signal aborted, rethrow immediately
    if ((parentSignal && parentSignal.aborted) || err.name === 'AbortError') {
      const abortErr = new DOMException('Request aborted by client', 'AbortError');
      abortErr.reason = parentSignal ? parentSignal.reason : 'CLIENT_DISCONNECTED';
      throw abortErr;
    }

    // 400 Bad Request: Non-transient payload error
    if (err.statusCode === 400) {
      throw new BadRequestError(`Bad request to AI provider: ${err.message}`, 'AI_BAD_REQUEST');
    }

    // 401 Unauthorized / 403 Forbidden: Non-transient authentication or configuration error
    if (err.statusCode === 401 || err.statusCode === 403) {
      // Security Invariant: Log operational alert WITHOUT logging the API key
      console.error(`[AI Provider Auth Alert] Authentication failed with provider (HTTP ${err.statusCode})`);
      throw new UnauthorizedError('AI provider authentication failed. Check server configuration.', 'AI_AUTH_ERROR');
    }

    // Transient errors (429, 500, 502, 503, 504, TimeoutError, network error, malformed) return silently to continue sequence
  }

  /**
   * Throws the frozen 503 PROVIDER_UNAVAILABLE graceful degradation error envelope.
   *
   * @param {number} startTime
   */
  throwProviderUnavailable(startTime) {
    const totalElapsedMs = Date.now() - startTime;
    throw new ProviderUnavailableError(
      'EcoGuide assistant free tier quota is temporarily unavailable. Please try again shortly.',
      'PROVIDER_UNAVAILABLE',
      {
        provider: 'google-gemini-free-tier',
        primaryModel: this.primaryModel,
        fallbackModel: this.fallbackModel,
        totalElapsedMs,
        costIncurred: '$0.00',
      }
    );
  }

  /**
   * Generates a chat response executing the frozen bounded retry and fallback sequence.
   *
   * @param {object} params
   * @param {string} [params.systemPrompt]
   * @param {Array<{role: string, content: string}>} [params.messages]
   * @param {number} [params.temperature=0.7]
   * @param {number} [params.maxTokens=800]
   * @param {AbortSignal} [params.signal] - Cancellation signal
   * @returns {Promise<object>}
   */
  async generateChatResponse({ systemPrompt, messages = [], temperature = 0.7, maxTokens = 800, signal }) {
    const startTime = Date.now();
    const deadline = startTime + this.overallDeadlineMs;
    const payload = this.formatGeminiRequest({ systemPrompt, messages, temperature, maxTokens });

    // Step 1: Primary Attempt 1 (gemini-3.8-flash)
    let remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      this.throwProviderUnavailable(startTime);
    }

    try {
      const attemptTimeout = Math.min(this.timeoutMs, remainingMs);
      const result = await this.executeAttempt(this.primaryModel, payload, attemptTimeout, signal);
      return {
        ...result,
        fallbackUsed: false,
      };
    } catch (err) {
      this.handleErrorClassification(err, signal);
    }

    // Step 2: Pre-Retry Deadline Gate (Check remainingMs > 1000)
    remainingMs = deadline - Date.now();
    if (remainingMs > 1000) {
      // Jittered backoff (1000ms + random 0-200ms)
      const jitter = this.disableJitter ? 0 : Math.floor(Math.random() * 200);
      const sleepTime = Math.min(this.retryBackoffMs + jitter, remainingMs - 1000);

      try {
        await this.cancellableSleep(sleepTime, signal);
      } catch (sleepErr) {
        this.handleErrorClassification(sleepErr, signal);
      }

      // Step 3: Primary Attempt 2 (Retry)
      remainingMs = deadline - Date.now();
      if (remainingMs > 0) {
        try {
          const attemptTimeout = Math.min(this.timeoutMs, remainingMs);
          const result = await this.executeAttempt(this.primaryModel, payload, attemptTimeout, signal);
          return {
            ...result,
            fallbackUsed: false,
          };
        } catch (retryErr) {
          this.handleErrorClassification(retryErr, signal);
        }
      }
    }

    // Step 4: Pre-Fallback Deadline Gate (Check remainingMs > 500)
    remainingMs = deadline - Date.now();
    if (remainingMs > 500) {
      // Step 5: Fallback Attempt (gemini-3.5-flash-lite)
      try {
        const attemptTimeout = Math.min(this.timeoutMs, remainingMs);
        const result = await this.executeAttempt(this.fallbackModel, payload, attemptTimeout, signal);
        return {
          ...result,
          fallbackUsed: true,
        };
      } catch (fallbackErr) {
        this.handleErrorClassification(fallbackErr, signal);
      }
    }

    // Step 6: Graceful Degradation ($0.00 incurred)
    this.throwProviderUnavailable(startTime);
  }
}

module.exports = GeminiAiProvider;
module.exports.ALLOWED_FREE_MODELS = ALLOWED_FREE_MODELS;
