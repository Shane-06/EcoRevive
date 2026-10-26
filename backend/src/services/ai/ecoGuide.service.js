const knowledgeRepository = require('../../repositories/knowledge.repository');
const promptBuilderService = require('./promptBuilder.service');
const toolExecutor = require('./toolExecutor.service');
const { getFunctionDeclarations } = require('./toolRegistry');
const { getAiProvider } = require('../../integrations/ai');

class EcoGuideService {
  constructor(options = {}) {
    this.knowledgeRepository = options.knowledgeRepository || knowledgeRepository;
    this.toolExecutor = options.toolExecutor || toolExecutor;
    this.getAiProvider = options.getAiProvider || getAiProvider;
    this.getFunctionDeclarations = options.getFunctionDeclarations || getFunctionDeclarations;
  }

  /**
   * Processes an incoming conversational query grounded in approved knowledge chunks
   * and authorized read-only live platform data tools.
   *
   * @param {object} params
   * @param {string} params.message - Raw user query
   * @param {Array<object>} [params.history=[]] - Conversation history
   * @param {object} params.user - Authenticated user context
   * @param {AbortSignal} [params.signal] - Cancellation signal
   * @returns {Promise<{ answer: string, sources: Array<object>, status: string }>}
   */
  async chat({ message, history = [], user, signal }) {
    // 1. Validate inputs and message bounds
    const validMessage = promptBuilderService.validateMessage(message);
    const validHistory = promptBuilderService.validateHistory(history);

    // 2. Retrieve relevant approved knowledge passages via PostgreSQL full-text search
    const approvedChunks = await this.knowledgeRepository.searchApprovedChunks(validMessage, 4);

    // 3. Format source attribution records
    const sources = approvedChunks.map((chunk) => ({
      type: 'knowledge',
      sourceId: chunk.source_id,
      title: chunk.document_title,
      section: chunk.section_heading,
      version: chunk.document_version,
    }));

    // 4. Retrieve allowed tool declarations based on verified user role
    const tools = this.getFunctionDeclarations(user?.role);

    // 5. Build initial multi-layer prompt payload with anti-injection XML framing
    const promptPayload = promptBuilderService.buildPromptPayload({
      message: validMessage,
      history: validHistory,
      knowledgeChunks: approvedChunks,
    });

    // 6. Invoke configured AI provider (with tools allowlist)
    const provider = this.getAiProvider();
    const providerResponse = await provider.generateChatResponse({
      systemPrompt: promptPayload.systemPrompt,
      messages: promptPayload.messages,
      tools,
      maxTokens: promptPayload.maxTokens,
      signal,
    });

    // 7. Check if model requested any tool calls
    if (providerResponse.toolCalls && providerResponse.toolCalls.length > 0) {
      // Security Invariant: Bound tool calls per request to max 2 to prevent recursive loops
      const toolCallsToExecute = providerResponse.toolCalls.slice(0, 2);
      const executedPlatformData = [];

      for (const call of toolCallsToExecute) {
        const executionResult = await this.toolExecutor.executeTool(
          call.name,
          call.args,
          user
        );

        executedPlatformData.push({
          tool: call.name,
          success: executionResult.success,
          data: executionResult.data || { error: executionResult.error, message: executionResult.message },
        });

        if (executionResult.sourceAttribution) {
          sources.push({
            type: 'live_data',
            sourceId: executionResult.sourceAttribution.sourceId,
            title: executionResult.sourceAttribution.title,
            tool: executionResult.sourceAttribution.tool,
            entityId: executionResult.sourceAttribution.entityId,
          });
        }
      }

      // Step 8: Build second turn prompt payload including <authorized_platform_data>
      const finalPromptPayload = promptBuilderService.buildPromptPayload({
        message: validMessage,
        history: validHistory,
        knowledgeChunks: approvedChunks,
        platformData: executedPlatformData,
      });

      // Step 9: Final synthesis generation from provider
      const finalResponse = await provider.generateChatResponse({
        systemPrompt: finalPromptPayload.systemPrompt,
        messages: finalPromptPayload.messages,
        maxTokens: finalPromptPayload.maxTokens,
        signal,
      });

      const hasLiveSuccess = executedPlatformData.some((d) => d.success);
      const isInsufficientAnswer =
        finalResponse.content &&
        finalResponse.content.includes('I do not have enough verified information in the EcoRevive knowledge base');

      return {
        answer: finalResponse.content,
        sources,
        status: (hasLiveSuccess || sources.length > 0) && !isInsufficientAnswer ? 'success' : 'insufficient_information',
      };
    }

    // 8. If no tool was called, handle capability queries and out-of-scope queries
    const lowerQuery = validMessage.toLowerCase();
    const isCapabilityOrGreeting =
      /^(hi|hello|hey|greetings|help|who are you|what is ecoguide)[\s!.?]*$/i.test(validMessage.trim()) ||
      /\b(what(\s+kind\s+of)?\s+questions?(\s+can\s+i|\s+to|\s+can\s+you)\s+(ask|answer)|what\s+can\s+(i\s+ask|you\s+do|you\s+help(\s+me)?\s+with)|how\s+can\s+you\s+help|what\s+are\s+your\s+capabilities)\b/i.test(
        validMessage.trim()
      );

    if (approvedChunks.length === 0 && !isCapabilityOrGreeting) {
      const isKnownTopic =
        lowerQuery.includes('lifecycle') ||
        lowerQuery.includes('stage') ||
        lowerQuery.includes('tree') ||
        lowerQuery.includes('plant') ||
        lowerQuery.includes('verify') ||
        lowerQuery.includes('verification') ||
        lowerQuery.includes('health') ||
        lowerQuery.includes('soil') ||
        lowerQuery.includes('weather') ||
        lowerQuery.includes('role') ||
        lowerQuery.includes('reward');

      if (!isKnownTopic) {
        return {
          answer:
            'I do not have enough verified information in the EcoRevive knowledge base to answer that question. ' +
            'EcoGuide provides answers grounded strictly in approved platform documentation and environmental guidelines.',
          sources: [],
          status: 'insufficient_information',
        };
      }
    }

    const isInsufficientAnswer =
      providerResponse.content &&
      providerResponse.content.includes('I do not have enough verified information in the EcoRevive knowledge base');

    return {
      answer: providerResponse.content,
      sources,
      status: (sources.length > 0 || isCapabilityOrGreeting) && !isInsufficientAnswer ? 'success' : 'insufficient_information',
    };
  }
}

module.exports = new EcoGuideService();
module.exports.EcoGuideService = EcoGuideService;
