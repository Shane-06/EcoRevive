import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiClient, ApiClientError, getBaseUrl } from '../api/client';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';

describe('Frontend Foundation — API Client Tests', () => {
  beforeEach(() => {
    storage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should make a successful GET request with JSON response', async () => {
    const mockData = { success: true, data: { message: 'healthy' } };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockData,
    });

    const result = await apiClient.get('/health');
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/health'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('should automatically attach Authorization header when token exists in storage', async () => {
    storage.setItem(STORAGE_KEYS.TOKEN, 'mock-jwt-token-123');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true, data: {} }),
    });

    await apiClient.get('/dashboard/me');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/dashboard/me'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-jwt-token-123',
        }),
      })
    );
  });

  it('should format JSON body and set Content-Type header on POST requests', async () => {
    const payload = { email: 'test@example.com', password: 'password123' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true, data: { token: 'jwt' } }),
    });

    await apiClient.post('/auth/login', payload);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(payload),
      })
    );
  });

  it('should throw ApiClientError with error code and details on non-2xx response', async () => {
    const errorResponse = {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        details: { field: 'password' },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => errorResponse,
    });

    await expect(apiClient.post('/auth/login', { email: 'a@b.com', password: 'wrong' })).rejects.toThrow(
      ApiClientError
    );

    try {
      await apiClient.post('/auth/login', { email: 'a@b.com', password: 'wrong' });
    } catch (err) {
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('INVALID_CREDENTIALS');
      expect(err.message).toBe('Invalid email or password');
      expect(err.details).toEqual({ field: 'password' });
    }
  });

  it('should wrap network failures into ApiClientError with NETWORK_ERROR code', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    await expect(apiClient.get('/health')).rejects.toThrow(ApiClientError);

    try {
      await apiClient.get('/health');
    } catch (err) {
      expect(err.code).toBe('NETWORK_ERROR');
      expect(err.message).toBe('Failed to fetch');
    }
  });

  it.each([200, 404, 502, 503])('rejects hosting HTML with HTTP %s without displaying the document', async (status) => {
    const html = '<!DOCTYPE html><html><body>Hosting error page</body></html>';
    const readBody = vi.fn().mockResolvedValue(html);
    global.fetch = vi.fn().mockResolvedValue({
      ok: status === 200,
      status,
      headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
      text: readBody,
    });

    const error = await apiClient.get('/environment?lat=30&lng=76', { retryStartup: false }).catch((err) => err);
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error.statusCode).toBe(status);
    expect(error.code).toBe(status >= 500 ? 'SERVICE_UNAVAILABLE' : 'INVALID_API_RESPONSE');
    expect(error.message).not.toContain('<');
    expect(error.details.url).toContain('/environment?lat=30&lng=76');
    expect(readBody).not.toHaveBeenCalled();
  });

  it('reports malformed JSON as an invalid response rather than a network failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => { throw new SyntaxError('Unexpected token <'); },
    });

    await expect(apiClient.get('/environment')).rejects.toMatchObject({
      statusCode: 200,
      code: 'INVALID_API_RESPONSE',
    });
  });

  it('accepts an empty HTTP 204 response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 204 });
    await expect(apiClient.delete('/resource')).resolves.toBeNull();
  });

  describe('getBaseUrl Path & Environment Resolution', () => {
    const originalEnv = { ...import.meta.env };

    afterEach(() => {
      import.meta.env.VITE_API_BASE_URL = originalEnv.VITE_API_BASE_URL;
      import.meta.env.VITE_API_URL = originalEnv.VITE_API_URL;
      import.meta.env.VITE_USE_PROXY = originalEnv.VITE_USE_PROXY;
    });

    it('defaults to /api/v1 when neither environment variable is configured', () => {
      delete import.meta.env.VITE_API_BASE_URL;
      delete import.meta.env.VITE_API_URL;
      delete import.meta.env.VITE_USE_PROXY;
      expect(getBaseUrl()).toBe('/api/v1');
    });

    it('forces relative /api/v1 path when VITE_USE_PROXY is set to true regardless of external URLs', () => {
      import.meta.env.VITE_API_URL = 'https://ecorevive-api.onrender.com';
      import.meta.env.VITE_USE_PROXY = 'true';
      expect(getBaseUrl()).toBe('/api/v1');
    });

    it('resolves VITE_API_URL without suffix by appending /api/v1', () => {
      delete import.meta.env.VITE_API_BASE_URL;
      import.meta.env.VITE_API_URL = 'https://ecorevive-api.onrender.com';
      expect(getBaseUrl()).toBe('https://ecorevive-api.onrender.com/api/v1');
    });

    it('preserves existing /api/v1 suffix when already present in VITE_API_URL', () => {
      delete import.meta.env.VITE_API_BASE_URL;
      import.meta.env.VITE_API_URL = 'https://ecorevive-api.onrender.com/api/v1';
      expect(getBaseUrl()).toBe('https://ecorevive-api.onrender.com/api/v1');
    });

    it('handles trailing slashes cleanly', () => {
      delete import.meta.env.VITE_API_BASE_URL;
      import.meta.env.VITE_API_URL = 'https://ecorevive-api.onrender.com/api/v1/';
      expect(getBaseUrl()).toBe('https://ecorevive-api.onrender.com/api/v1');
    });

    it('falls back to VITE_API_BASE_URL if VITE_API_URL is unset', () => {
      delete import.meta.env.VITE_API_URL;
      import.meta.env.VITE_API_BASE_URL = 'https://ecorevive-api.onrender.com';
      expect(getBaseUrl()).toBe('https://ecorevive-api.onrender.com/api/v1');
    });
  });
});
