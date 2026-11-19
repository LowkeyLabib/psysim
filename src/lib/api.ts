import type { PsySimApi } from "../../shared/contracts";
import { apiBase, demoMode, localDevelopment } from "./config";
import { neonAuth } from "./neonAuth";
import { demoApi } from "./demo";
// Legacy browser simulation is available only in development; hidden cases must
// never ship in an authenticated production bundle.
const standaloneApi = import.meta.env.DEV ? new Proxy({} as PsySimApi, {
  get: (_target, method: keyof PsySimApi) => async (...args: unknown[]) => {
    const { liveSimulationApi } = await import("./liveSimulation");
    return (liveSimulationApi[method] as (...args: unknown[]) => unknown)(...args);
  },
}) : null;

const standaloneMode = import.meta.env.DEV && !demoMode && !localDevelopment && !neonAuth;

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
    public code = "NETWORK_ERROR",
  ) {
    super(message);
  }
}

export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  key?: string,
): Promise<T> {
  // Neon injects the signed JWT into session.token and owns its refresh/cache.
  const sessionResponse = await neonAuth?.getSession();
  if (sessionResponse?.error) {
    throw new ApiError("Account service unavailable. Please try again shortly.", 503, "AUTH_UNAVAILABLE");
  }
  const token = sessionResponse?.data?.session?.token;
  if (!token && !localDevelopment) {
    window.dispatchEvent(new Event("psysim:unauthenticated"));
    throw new ApiError("Your session has expired. Please sign in again.", 401, "UNAUTHENTICATED");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 110_000);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token
      ? { Authorization: `Bearer ${token}` }
      : {}),
    ...(key ? { "Idempotency-Key": key } : {}),
  };

  try {
    const response = await fetch(`${apiBase}${path}`, {
      method,
      credentials: localDevelopment ? "include" : "omit",
      signal: controller.signal,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401) window.dispatchEvent(new Event("psysim:unauthenticated"));
      throw new ApiError(
        payload?.error?.message || `Request failed (${response.status}).`,
        response.status,
        payload?.error?.code,
      );
    }

    if (!payload) {
      throw new ApiError(
        "The server returned an unreadable response.",
        502,
        "INVALID_RESPONSE",
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      controller.signal.aborted
        ? "The request timed out. Refresh the session before retrying; your action may have been saved."
        : "Cannot reach PsySim. Check your connection and refresh before retrying.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

const pathId = (id: string) => encodeURIComponent(id);

export const liveApi: PsySimApi = {
  me: () => request("/me"),
  categories: () => request("/scenarios/categories"),
  availableScenarios: () => request("/scenarios"),
  sessions: (cursor) =>
    request(
      `/me/sessions${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
    ),
  create: (input, key) => request("/sessions", "POST", input, key),
  session: (id) => request(`/sessions/${pathId(id)}`),
  send: (id, content, expectedVersion, key) =>
    request(
      `/sessions/${pathId(id)}/messages`,
      "POST",
      { content, expectedVersion },
      key,
    ),
  diagnose: (id, input, key) =>
    request(`/sessions/${pathId(id)}/diagnosis`, "POST", input, key),
  results: (id) => request(`/sessions/${pathId(id)}/results`),
  scenarios: () => request("/supervisor/scenarios"),
  saveScenario: (input, id, expectedVersion) =>
    request(
      id ? `/supervisor/scenarios/${pathId(id)}` : "/supervisor/scenarios",
      id ? "PATCH" : "POST",
      {
        ...input,
        ...(id ? { expectedVersion } : {}),
      },
    ),
  reviewScenario: (id, expectedVersion, decision, reviewNote) =>
    request(`/supervisor/scenarios/${pathId(id)}/approve`, "POST", {
      expectedVersion,
      decision,
      reviewNote,
    }),
};

export const liveServerApi = liveApi;

export const api: PsySimApi = demoMode
  ? demoApi
  : standaloneMode
    ? standaloneApi!
    : liveApi;

export async function localSignIn(): Promise<void> {
  if (!localDevelopment) throw new ApiError("Local sign-in is disabled.", 403);
  await request("/auth/development", "POST");
}
export async function localSignOut(): Promise<void> {
  await request("/auth/logout", "POST");
}
