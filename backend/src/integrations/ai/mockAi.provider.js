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
   * Enqueues one or more tool calls to simulate model function-calling behavior.
   * @param {string} toolName
   * @param {object} [args={}]
   */
  setMockToolCall(toolName, args = {}) {
    this.customResponses.push({
      toolCalls: [{ name: toolName, args }],
      content: '',
      finishReason: 'TOOL_CALL',
    });
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
   * @param {Array<object>} [params.tools]
   * @param {number} [params.temperature]
   * @param {number} [params.maxTokens]
   * @param {AbortSignal} [params.signal]
   * @returns {Promise<object>}
   */
  async generateChatResponse({ systemPrompt, messages = [], tools = [], temperature = 0.7, maxTokens = 800, signal }) {
    // Record call telemetry for deterministic assertions
    this.callHistory.push({
      systemPrompt,
      messages,
      tools,
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
      if (nextResponse.toolCalls) {
        return {
          content: nextResponse.content || '',
          model: nextResponse.model || this.modelName,
          fallbackUsed: false,
          toolCalls: nextResponse.toolCalls,
          usage: { promptTokens: 15, completionTokens: 10, totalTokens: 25 },
          finishReason: nextResponse.finishReason || 'TOOL_CALL',
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

    // Check for live-data synthesis when <authorized_platform_data> is already provided in prompt
    if (userText.includes('<authorized_platform_data>')) {
      if (userText.includes('"error": "UNAUTHORIZED_TOOL"') || userText.includes('"error": "ACCESS_DENIED"')) {
        return {
          content: 'I cannot retrieve this platform data because your current role is not authorized to access this administrative record.',
          model: this.modelName,
          fallbackUsed: false,
          usage: { promptTokens: 30, completionTokens: 20, totalTokens: 50 },
          finishReason: 'STOP',
          costIncurred: '$0.00',
        };
      }

      if (userText.includes('getUserPlantationsSummary')) {
        let content = 'Based on your authorized platform records, your registered plantations have been retrieved.';
        if (userText.includes('"totalTrees":')) {
          const totalMatch = userText.match(/"totalTrees":\s*(\d+)/);
          const verifiedMatch = userText.match(/"verifiedCount":\s*(\d+)/);
          const pendingMatch = userText.match(/"pendingCount":\s*(\d+)/);
          const total = totalMatch ? totalMatch[1] : '0';
          const verified = verifiedMatch ? verifiedMatch[1] : null;
          const pending = pendingMatch ? pendingMatch[1] : null;

          if (verified !== null && pending !== null) {
            content = `According to your verified plantation records, you have registered ${total} tree plantation(s) in EcoRevive (${verified} verified, ${pending} pending).`;
          } else {
            content = `According to your verified plantation records, you have registered ${total} tree plantation(s) in EcoRevive.`;
          }
        }
        return {
          content,
          model: this.modelName,
          fallbackUsed: false,
          usage: { promptTokens: 40, completionTokens: 25, totalTokens: 65 },
          finishReason: 'STOP',
          costIncurred: '$0.00',
        };
      }

      if (userText.includes('getVerifiedTreeStatus')) {
        let content = 'Verified tree information has been retrieved from platform records.';
        if (userText.includes('"found": false')) {
          content = 'I checked verified platform records, and the specified tree was not found or is not currently verified.';
        } else if (userText.includes('"status": "Verified"')) {
          const speciesMatch = userText.match(/"species":\s*"([^"]+)"/);
          const treeIdMatch = userText.match(/"treeId":\s*"([^"]+)"/);
          const species = speciesMatch ? speciesMatch[1] : 'tree';
          const treeId = treeIdMatch ? treeIdMatch[1] : 'ER-PLT';
          content = `According to verified platform records, tree ${treeId} is an approved ${species} tree in Verified status.`;
        }
        return {
          content,
          model: this.modelName,
          fallbackUsed: false,
          usage: { promptTokens: 40, completionTokens: 25, totalTokens: 65 },
          finishReason: 'STOP',
          costIncurred: '$0.00',
        };
      }

      if (userText.includes('getTreeHealthSummary')) {
        let content = 'Authorized health monitoring observations have been retrieved for this tree.';
        if (userText.includes('"found": false')) {
          content = 'I checked verified platform records, and health records for the specified tree were not found.';
        } else if (userText.includes('"currentHealth":')) {
          const healthMatch = userText.match(/"currentHealth":\s*"([^"]+)"/);
          const health = healthMatch ? healthMatch[1] : 'Healthy';
          content = `Based on authorized health observations, this tree currently has a health status of "${health}".`;
        }
        return {
          content,
          model: this.modelName,
          fallbackUsed: false,
          usage: { promptTokens: 40, completionTokens: 25, totalTokens: 65 },
          finishReason: 'STOP',
          costIncurred: '$0.00',
        };
      }

      if (userText.includes('getPlatformVerificationSummary')) {
        const content = 'According to platform verification metrics, the platform-wide plantation summary has been retrieved.';
        return {
          content,
          model: this.modelName,
          fallbackUsed: false,
          usage: { promptTokens: 40, completionTokens: 25, totalTokens: 65 },
          finishReason: 'STOP',
          costIncurred: '$0.00',
        };
      }
    }

    // Extract actual user query from XML tags to prevent history/passages from polluting intent matching
    const queryMatch = userText.match(/<untrusted_user_query>([\s\S]*?)<\/untrusted_user_query>/);
    const actualQuery = queryMatch ? queryMatch[1].trim() : userText.trim();
    const lowerQuery = actualQuery.toLowerCase();

    // Check if tools are provided and user query triggers an allowlisted tool
    if (Array.isArray(tools) && tools.length > 0) {
      // 1. Check for getUserPlantationsSummary trigger
      const plantationSummaryTriggers = [
        'my tree',
        'my plantation',
        'how many tree',
        'how many plantation',
        'trees have i planted',
        'trees i have planted',
        'trees i planted',
        'trees did i plant',
        'plantation i have done',
        'plantations i have done',
        'plantation have i done',
        'plantations have i done',
        'plantation count',
        'tree count',
        'summary of my plantation',
        'status of my plantation',
      ];
      const matchesPlantationSummary =
        plantationSummaryTriggers.some(trigger => lowerQuery.includes(trigger)) ||
        /\bhow\s+many\s+.*(plant|tree)/i.test(lowerQuery) ||
        /\b(plantation|tree)s?\s+(i\s+(have\s+)?done|i('?ve)?\s+done|by\s+me)/i.test(lowerQuery);

      if (matchesPlantationSummary && tools.some(t => t.name === 'getUserPlantationsSummary')) {
        return {
          content: '',
          model: this.modelName,
          fallbackUsed: false,
          toolCalls: [{ name: 'getUserPlantationsSummary', args: {} }],
          finishReason: 'TOOL_CALL',
          costIncurred: '$0.00',
        };
      }

      // 2. Check for Tree ID pattern trigger strictly from actual user query (e.g. ER-PLT-00001 or UUID)
      const treeMatch = actualQuery.match(/(ER-PLT-[0-9]{5}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (treeMatch) {
        const treeId = treeMatch[1];
        const isHealthQuery =
          lowerQuery.includes('health') ||
          lowerQuery.includes('observation') ||
          lowerQuery.includes('condition') ||
          lowerQuery.includes('monitoring');

        if (isHealthQuery && tools.some(t => t.name === 'getTreeHealthSummary')) {
          return {
            content: '',
            model: this.modelName,
            fallbackUsed: false,
            toolCalls: [{ name: 'getTreeHealthSummary', args: { treeId } }],
            finishReason: 'TOOL_CALL',
            costIncurred: '$0.00',
          };
        }

        if (tools.some(t => t.name === 'getVerifiedTreeStatus')) {
          return {
            content: '',
            model: this.modelName,
            fallbackUsed: false,
            toolCalls: [{ name: 'getVerifiedTreeStatus', args: { treeId } }],
            finishReason: 'TOOL_CALL',
            costIncurred: '$0.00',
          };
        }
      }

      // 3. Check for getPlatformVerificationSummary trigger
      if (
        (lowerQuery.includes('verification metrics') ||
          lowerQuery.includes('platform verification summary') ||
          lowerQuery.includes('platform verification metrics') ||
          lowerQuery.includes('system plantation summary') ||
          lowerQuery.includes('platform-wide')) &&
        tools.some(t => t.name === 'getPlatformVerificationSummary')
      ) {
        return {
          content: '',
          model: this.modelName,
          fallbackUsed: false,
          toolCalls: [{ name: 'getPlatformVerificationSummary', args: {} }],
          finishReason: 'TOOL_CALL',
          costIncurred: '$0.00',
        };
      }
    }

    // Generate grounded deterministic response based on actual user query
    const isCapabilityOrGreeting =
      /^(hi|hello|hey|greetings|help|who are you|what is ecoguide)[\s!.?]*$/i.test(lowerQuery) ||
      /\b(what(\s+kind\s+of)?\s+questions?(\s+can\s+i|\s+to|\s+can\s+you)\s+(ask|answer)|what\s+can\s+(i\s+ask|you\s+do|you\s+help(\s+me)?\s+with)|how\s+can\s+you\s+help|what\s+are\s+your\s+capabilities)\b/i.test(
        lowerQuery
      );

    let content = 'I am EcoGuide, your contextual knowledge assistant for EcoRevive. Based on approved platform guidance, our 9-stage lifecycle (Discover, Assess, Plant, Prove, Verify, Identify, Monitor, Reward, Track) supports verified tree stewardship.';

    if (isCapabilityOrGreeting) {
      content =
        'I am EcoGuide, your contextual knowledge and platform assistant for EcoRevive. Here is what you can ask me:\n\n' +
        '1. **Your Plantation Records**: Ask for a summary or count of your registered plantations (e.g., "How many plantations have I done?" or "Can you give me a summary of my plantations?").\n' +
        '2. **Verified Tree Status**: Inquire about an approved tree by its public Tree ID (e.g., "What is the status of tree ER-PLT-00001?").\n' +
        '3. **Tree Health Observations**: Ask for recent health monitoring observations for a verified tree (e.g., "What is the health observation for tree ER-PLT-00001?").\n' +
        '4. **Lifecycle & Verification**: Learn about the 9-stage lifecycle, evidence submission, and administrator verification.\n' +
        '5. **Environmental Suitability**: Ask about soil pH tiers, textures, and weather requirements.\n' +
        '6. **Health Classifications**: Learn about the four authoritative health statuses (Healthy, Good, Needs Attention, Dead) and the 30-day inspection schedule.\n' +
        '7. **Platform Roles & Privacy**: Understand permissions for contributors, caretakers, and coordinators, as well as data privacy safeguards.';
    } else if (lowerQuery.includes('health')) {
      content = 'Tree health records in EcoRevive follow four standard statuses: Healthy, Good, Needs Attention, and Dead. Health trends are evaluated deterministically from recorded caretaker observations.';
    } else if (lowerQuery.includes('verification') || lowerQuery.includes('verify')) {
      content = 'Verification is stage 5 of the EcoRevive lifecycle. Coordinators and admins review photographic evidence and geospatial coordinates before approving plantations and assigning permanent Tree IDs.';
    } else if (lowerQuery.includes('soil') || lowerQuery.includes('ph') || lowerQuery.includes('weather')) {
      content = 'EcoRevive evaluates environmental suitability based on soil pH (optimal 6.0-7.5), soil texture, and regional weather parameters from Open-Meteo and SoilGrids.';
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
