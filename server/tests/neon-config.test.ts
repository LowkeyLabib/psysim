import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe("Managed Neon Auth token configuration", () => {
  it("defaults issuer and audience to the origin, excluding the database/auth path", async () => {
    vi.stubEnv("NEON_AUTH_BASE_URL", "https://auth.example.test/neondb/auth");
    vi.stubEnv("NEON_AUTH_JWKS_URL", "https://auth.example.test/neondb/auth/.well-known/jwks.json");
    vi.stubEnv("NEON_AUTH_ISSUER", "");
    vi.stubEnv("NEON_AUTH_AUDIENCE", "");
    const { config } = await import("../src/config");
    expect(config.neon.authIssuer).toBe("https://auth.example.test");
    expect(config.neon.authAudience).toBe("https://auth.example.test");
    expect(config.neon.isAuthConfigured).toBe(true);
  });
  it("preserves explicit issuer and audience overrides", async () => {
    vi.stubEnv("NEON_AUTH_BASE_URL", "https://auth.example.test/neondb/auth");
    vi.stubEnv("NEON_AUTH_ISSUER", "https://custom.example.test");
    vi.stubEnv("NEON_AUTH_AUDIENCE", "psysim-api");
    const { config } = await import("../src/config");
    expect(config.neon.authIssuer).toBe("https://custom.example.test");
    expect(config.neon.authAudience).toBe("psysim-api");
  });
});
