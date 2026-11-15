import { STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';

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
      ...options,
      headers,
      body,
    };

    try {
      const response = await fetch(url, config);

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
