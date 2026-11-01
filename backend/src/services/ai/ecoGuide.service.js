const knowledgeRepository = require('../../repositories/knowledge.repository');
const promptBuilderService = require('./promptBuilder.service');
const toolExecutor = require('./toolExecutor.service');
const { getFunctionDeclarations } = require('./toolRegistry');
const { getAiProvider } = require('../../integrations/ai');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizePublicEntityId(id) {
  if (!id || typeof id !== 'string') return null;
  const trimmed = id.trim();
  if (UUID_REGEX.test(trimmed)) return null;
  return trimmed;
}

class EcoGuideService {
  constructor(options = {}) {
    this.knowledgeRepository = options.knowledgeRepository || knowledgeRepository;
    this.toolExecutor = options.toolExecutor || toolExecutor;
    this.getAiProvider = options.getAiProvider || getAiProvider;
    this.getFunctionDeclarations = options.getFunctionDeclarations || getFunctionDeclarations;
  }

  /**
   * Deduplicates citation sources by unique composite key.
   *
   * @param {Array<object>} sources
   * @returns {Array<object>}
   * @private
   */
  _deduplicateSources(sources = []) {
    if (!Array.isArray(sources)) return [];
    const seen = new Set();
    const deduped = [];

    for (const src of sources) {
      if (!src) continue;
      const key = src.type === 'knowledge'
        ? `knowledge:${src.sourceId || src.source_id}:${src.section || src.section_heading}`
        : `${src.type}:${src.tool || src.sourceId}:${src.entityId || src.treeId || 'default'}`;

      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(src);
      }
    }

    return deduped;
  }

  /**
   * Processes an incoming conversational query grounded in approved knowledge chunks,
   * authorized read-only live platform data tools, and deterministic health intelligence.
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

    // 3. Format knowledge source attribution records
    const knowledgeSources = this._deduplicateSources(
      approvedChunks.map((chunk) => ({
        type: 'knowledge',
        sourceId: chunk.source_id,
        title: chunk.document_title,
        section: chunk.section_heading,
        version: chunk.document_version,
      }))
    );

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
      const toolSources = [];
      let hasUnauthorizedError = false;

      for (const call of toolCallsToExecute) {
        const executionResult = await this.toolExecutor.executeTool(
          call.name,
          call.args,
          user
        );

        if (executionResult.error === 'UNAUTHORIZED_TOOL' || executionResult.error === 'ACCESS_DENIED') {
          hasUnauthorizedError = true;
        }

        executedPlatformData.push({
          tool: call.name,
          success: executionResult.success,
          data: executionResult.data || { error: executionResult.error, message: executionResult.message },
        });

        // Only cite sources for tools that were successfully executed and actually found data
        if (executionResult.success && executionResult.data?.found !== false && executionResult.sourceAttribution) {
          const isHealthInsight =
            executionResult.sourceAttribution.type === 'health_insight' ||
            executionResult.sourceAttribution.type === 'health_intelligence';

          toolSources.push({
            type: isHealthInsight ? 'health_intelligence' : 'live_data',
            sourceId: executionResult.sourceAttribution.sourceId,
            title: executionResult.sourceAttribution.title,
            tool: executionResult.sourceAttribution.tool,
            entityId: sanitizePublicEntityId(executionResult.sourceAttribution.entityId),
            treeId: sanitizePublicEntityId(executionResult.sourceAttribution.treeId || executionResult.sourceAttribution.entityId),
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

      if (hasUnauthorizedError) {
        return {
          answer: finalResponse.content,
          sources: [],
          status: 'unauthorized',
        };
      }

      // Determine combined sources: include knowledge only when relevant to user query or synthesis
      const combinedSources = [...toolSources];
      const isKnowledgeRelevant =
        approvedChunks.length > 0 &&
        (/\b(why|recommend|recommendation|guideline|lifecycle|stage|suitability|soil|weather|schedule|interval|rule|protocol|standard|overdue)\b/i.test(validMessage) ||
         /\b(guideline|standard|schedule|protocol|recommendation|stage|lifecycle)\b/i.test(finalResponse.content || ''));

      if (isKnowledgeRelevant) {
        combinedSources.push(...knowledgeSources);
      }

      const deduplicatedSources = this._deduplicateSources(combinedSources);

      const hasLiveSuccess = executedPlatformData.some((d) => d.success);
      const isInsufficientAnswer =
        finalResponse.content &&
        finalResponse.content.includes('I do not have enough verified information in the EcoRevive knowledge base');

      return {
        answer: finalResponse.content,
        sources: deduplicatedSources,
        status: (hasLiveSuccess || deduplicatedSources.length > 0) && !isInsufficientAnswer ? 'success' : 'insufficient_information',
      };
    }

    // 8. If no tool was called, handle capability queries and out-of-scope queries
    const lowerQuery = validMessage.toLowerCase();
    const isCapabilityOrGreeting =
      /^(hi|hello|hey|greetings|help|who are you|what is ecoguide)[\s!.?]*$/i.test(validMessage.trim()) ||
      /\b(what(\s+kind\s+of)?\s+questions?(\s+can\s+i|\s+to|\s+can\s+you)\s+(ask|answer)|what\s+can\s+(i\s+ask|you\s+do|you\s+help(\s+me)?\s+with)|how\s+can\s+you\s+help|what\s+are\s+your\s+capabilities)\b/i.test(
        validMessage.trim()
      );

    if (isCapabilityOrGreeting) {
      return {
        answer: providerResponse.content,
        sources: [],
        status: 'success',
      };
    }

    if (approvedChunks.length === 0) {
      const isKnownTopic =
        validHistory.length > 0 ||
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
        lowerQuery.includes('reward') ||
        lowerQuery.includes('attention') ||
        lowerQuery.includes('status') ||
        lowerQuery.includes('overdue') ||
        lowerQuery.includes('trend') ||
        lowerQuery.includes('insight') ||
        lowerQuery.includes('recommend');

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

    const isClarification =
      providerResponse.content &&
      /\b(which tree|multiple trees|please specify|would you like me to check)\b/i.test(providerResponse.content);

    return {
      answer: providerResponse.content,
      sources: isInsufficientAnswer ? [] : knowledgeSources,
      status: (knowledgeSources.length > 0 || isCapabilityOrGreeting || isClarification) && !isInsufficientAnswer
        ? 'success'
        : 'insufficient_information',
    };
  }
}

module.exports = new EcoGuideService();
module.exports.EcoGuideService = EcoGuideService;
