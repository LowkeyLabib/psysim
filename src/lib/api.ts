import type { PsySimApi } from '../../shared/contracts';
import { apiBase, demoMode } from './config';
import { supabase } from './supabase';
export class ApiError extends Error {
  constructor(message: string, public status = 0, public code = 'NETWORK_ERROR') { super(message); }
}
export async function request<T>(path: string, method = 'GET', body?: unknown, key?: string): Promise<T> {
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  if (!data.session) throw new ApiError('Your session has expired. Please sign in again.', 401, 'UNAUTHENTICATED');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(`${apiBase}${path}`, {
      method, signal: controller.signal, headers: {
        Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json',
        ...(key ? { 'Idempotency-Key': key } : {}),
      }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(payload?.error?.message || `Request failed (${response.status}).`, response.status, payload?.error?.code);
    if (!payload) throw new ApiError('The server returned an unreadable response.', 502, 'INVALID_RESPONSE');
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(controller.signal.aborted
      ? 'The request timed out. Refresh the session before retrying; your action may have been saved.'
      : 'Cannot reach PsySim. Check your connection and refresh before retrying.');
  } finally { clearTimeout(timeout); }
}
const pathId = (id: string) => encodeURIComponent(id);
export const liveApi: PsySimApi = {
  me: () => request('/me'), categories: () => request('/scenarios/categories'),
  sessions: (cursor) => request(`/me/sessions${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
  create: (input, key) => request('/sessions', 'POST', input, key),
  session: (id) => request(`/sessions/${pathId(id)}`),
  send: (id, content, expectedVersion, key) => request(`/sessions/${pathId(id)}/messages`, 'POST', { content, expectedVersion }, key),
  diagnose: (id, input, key) => request(`/sessions/${pathId(id)}/diagnosis`, 'POST', input, key),
  results: (id) => request(`/sessions/${pathId(id)}/results`),
  scenarios: () => request('/supervisor/scenarios'),
  saveScenario: (input, id, expectedVersion) => request(id ? `/supervisor/scenarios/${pathId(id)}` : '/supervisor/scenarios', id ? 'PATCH' : 'POST', { ...input, ...(id ? { expectedVersion } : {}) }),
  reviewScenario: (id, expectedVersion, decision, reviewNote) => request(`/supervisor/scenarios/${pathId(id)}/approve`, 'POST', { expectedVersion, decision, reviewNote }),
};
export const api: PsySimApi = demoMode ? (await import('./demo')).demoApi : liveApi;
