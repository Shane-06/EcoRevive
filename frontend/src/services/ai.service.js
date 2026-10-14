import { apiClient } from '../api/client';

/**
 * Service for EcoGuide AI Knowledge Assistant (V2-M2).
 * Strictly keeps credentials server-side and routes all requests through backend.
 */
export const aiService = {
  /**
   * Sends a conversational query to EcoGuide with optional bounded history.
   * Access: Private (Authenticated Contributor, Caretaker, Admin).
   *
   * @param {object} params
   * @param {string} params.message - User question (1-1000 characters)
   * @param {Array<{role: string, content: string}>} [params.history=[]] - Bounded conversation history (max 6 items)
   * @returns {Promise<{ answer: string, sources: Array<object>, status: string }>}
   */
  async sendMessage({ message, history = [] }) {
    const response = await apiClient.post('/ai/chat', {
      message,
      history,
    });
    return response.data;
  },
};

export default aiService;
