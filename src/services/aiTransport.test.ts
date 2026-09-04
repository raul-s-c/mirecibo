import { afterEach, describe, expect, it, vi } from 'vitest';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { aiFetch } from './aiTransport';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: vi.fn(() => false) }, CapacitorHttp: { request: vi.fn() } }));
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false); });
describe('AI transport', () => {
  it('uses native networking for Android list generation with authentication', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(CapacitorHttp.request).mockResolvedValue({ status: 200, headers: {}, url: '', data: { data: { items: [] } } });
    const response = await aiFetch('https://example.test/v1/lists/generate', { method: 'POST', headers: { Authorization: 'Bearer test' }, body: '{"request":"Paella"}' });
    expect(response.ok).toBe(true);
    expect(CapacitorHttp.request).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ data: { request: 'Paella' }, headers: { authorization: 'Bearer test' }, readTimeout: 120000 }));
  });
  it('preserves HTTP errors and their structured payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'Límite alcanzado' }, { status: 429 })));
    const response = await aiFetch('https://example.test', {});
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: 'Límite alcanzado' });
  });
  it('does not retry a failed paid operation and explains network failure', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(aiFetch('https://example.test', {})).rejects.toThrow('No se ha podido conectar');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
