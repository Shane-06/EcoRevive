/**
 * Base AI Provider interface conforming to EcoRevive V2 AI Foundation specification.
 *
 * Defines the contract that all concrete AI providers (MockAiProvider, GeminiAiProvider)
 * must implement.
 */
class AiProvider {
  /**
   * Generates a chat response from the AI provider.
   *
   * @param {object} params
   * @param {string} [params.systemPrompt] - Privileged non-overridable system instructions
   * @param {Array<{role: 'user'|'assistant', content: string}>} params.messages - Formatted conversation history and user query
   * @param {Array<object>} [params.tools] - Optional tool definitions (function declarations)
   * @param {number} [params.temperature=0.7] - Sampling temperature
   * @param {number} [params.maxTokens=800] - Strict output token limit
   * @param {AbortSignal} [params.signal] - Cancellation signal (e.g., from client disconnect or master deadline)
   * @returns {Promise<{
   *   content: string,
   *   model: string,
   *   fallbackUsed: boolean,
   *   toolCalls?: Array<{ name: string, args: object }>,
   *   usage?: { promptTokens: number, completionTokens: number, totalTokens: number },
   *   finishReason?: string,
   *   costIncurred: string
   * }>}
   */
  async generateChatResponse(_params) {
    throw new Error('generateChatResponse() must be implemented by concrete AiProvider subclass');
  }
}

module.exports = AiProvider;
