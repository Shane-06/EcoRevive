import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiClient, ApiClientError } from '../api/client';
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
});
