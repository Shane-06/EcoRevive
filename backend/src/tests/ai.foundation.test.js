const {
  AiProvider,
  MockAiProvider,
  GeminiAiProvider,
  getAiProvider,
  setupClientDisconnect,
} = require('../integrations/ai');
const {
  BadRequestError,
  UnauthorizedError,
  ProviderUnavailableError,
} = require('../utils/errors');
const config = require('../config');
const { EventEmitter } = require('events');

describe('AI Foundation (V2-M1)', () => {
  const originalAiConfig = { ...config.ai };

  afterEach(() => {
    config.ai = { ...originalAiConfig };
    jest.restoreAllMocks();
  });

  // =========================================================================
  // 1. Provider Abstraction & Factory Selection
  // =========================================================================
  describe('1. Provider Abstraction & Factory Selection', () => {
    it('AI-ABS-01: Base AiProvider requires generateChatResponse implementation', async () => {
      const baseProvider = new AiProvider();
      await expect(baseProvider.generateChatResponse({})).rejects.toThrow(
        'generateChatResponse() must be implemented'
      );
    });

    it('AI-SEL-01: Defaults to MockAiProvider when AI_PROVIDER is mock or unset', () => {
      config.ai.provider = 'mock';
      const provider = getAiProvider();
      expect(provider).toBeInstanceOf(MockAiProvider);
      expect(provider.name).toBe('MockAiProvider');
    });

    it('AI-SEL-02: Safely falls back to MockAiProvider when GEMINI_API_KEY is empty or unset', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const provider = getAiProvider({ provider: 'gemini', apiKey: '' });

      expect(provider).toBeInstanceOf(MockAiProvider);
      expect(provider.fallbackNotice).toContain('Gemini API key is not configured');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringMatching(/safely operating with MockAiProvider/i)
      );
    });

    it('AI-SEL-03: Instantiates GeminiAiProvider when provider is gemini and API key is present', () => {
      const provider = getAiProvider({
        provider: 'gemini',
        apiKey: 'dummy-test-key-12345',
      });

      expect(provider).toBeInstanceOf(GeminiAiProvider);
      expect(provider.name).toBe('GeminiAiProvider');
      expect(provider.primaryModel).toBe('gemini-3.8-flash');
      expect(provider.fallbackModel).toBe('gemini-3.5-flash-lite');
    });

    it('AI-SEL-04: Rejects unauthorized/paid providers to protect zero-billing invariant', () => {
      expect(() => getAiProvider({ provider: 'openai' })).toThrow(
        'Unsupported AI provider: "openai". Zero-billing policy permits only "mock" and "gemini".'
      );
      expect(() => getAiProvider({ provider: 'anthropic' })).toThrow(
        'Unsupported AI provider: "anthropic". Zero-billing policy permits only "mock" and "gemini".'
      );
      expect(() => getAiProvider({ provider: 'claude' })).toThrow(
        'Unsupported AI provider: "claude". Zero-billing policy permits only "mock" and "gemini".'
      );
    });
  });

  // =========================================================================
  // 2. MockAiProvider Offline Operation & Telemetry
  // =========================================================================
  describe('2. MockAiProvider Offline Operation', () => {
    it('AI-MCK-01: Operates 100% offline with zero keys and zero network calls', async () => {
      const mockProvider = new MockAiProvider();
      const res = await mockProvider.generateChatResponse({
        messages: [{ role: 'user', content: 'Tell me about EcoRevive lifecycle' }],
      });

      expect(res.content).toContain('9-stage lifecycle');
      expect(res.model).toBe('mock-model');
      expect(res.fallbackUsed).toBe(false);
      expect(res.costIncurred).toBe('$0.00');
      expect(res.usage).toBeDefined();
      expect(res.finishReason).toBe('STOP');
    });

    it('AI-MCK-02: Returns deterministic responses for specific topics (health, verification)', async () => {
      const mockProvider = new MockAiProvider();

      const healthRes = await mockProvider.generateChatResponse({
        messages: [{ role: 'user', content: 'What is the health status?' }],
      });
      expect(healthRes.content).toContain('Healthy, Good, Needs Attention, and Dead');

      const verifyRes = await mockProvider.generateChatResponse({
        messages: [{ role: 'user', content: 'How does verification work?' }],
      });
      expect(verifyRes.content).toContain('stage 5 of the EcoRevive lifecycle');
    });

    it('AI-MCK-03: Respects custom canned responses and resets cleanly', async () => {
      const mockProvider = new MockAiProvider();
      mockProvider.setMockResponse('Custom canned response 1');
      mockProvider.setMockResponse({ content: 'Custom canned response 2', model: 'mock-custom' });

      const res1 = await mockProvider.generateChatResponse({ messages: [] });
      expect(res1.content).toBe('Custom canned response 1');

      const res2 = await mockProvider.generateChatResponse({ messages: [] });
      expect(res2.content).toBe('Custom canned response 2');
      expect(res2.model).toBe('mock-custom');

      mockProvider.reset();
      const res3 = await mockProvider.generateChatResponse({ messages: [] });
      expect(res3.content).toContain('I am EcoGuide');
    });

    it('AI-MCK-04: Simulates errors on request or via magic test tokens', async () => {
      const mockProvider = new MockAiProvider();

      // Explicit error queue
      const customErr = new Error('Simulated custom failure');
      customErr.statusCode = 503;
      mockProvider.setMockError(customErr);
      await expect(mockProvider.generateChatResponse({ messages: [] })).rejects.toThrow(
        'Simulated custom failure'
      );

      // Magic token: __SIMULATE_429__
      await expect(
        mockProvider.generateChatResponse({
          messages: [{ role: 'user', content: 'Please do something __SIMULATE_429__' }],
        })
      ).rejects.toMatchObject({ statusCode: 429, code: 'RESOURCE_EXHAUSTED' });

      // Magic token: __SIMULATE_500__
      await expect(
        mockProvider.generateChatResponse({
          messages: [{ role: 'user', content: '__SIMULATE_500__' }],
        })
      ).rejects.toMatchObject({ statusCode: 500, code: 'INTERNAL_ERROR' });

      // Magic token: __SIMULATE_TIMEOUT__
      await expect(
        mockProvider.generateChatResponse({
          messages: [{ role: 'user', content: '__SIMULATE_TIMEOUT__' }],
        })
      ).rejects.toThrow('Simulated provider timeout');
    });

    it('AI-MCK-05: Respects AbortSignal cancellation', async () => {
      const mockProvider = new MockAiProvider();
      const controller = new AbortController();
      controller.abort('TEST_ABORT');

      await expect(
        mockProvider.generateChatResponse({
          messages: [{ role: 'user', content: 'Hello' }],
          signal: controller.signal,
        })
      ).rejects.toThrow('Request aborted');
    });
  });

  // =========================================================================
  // 3. Gemini Provider: Successful Request & Header Authentication
  // =========================================================================
  describe('3. Gemini Provider: Successful Request & Header Authentication', () => {
    it('AI-GEM-01: Transmits API key via x-goog-api-key header and never in URL', async () => {
      let capturedUrl = '';
      let capturedHeaders = {};
      let capturedBody = {};

      const mockFetch = jest.fn().mockImplementation(async (url, init) => {
        capturedUrl = url;
        capturedHeaders = init.headers;
        capturedBody = JSON.parse(init.body);

        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: 'Here is a grounded EcoRevive answer.' }],
                  role: 'model',
                },
                finishReason: 'STOP',
              },
            ],
            usageMetadata: {
              promptTokenCount: 25,
              candidatesTokenCount: 15,
              totalTokenCount: 40,
            },
          }),
        };
      });

      const provider = new GeminiAiProvider({
        apiKey: 'secret-ai-studio-key-xyz',
        fetch: mockFetch,
        retryBackoffMs: 10,
        disableJitter: true,
      });

      const res = await provider.generateChatResponse({
        systemPrompt: 'You are EcoGuide.',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
          { role: 'user', content: 'Explain stages.' },
        ],
        temperature: 0.2,
        maxTokens: 500,
      });

      // Verify URL never contains ?key=
      expect(capturedUrl).toBe(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent'
      );
      expect(capturedUrl).not.toContain('secret-ai-studio-key-xyz');
      expect(capturedUrl).not.toContain('key=');

      // Verify header authentication
      expect(capturedHeaders['x-goog-api-key']).toBe('secret-ai-studio-key-xyz');
      expect(capturedHeaders['Content-Type']).toBe('application/json');

      // Verify payload structure (role mapping, system instruction, limits)
      expect(capturedBody.systemInstruction.parts[0].text).toBe('You are EcoGuide.');
      expect(capturedBody.contents).toHaveLength(3);
      expect(capturedBody.contents[0]).toEqual({ role: 'user', parts: [{ text: 'Hello' }] });
      expect(capturedBody.contents[1]).toEqual({ role: 'model', parts: [{ text: 'Hi there!' }] });
      expect(capturedBody.contents[2]).toEqual({ role: 'user', parts: [{ text: 'Explain stages.' }] });
      expect(capturedBody.generationConfig.temperature).toBe(0.2);
      expect(capturedBody.generationConfig.maxOutputTokens).toBe(500);

      // Verify returned result and zero cost
      expect(res.content).toBe('Here is a grounded EcoRevive answer.');
      expect(res.model).toBe('gemini-3.8-flash');
      expect(res.fallbackUsed).toBe(false);
      expect(res.costIncurred).toBe('$0.00');
      expect(res.usage).toEqual({
        promptTokens: 25,
        completionTokens: 15,
        totalTokens: 40,
      });
    });
  });

  // =========================================================================
  // 4. Bounded Retry, Transient Errors & Model Fallback Sequence
  // =========================================================================
  describe('4. Bounded Retry, Transient Errors & Model Fallback Sequence', () => {
    it('AI-FLB-01: Retries primary model on 429 and falls back to gemini-3.5-flash-lite on second 429', async () => {
      const callLog = [];

      const mockFetch = jest.fn().mockImplementation(async (url) => {
        const model = url.split('/models/')[1].split(':')[0];
        callLog.push(model);

        // Attempt 1 (primary): 429 Rate limit
        if (callLog.length === 1) {
          return {
            ok: false,
            status: 429,
            json: async () => ({
              error: { code: 429, message: 'Resource has been exhausted (quota exceeded).' },
            }),
          };
        }

        // Attempt 2 (primary retry): 429 Rate limit
        if (callLog.length === 2) {
          return {
            ok: false,
            status: 429,
            json: async () => ({
              error: { code: 429, message: 'Resource has been exhausted.' },
            }),
          };
        }

        // Attempt 3 (fallback gemini-3.5-flash-lite): 200 OK
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: { parts: [{ text: 'Response from fallback model.' }], role: 'model' },
                finishReason: 'STOP',
              },
            ],
          }),
        };
      });

      const provider = new GeminiAiProvider({
        apiKey: 'test-key',
        fetch: mockFetch,
        retryBackoffMs: 5,
        disableJitter: true,
      });

      const result = await provider.generateChatResponse({
        messages: [{ role: 'user', content: 'Test query' }],
      });

      expect(callLog).toEqual([
        'gemini-3.8-flash', // Attempt 1 (primary)
        'gemini-3.8-flash', // Attempt 2 (primary retry after backoff)
        'gemini-3.5-flash-lite', // Attempt 3 (fallback model)
      ]);
      expect(result.content).toBe('Response from fallback model.');
      expect(result.model).toBe('gemini-3.5-flash-lite');
      expect(result.fallbackUsed).toBe(true);
      expect(result.costIncurred).toBe('$0.00');
    });

    it('AI-FLB-02: Succeeds on primary retry if primary recovers after backoff', async () => {
      const callLog = [];

      const mockFetch = jest.fn().mockImplementation(async (url) => {
        const model = url.split('/models/')[1].split(':')[0];
        callLog.push(model);

        if (callLog.length === 1) {
          // Attempt 1: 503 transient server error
          return {
            ok: false,
            status: 503,
            json: async () => ({ error: { code: 503, message: 'Service unavailable' } }),
          };
        }

        // Attempt 2 (retry): 200 OK
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: { parts: [{ text: 'Recovered primary response.' }], role: 'model' },
                finishReason: 'STOP',
              },
            ],
          }),
        };
      });

      const provider = new GeminiAiProvider({
        apiKey: 'test-key',
        fetch: mockFetch,
        retryBackoffMs: 5,
        disableJitter: true,
      });

      const result = await provider.generateChatResponse({
        messages: [{ role: 'user', content: 'Test' }],
      });

      expect(callLog).toEqual(['gemini-3.8-flash', 'gemini-3.8-flash']);
      expect(result.content).toBe('Recovered primary response.');
      expect(result.model).toBe('gemini-3.8-flash');
      expect(result.fallbackUsed).toBe(false);
    });

    it('AI-FLB-03: Retries and falls back on per-attempt timeout and network error', async () => {
      const callLog = [];

      const mockFetch = jest.fn().mockImplementation(async (url) => {
        const model = url.split('/models/')[1].split(':')[0];
        callLog.push(model);

        if (callLog.length === 1) {
          // Attempt 1: simulate network timeout
          const err = new DOMException('The operation was timed out.', 'TimeoutError');
          throw err;
        }

        if (callLog.length === 2) {
          // Attempt 2: simulate connection reset
          const netErr = new TypeError('fetch failed');
          throw netErr;
        }

        // Fallback: succeeds
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: { parts: [{ text: 'Fallback response after timeouts.' }], role: 'model' },
                finishReason: 'STOP',
              },
            ],
          }),
        };
      });

      const provider = new GeminiAiProvider({
        apiKey: 'test-key',
        fetch: mockFetch,
        retryBackoffMs: 5,
        disableJitter: true,
      });

      const result = await provider.generateChatResponse({
        messages: [{ role: 'user', content: 'Test' }],
      });

      expect(callLog).toEqual([
        'gemini-3.8-flash',
        'gemini-3.8-flash',
        'gemini-3.5-flash-lite',
      ]);
      expect(result.model).toBe('gemini-3.5-flash-lite');
      expect(result.fallbackUsed).toBe(true);
    });

    it('AI-FLB-04: Treats malformed response (missing candidates/parts) as transient error', async () => {
      const callLog = [];

      const mockFetch = jest.fn().mockImplementation(async (url) => {
        const model = url.split('/models/')[1].split(':')[0];
        callLog.push(model);

        if (callLog.length === 1) {
          // Attempt 1: malformed empty candidates
          return {
            ok: true,
            status: 200,
            json: async () => ({ candidates: [] }),
          };
        }

        // Attempt 2: succeeds
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: { parts: [{ text: 'Valid candidate text.' }], role: 'model' },
                finishReason: 'STOP',
              },
            ],
          }),
        };
      });

      const provider = new GeminiAiProvider({
        apiKey: 'test-key',
        fetch: mockFetch,
        retryBackoffMs: 5,
        disableJitter: true,
      });

      const result = await provider.generateChatResponse({
        messages: [{ role: 'user', content: 'Test' }],
      });

      expect(callLog).toEqual(['gemini-3.8-flash', 'gemini-3.8-flash']);
      expect(result.content).toBe('Valid candidate text.');
    });
  });

  // =========================================================================
  // 5. Non-Transient Errors (Immediate Termination: Zero Retry, Zero Fallback)
  // =========================================================================
  describe('5. Non-Transient Errors (Immediate Termination)', () => {
    it('AI-NON-01: Terminates immediately on 400 Bad Request with zero retry and zero fallback', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: { code: 400, message: 'Invalid JSON payload structure' },
        }),
      });

      const provider = new GeminiAiProvider({
        apiKey: 'test-key',
        fetch: mockFetch,
        retryBackoffMs: 5,
        disableJitter: true,
      });

      await expect(
        provider.generateChatResponse({ messages: [{ role: 'user', content: 'Malformed query' }] })
      ).rejects.toThrow(BadRequestError);

      // Exactly 1 call was made; no retry and no fallback!
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('AI-NON-02: Terminates immediately on 401 Unauthorized / 403 Forbidden without exposing secrets in logs', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: { code: 401, message: 'API key not valid. Please pass a valid API key.' },
        }),
      });

      const provider = new GeminiAiProvider({
        apiKey: 'super-sensitive-secret-key-999',
        fetch: mockFetch,
        retryBackoffMs: 5,
        disableJitter: true,
      });

      await expect(
        provider.generateChatResponse({ messages: [{ role: 'user', content: 'Hello' }] })
      ).rejects.toThrow(UnauthorizedError);

      // Verify zero retry and zero fallback
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify console.error does NOT print the sensitive key
      expect(errorSpy).toHaveBeenCalled();
      const loggedErrorText = errorSpy.mock.calls.map(c => c.join(' ')).join(' ');
      expect(loggedErrorText).not.toContain('super-sensitive-secret-key-999');
    });
  });

  // =========================================================================
  // 6. Overall Request Deadline & Graceful Degradation (503 Contract)
  // =========================================================================
  describe('6. Overall Deadline & Graceful Degradation', () => {
    it('AI-DGR-01: Throws 503 PROVIDER_UNAVAILABLE when all attempts fail, preserving $0.00 cost', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          error: { code: 429, message: 'Quota exhausted for all models.' },
        }),
      });

      const provider = new GeminiAiProvider({
        apiKey: 'test-key',
        fetch: mockFetch,
        retryBackoffMs: 5,
        disableJitter: true,
      });

      try {
        await provider.generateChatResponse({ messages: [{ role: 'user', content: 'Hi' }] });
        throw new Error('Should have thrown ProviderUnavailableError');
      } catch (err) {
        expect(err).toBeInstanceOf(ProviderUnavailableError);
        expect(err.statusCode).toBe(503);
        expect(err.code).toBe('PROVIDER_UNAVAILABLE');
        expect(err.message).toBe(
          'EcoGuide assistant free tier quota is temporarily unavailable. Please try again shortly.'
        );
        expect(err.details).toMatchObject({
          provider: 'google-gemini-free-tier',
          primaryModel: 'gemini-3.8-flash',
          fallbackModel: 'gemini-3.5-flash-lite',
          costIncurred: '$0.00',
        });
        expect(typeof err.details.totalElapsedMs).toBe('number');
      }
    });

    it('AI-DGR-02: Bounded deadline gates skip retry (<=1000ms) and fallback (<=500ms)', async () => {
      const callLog = [];

      // Create provider with extremely short overall deadline (50ms)
      const provider = new GeminiAiProvider({
        apiKey: 'test-key',
        overallDeadlineMs: 60,
        retryBackoffMs: 100,
        disableJitter: true,
        fetch: jest.fn().mockImplementation(async (url) => {
          callLog.push(url);
          // Simulate latency of 40ms on attempt 1, leaving < 20ms remaining
          await new Promise(r => setTimeout(r, 40));
          return {
            ok: false,
            status: 503,
            json: async () => ({ error: { message: 'Transient fail' } }),
          };
        }),
      });

      await expect(
        provider.generateChatResponse({ messages: [{ role: 'user', content: 'Deadline check' }] })
      ).rejects.toThrow(ProviderUnavailableError);

      // Remaining time (< 20ms) was <= 1000ms (skipping retry) and <= 500ms (skipping fallback)
      expect(callLog).toHaveLength(1);
      expect(callLog[0]).toContain('gemini-3.8-flash');
    });

    it('AI-DGR-03: Never hardcodes quota allowances or quota reset time', () => {
      const provider = new GeminiAiProvider({ apiKey: 'test-key' });

      // Ensure provider object has no hardcoded quota limits or reset clocks
      expect(provider.rpmLimit).toBeUndefined();
      expect(provider.rpdLimit).toBeUndefined();
      expect(provider.resetClock).toBeUndefined();
      expect(provider.quotaResetTime).toBeUndefined();
    });
  });

  // =========================================================================
  // 7. Client Disconnect Cancellation
  // =========================================================================
  describe('7. Client Disconnect Cancellation', () => {
    it('AI-CNC-01: Premature disconnect (res.writableEnded === false) aborts the controller with CLIENT_DISCONNECTED', () => {
      const fakeRes = new EventEmitter();
      fakeRes.writableEnded = false;

      const { controller, signal, cleanup } = setupClientDisconnect(fakeRes);

      expect(controller).toBeDefined();
      expect(signal.aborted).toBe(false);

      // Socket closes before response finished writing
      fakeRes.emit('close');

      expect(signal.aborted).toBe(true);
      expect(controller.signal.aborted).toBe(true);
      expect(signal.reason).toBe('CLIENT_DISCONNECTED');

      cleanup();
    });

    it('AI-CNC-02: Normal completed response (res.writableEnded === true) does NOT trigger abort', () => {
      const fakeRes = new EventEmitter();
      fakeRes.writableEnded = true; // Response writing already completed

      const { signal, cleanup } = setupClientDisconnect(fakeRes);

      // Socket closes after normal response completion
      fakeRes.emit('close');

      expect(signal.aborted).toBe(false);

      cleanup();
    });

    it('AI-CNC-03: Normal incoming request-body completion (req.on end) does NOT trigger abort', () => {
      const fakeReq = new EventEmitter();
      const fakeRes = new EventEmitter();
      fakeRes.writableEnded = false;

      const { signal, cleanup } = setupClientDisconnect(fakeRes);

      // express.json() finishes reading the incoming request body
      fakeReq.emit('end');

      expect(signal.aborted).toBe(false);

      cleanup();
    });

    it('AI-CNC-04: Cancellation halts in-flight provider attempt and backoff sleep immediately', async () => {
      const fakeRes = new EventEmitter();
      fakeRes.writableEnded = false;

      const { signal, cleanup } = setupClientDisconnect(fakeRes);

      const mockFetch = jest.fn().mockImplementation(async (url, init) => {
        return new Promise((resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            const err = new DOMException('The user aborted a request.', 'AbortError');
            reject(err);
          });
        });
      });

      const provider = new GeminiAiProvider({
        apiKey: 'test-key',
        fetch: mockFetch,
        retryBackoffMs: 50,
      });

      const responsePromise = provider.generateChatResponse({
        messages: [{ role: 'user', content: 'Long request' }],
        signal,
      });

      // Simulate client closing the browser connection 20ms into the request
      setTimeout(() => {
        fakeRes.emit('close');
      }, 20);

      await expect(responsePromise).rejects.toThrow('Request aborted');
      cleanup();
    });
  });

  // =========================================================================
  // 8. Zero-Billing Safeguards & Credential Security
  // =========================================================================
  describe('8. Zero-Billing Safeguards & Credential Security', () => {
    it('AI-SEC-01: Prohibits configuring non-approved or paid models at instantiation', () => {
      expect(() => {
        new GeminiAiProvider({
          apiKey: 'test-key',
          primaryModel: 'gemini-1.5-pro', // Paid tier model!
        });
      }).toThrow('Zero-billing policy permits only free-tier models: gemini-3.8-flash, gemini-3.5-flash-lite');

      expect(() => {
        new GeminiAiProvider({
          apiKey: 'test-key',
          fallbackModel: 'gpt-4o', // Paid third-party model!
        });
      }).toThrow('Zero-billing policy permits only free-tier models');
    });

    it('AI-SEC-02: Secrets never appear in generated response objects or error messages', async () => {
      const sensitiveKey = 'AIzaSyA_SECRET_KEY_NOT_LEAKED_12345';

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Safe answer' }] } }],
        }),
      });

      const provider = new GeminiAiProvider({
        apiKey: sensitiveKey,
        fetch: mockFetch,
      });

      const res = await provider.generateChatResponse({ messages: [{ role: 'user', content: 'test' }] });
      const serializedResponse = JSON.stringify(res);

      expect(serializedResponse).not.toContain(sensitiveKey);
      expect(res.costIncurred).toBe('$0.00');
    });
  });
});
