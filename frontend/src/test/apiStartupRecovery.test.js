import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../api/client';

const gateway = (status = 502, extra = {}) => ({
  ok: false, status, headers: new Headers({ 'content-type': 'text/html', ...extra }),
});
const healthy = () => ({ ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ success: true, data: { status: 'operational' } }) });

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('API startup recovery', () => {
  it('recovers from a Render gateway response without requiring a second click', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(gateway()).mockResolvedValueOnce(healthy());
    vi.stubGlobal('fetch', fetch);
    const onRetry = vi.fn();
    const request = apiClient.get('/species', { onRetry });
    await vi.advanceTimersByTimeAsync(999);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith({ attempt: 1, status: 502, delayMs: 1000 });
    await vi.advanceTimersByTimeAsync(1);
    expect(await request).toMatchObject({ success: true });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('waits through a realistic 23-second cold start and retains the request URL', async () => {
    const started = Date.now();
    const fetch = vi.fn().mockImplementation(async () => Date.now() - started >= 23000 ? healthy() : gateway());
    vi.stubGlobal('fetch', fetch);
    const request = apiClient.get('/environment?lat=30.6945&lng=76.8357&section=soil');
    await vi.advanceTimersByTimeAsync(23000);
    expect(await request).toMatchObject({ success: true });
    expect(fetch).toHaveBeenCalledTimes(6);
    expect(new Set(fetch.mock.calls.map((call) => call[0])).size).toBe(1);
  });

  it('honors Retry-After instead of retrying before the server requests', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(gateway(503, { 'retry-after': '10' })).mockResolvedValueOnce(healthy());
    vi.stubGlobal('fetch', fetch);
    const request = apiClient.get('/species');
    await vi.advanceTimersByTimeAsync(9999);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect((await request).success).toBe(true);
  });

  it('stops after a bounded number of attempts if the service stays unavailable', async () => {
    const fetch = vi.fn().mockResolvedValue(gateway());
    vi.stubGlobal('fetch', fetch);
    const request = apiClient.get('/species').catch((error) => error);
    await vi.advanceTimersByTimeAsync(60000);
    expect((await request).code).toBe('SERVICE_UNAVAILABLE');
    expect(fetch).toHaveBeenCalledTimes(10);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels retry sleep as soon as the user selects another point', async () => {
    const fetch = vi.fn().mockResolvedValue(gateway());
    vi.stubGlobal('fetch', fetch);
    const controller = new AbortController();
    const request = apiClient.get('/environment', { signal: controller.signal }).catch((error) => error);
    await vi.advanceTimersByTimeAsync(100);
    controller.abort();
    expect((await request).name).toBe('AbortError');
    await vi.advanceTimersByTimeAsync(60000);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aborts a hanging request at the startup deadline', async () => {
    vi.stubGlobal('fetch', vi.fn((_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason)))));
    const request = apiClient.get('/environment').catch((error) => error);
    await vi.advanceTimersByTimeAsync(60000);
    expect(await request).toMatchObject({ code: 'SERVICE_UNAVAILABLE', statusCode: 503 });
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['post', 'put', 'patch', 'delete'])('does not replay %s requests', async (method) => {
    const fetch = vi.fn().mockResolvedValue(gateway());
    vi.stubGlobal('fetch', fetch);
    const result = await apiClient[method]('/resource', { value: 'test' }).catch((error) => error);
    expect(result.code).toBe('SERVICE_UNAVAILABLE');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not retry authorization failures, rate limits, or invalid routing', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    for (const status of [401, 403, 404, 429]) {
      fetch.mockResolvedValueOnce(gateway(status));
      await apiClient.get('/resource').catch(() => {});
    }
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(vi.getTimerCount()).toBe(0);
  });
});
