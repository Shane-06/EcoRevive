const AiProvider = require('./ai.interface');

/**
 * Deterministic Mock AI Provider for offline development, automated tests, and CI.
 *
 * Guarantees zero external network requests, zero API key requirements,
 * and zero billing account commitments ($0.00 cost).
 */
class MockAiProvider extends AiProvider {
  constructor(options = {}) {
    super();
    this.name = 'MockAiProvider';
    this.modelName = options.modelName || 'mock-model';
    this.fallbackNotice = options.fallbackNotice || null;
    this.delayMs = options.delayMs || 0;
    this.customResponses = [];
    this.customErrors = [];
    this.callHistory = [];
  }

  /**
   * Enqueues one or more canned responses for subsequent calls.
   * @param {string|object|Array<string|object>} responses
   */
  setMockResponse(responses) {
    if (Array.isArray(responses)) {
      this.customResponses.push(...responses);
    } else {
      this.customResponses.push(responses);
    }
  }

  /**
   * Enqueues one or more errors to be thrown by subsequent calls.
   * @param {Error|object|Array<Error|object>} errors
   */
  setMockError(errors) {
    if (Array.isArray(errors)) {
      this.customErrors.push(...errors);
    } else {
      this.customErrors.push(errors);
    }
  }

  /**
   * Sets artificial delay for calls (can test cancellation).
   * @param {number} ms
   */
  setDelay(ms) {
    this.delayMs = ms;
  }

  /**
   * Clears mock responses, errors, and call history.
   */
  reset() {
    this.customResponses = [];
    this.customErrors = [];
    this.callHistory = [];
    this.delayMs = 0;
  }

  /**
   * Generates a deterministic mock response adhering to the AiProvider contract.
   *
   * @param {object} params
   * @param {string} [params.systemPrompt]
   * @param {Array<{role: string, content: string}>} [params.messages]
   * @param {number} [params.temperature]
   * @param {number} [params.maxTokens]
   * @param {AbortSignal} [params.signal]
   * @returns {Promise<object>}
   */
  async generateChatResponse({ systemPrompt, messages = [], temperature = 0.7, maxTokens = 800, signal }) {
    // Record call telemetry for deterministic assertions
    this.callHistory.push({
      systemPrompt,
      messages,
      temperature,
      maxTokens,
      timestamp: Date.now(),
    });

    // Check cancellation prior to execution
    if (signal && signal.aborted) {
      const abortError = new DOMException('Request aborted by caller', 'AbortError');
      abortError.reason = signal.reason;
      throw abortError;
    }

    // Apply delay if configured (cancellable)
    if (this.delayMs > 0) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, this.delayMs);
        if (signal) {
          const onAbort = () => {
            clearTimeout(timer);
            const abortError = new DOMException('Request aborted during mock delay', 'AbortError');
            abortError.reason = signal.reason;
            reject(abortError);
          };
          signal.addEventListener('abort', onAbort, { once: true });
        }
      });
    }

    // Check if custom error is queued
    if (this.customErrors.length > 0) {
      const err = this.customErrors.shift();
      if (err instanceof Error) {
        throw err;
      }
      const genericError = new Error(err.message || 'Simulated provider error');
      if (err.statusCode) genericError.statusCode = err.statusCode;
      if (err.code) genericError.code = err.code;
      throw genericError;
    }

    // Check magic simulation triggers inside user messages
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    const userText = lastUserMessage ? lastUserMessage.content : '';

    if (userText.includes('__SIMULATE_429__')) {
      const error = new Error('Resource has been exhausted (e.g. check quota).');
      error.statusCode = 429;
      error.code = 'RESOURCE_EXHAUSTED';
      throw error;
    }

    if (userText.includes('__SIMULATE_500__')) {
      const error = new Error('Internal provider error');
      error.statusCode = 500;
      error.code = 'INTERNAL_ERROR';
      throw error;
    }

    if (userText.includes('__SIMULATE_TIMEOUT__')) {
      const error = new DOMException('Simulated provider timeout', 'TimeoutError');
      throw error;
    }

    // Check if canned response is queued
    if (this.customResponses.length > 0) {
      const nextResponse = this.customResponses.shift();
      if (typeof nextResponse === 'string') {
        return {
          content: nextResponse,
          model: this.modelName,
          fallbackUsed: false,
          usage: { promptTokens: 15, completionTokens: 30, totalTokens: 45 },
          finishReason: 'STOP',
          costIncurred: '$0.00',
        };
      }
      return {
        content: nextResponse.content || '',
        model: nextResponse.model || this.modelName,
        fallbackUsed: Boolean(nextResponse.fallbackUsed),
        usage: nextResponse.usage || { promptTokens: 15, completionTokens: 30, totalTokens: 45 },
        finishReason: nextResponse.finishReason || 'STOP',
        costIncurred: '$0.00',
      };
    }

    // Generate grounded deterministic response based on query
    let content = 'I am EcoGuide, your contextual knowledge assistant for EcoRevive. Based on approved platform guidance, our 9-stage lifecycle (Discover, Assess, Plant, Prove, Verify, Identify, Monitor, Reward, Track) supports verified tree stewardship.';

    if (userText.toLowerCase().includes('health')) {
      content = 'Tree health records in EcoRevive follow four standard statuses: Healthy, Good, Needs Attention, and Dead. Health trends are evaluated deterministically from recorded caretaker observations.';
    } else if (userText.toLowerCase().includes('verification') || userText.toLowerCase().includes('verify')) {
      content = 'Verification is stage 5 of the EcoRevive lifecycle. Coordinators and admins review photographic evidence and geospatial coordinates before approving plantations and assigning permanent Tree IDs.';
    }

    return {
      content,
      model: this.modelName,
      fallbackUsed: false,
      usage: {
        promptTokens: Math.max(10, Math.floor(userText.length / 4)),
        completionTokens: Math.floor(content.length / 4),
        totalTokens: Math.max(10, Math.floor(userText.length / 4)) + Math.floor(content.length / 4),
      },
      finishReason: 'STOP',
      costIncurred: '$0.00',
    };
  }
}

module.exports = MockAiProvider;
