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
 */
const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
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

      let data = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text ? { message: text } : {};
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
