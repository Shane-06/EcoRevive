const config = require('../../config');
const MockAiProvider = require('./mockAi.provider');
const GeminiAiProvider = require('./gemini.provider');

/**
 * Resolves and instantiates the configured AI provider.
 *
 * Enforces Zero-Billing and Zero-Key operation:
 * - 'mock' is the default and operates 100% offline with zero keys.
 * - 'gemini' is optional; if unconfigured or key is missing, safely falls back to MockAiProvider.
 * - Any paid or alternate provider (e.g., OpenAI, Claude) is strictly rejected.
 *
 * @param {object} [options={}] - Override configuration for testing or specialized scopes
 * @returns {import('./ai.interface')}
 */
let defaultInstance = null;

function createAiProvider(options = {}) {
  const providerType = (options.provider || config.ai.provider || 'mock').toLowerCase().trim();
  const apiKey = options.apiKey !== undefined ? options.apiKey : config.ai.apiKey;

  if (providerType === 'mock') {
    return new MockAiProvider(options);
  }

  if (providerType === 'gemini') {
    if (!apiKey || !apiKey.trim()) {
      // Zero-key operation: Safe fallback to MockAiProvider without requiring billing or keys
      console.warn('[AI Provider Warning] GEMINI_API_KEY is not configured. Safely operating with MockAiProvider.');
      return new MockAiProvider({
        ...options,
        fallbackNotice: 'Gemini API key is not configured. Safely defaulting to MockAiProvider.',
      });
    }

    return new GeminiAiProvider({
      apiKey,
      ...options,
    });
  }

  // Zero-billing safety invariant: Never silently select a paid provider or unsupported service
  throw new Error(
    `Unsupported AI provider: "${providerType}". Zero-billing policy permits only "mock" and "gemini".`
  );
}

function getAiProvider(options = {}) {
  if (options && Object.keys(options).length > 0) {
    return createAiProvider(options);
  }
  if (!defaultInstance) {
    defaultInstance = createAiProvider({});
  }
  return defaultInstance;
}

function setAiProvider(instance) {
  defaultInstance = instance;
}

function resetAiProvider() {
  defaultInstance = null;
}

module.exports = {
  getAiProvider,
  setAiProvider,
  resetAiProvider,
};

