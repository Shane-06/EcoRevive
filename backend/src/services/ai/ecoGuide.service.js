const knowledgeRepository = require('../../repositories/knowledge.repository');
const promptBuilderService = require('./promptBuilder.service');
const { getAiProvider } = require('../../integrations/ai');

class EcoGuideService {
  constructor(options = {}) {
    this.knowledgeRepository = options.knowledgeRepository || knowledgeRepository;
    this.getAiProvider = options.getAiProvider || getAiProvider;
  }

  /**
   * Processes an incoming conversational query grounded in approved knowledge chunks.
   *
   * @param {object} params
   * @param {string} params.message - Raw user query
   * @param {Array<object>} [params.history=[]] - Conversation history
   * @param {object} [params.user] - Authenticated user context
   * @param {AbortSignal} [params.signal] - Cancellation signal
   * @returns {Promise<{ answer: string, sources: Array<object>, status: string }>}
   */
  async chat({ message, history = [], user: _user, signal }) {
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

    // 4. Handle cases where no approved knowledge is found
    const lowerQuery = validMessage.toLowerCase();
    const isGreeting =
      /^(hi|hello|hey|greetings|help|who are you|what can you do)[\s!.?]*$/i.test(validMessage.trim());

    if (approvedChunks.length === 0 && !isGreeting) {
      // Check if the query is asking about known EcoRevive topics that might have alternative phrasing
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
        // Honest limitation response for out-of-scope or unsupported questions
        return {
          answer:
            'I do not have enough verified information in the EcoRevive knowledge base to answer that question. ' +
            'EcoGuide provides answers grounded strictly in approved platform documentation and environmental guidelines.',
          sources: [],
          status: 'insufficient_information',
        };
      }
    }

    // 5. Build bounded, multi-layer prompt payload with anti-injection XML framing
    const promptPayload = promptBuilderService.buildPromptPayload({
      message: validMessage,
      history: validHistory,
      knowledgeChunks: approvedChunks,
    });

    // 6. Invoke configured AI provider (MockAiProvider by default, or GeminiAiProvider if configured)
    const provider = this.getAiProvider();
    const providerResponse = await provider.generateChatResponse({
      systemPrompt: promptPayload.systemPrompt,
      messages: promptPayload.messages,
      maxTokens: promptPayload.maxTokens,
      signal,
    });

    return {
      answer: providerResponse.content,
      sources,
      status: sources.length > 0 || isGreeting ? 'success' : 'insufficient_information',
    };
  }
}

module.exports = new EcoGuideService();
module.exports.EcoGuideService = EcoGuideService;
