import { STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';

const STARTUP_RETRY_BUDGET_MS = 60000;
const MAX_STARTUP_ATTEMPTS = 10;
const TRANSIENT_GATEWAY_STATUSES = new Set([502, 503, 504]);

function waitForRetry(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      reject(signal.reason || new DOMException('Request cancelled', 'AbortError'));
    };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, milliseconds);
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
}

async function fetchWithStartupRecovery(url, config, { retryStartup = true, onRetry } = {}) {
  // GET requests can safely recover from a sleeping host. Never replay a mutation:
  // a gateway failure does not prove that the original write was not processed.
  if (!retryStartup || (config.method || 'GET').toUpperCase() !== 'GET') return fetch(url, config);
  const controller = new AbortController();
  const cancel = () => controller.abort(config.signal.reason);
  if (config.signal?.aborted) cancel();
  else config.signal?.addEventListener('abort', cancel, { once: true });
  const started = Date.now();
  const timer = setTimeout(() => controller.abort(new DOMException('API startup deadline exceeded', 'TimeoutError')), STARTUP_RETRY_BUDGET_MS);
  try {
    for (let attempt = 1; ; attempt++) {
      controller.signal.throwIfAborted();
      const response = await fetch(url, { ...config, signal: controller.signal });
      const remaining = STARTUP_RETRY_BUDGET_MS - (Date.now() - started);
      const delay = Math.min(8000, 1000 * 2 ** (attempt - 1));
      if (!TRANSIENT_GATEWAY_STATUSES.has(response.status) || attempt >= MAX_STARTUP_ATTEMPTS || delay >= remaining) return response;
      // Honor an upstream backoff instead of retrying before Retry-After expires.
      const header = response.headers.get('retry-after');
      const retryAfterMs = /^\d+$/.test(header || '') ? Number(header) * 1000 : Date.parse(header) - Date.now();
      const pause = Math.max(delay, Number.isFinite(retryAfterMs) ? retryAfterMs : 0);
      if (pause >= remaining) return response;
      await response.body?.cancel();
      onRetry?.({ attempt, status: response.status, delayMs: pause });
      await waitForRetry(pause, controller.signal);
    }
  } finally {
    clearTimeout(timer);
    config.signal?.removeEventListener('abort', cancel);
  }
}

/**
 * Standardized API Client Error
 */
export class ApiClientError extends Error {
  constructor(message, statusCode, code = 'API_ERROR', details = null) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Resolves the API Base URL from Vite environment variables or defaults to relative '/api/v1'.
 * Supports both VITE_API_BASE_URL and VITE_API_URL, and normalizes paths to ensure '/api/v1' suffix.
 * If VITE_USE_PROXY is 'true', forces relative '/api/v1' path to guarantee traffic flows through the reverse proxy.
 */
export const getBaseUrl = () => {
  if (import.meta.env.VITE_USE_PROXY === 'true') {
    return '/api/v1';
  }
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    const trimmed = envUrl.trim().replace(/\/+$/, '');
    if (!trimmed.endsWith('/api/v1')) {
      if (trimmed.endsWith('/api')) {
        return `${trimmed}/v1`;
      }
      return `${trimmed}/api/v1`;
    }
    return trimmed;
  }
  return '/api/v1';
};

/**
 * Centralized API Client Wrapper for EcoRevive REST Backend.
 */
class ApiClient {
  constructor() {
    this.baseUrl = getBaseUrl();
  }

  /**
   * Retrieves active JWT authentication token.
   * @returns {string|null}
   */
  getToken() {
    return storage.getItem(STORAGE_KEYS.TOKEN);
  }

  /**
   * Core HTTP request handler.
   * @param {string} endpoint - API endpoint relative to base URL (e.g. '/auth/login')
   * @param {object} [options={}] - Fetch options
   * @returns {Promise<any>}
   */
  async request(endpoint, options = {}) {
    const { retryStartup, onRetry, ...fetchOptions } = options;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    const headers = {
      ...options.headers,
    };

    const token = this.getToken();
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }

    // If body is an object and not FormData, stringify to JSON and set content type
    let body = options.body;
    if (body && typeof body === 'object' && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }

    const config = {
      ...fetchOptions,
      headers,
      body,
    };

    try {
      const response = await fetchWithStartupRecovery(url, config, { retryStartup, onRetry });

      if (response.status === 204) {
        return null;
      }

      // Hosting error pages and SPA rewrites can return HTML, even with HTTP 200.
      // Never expose that document as an error message or accept it as API data.
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('application/json')) {
        const unavailable = response.status >= 500;
        throw new ApiClientError(
          unavailable
            ? 'The API service is temporarily unavailable. Please try again shortly.'
            : 'The server returned a web page instead of API data. Check the frontend API URL and deployment routing.',
          response.status,
          unavailable ? 'SERVICE_UNAVAILABLE' : 'INVALID_API_RESPONSE',
          { url, contentType }
        );
      }

      let data;
      try {
        data = await response.json();
      } catch {
        throw new ApiClientError(
          'The server returned an invalid API response. Please try again shortly.',
          response.status,
          'INVALID_API_RESPONSE',
          { url, contentType }
        );
      }

      if (!response.ok) {
        const message = data?.error?.message || data?.message || `HTTP ${response.status} ${response.statusText}`;
        const code = data?.error?.code || 'REQUEST_FAILED';
        const details = data?.error?.details || null;
        throw new ApiClientError(message, response.status, code, details);
      }

      return data;
    } catch (err) {
      if (err instanceof ApiClientError) {
        throw err;
      }
      if (options.signal?.aborted || err.name === 'AbortError') throw err;
      if (err.name === 'TimeoutError') {
        throw new ApiClientError('The API did not become available within one minute. Please try again shortly.', 503, 'SERVICE_UNAVAILABLE');
      }
      throw new ApiClientError(err.message || 'Network request failed', 0, 'NETWORK_ERROR');
    }
  }

  /**
   * HTTP GET convenience method.
   */
  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  /**
   * HTTP POST convenience method.
   */
  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * HTTP PUT convenience method.
   */
  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * HTTP PATCH convenience method.
   */
  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  }

  /**
   * HTTP DELETE convenience method.
   */
  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
