import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('../lib/config', () => ({ demoMode: false, apiBase: 'https://psysim.test/api' }));
vi.mock('../lib/supabase', () => ({ supabase: { auth: { getSession: mocks.getSession } } }));
import { liveApi, request } from '../lib/api';
beforeEach(() => { mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } } }); });
describe('authenticated API transport', () => {
  it('sends bearer, Unicode body, version, and idempotency key to the encoded endpoint', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ state: 'IN_PROGRESS' }), { status: 200 })); vi.stubGlobal('fetch', fetch);
    await liveApi.send('id/with slash', 'আপনি কেমন আছেন?', 3, 'stable-key');
    expect(fetch).toHaveBeenCalledOnce(); const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('https://psysim.test/api/sessions/id%2Fwith%20slash/messages');
    expect(options.headers).toMatchObject({ Authorization: 'Bearer test-token', 'Idempotency-Key': 'stable-key' });
    expect(JSON.parse(options.body)).toEqual({ content: 'আপনি কেমন আছেন?', expectedVersion: 3 });
  });
  it('blocks unauthenticated network access', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } }); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(liveApi.me()).rejects.toMatchObject({ status: 401 }); expect(fetch).not.toHaveBeenCalled();
  });
  it.each([403, 409, 422, 429, 503])('surfaces backend errors without retrying or falling back: %s', async status => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'TEST', message: 'Action unavailable' } }), { status })); vi.stubGlobal('fetch', fetch);
    await expect(liveApi.create({ mode: 'challenge', difficulty: 'beginner', language: 'en' }, 'key')).rejects.toMatchObject({ status, message: 'Action unavailable' }); expect(fetch).toHaveBeenCalledOnce();
  });
  it('handles malformed responses and connection failures safely', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('not JSON')).mockRejectedValueOnce(new TypeError('network')); vi.stubGlobal('fetch', fetch);
    await expect(request('/me')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' }); await expect(request('/me')).rejects.toThrow('Cannot reach PsySim');
  });
});
