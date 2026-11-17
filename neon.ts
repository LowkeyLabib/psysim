import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Declare your Neon services here
  auth: true,
  aiGateway: true,
  functions: {
    api: {
      name: "PsySim Account API",
      source: "./server/src/neonFunction.ts",
      env: {
        NODE_ENV: { value: "production" },
        PSYSIM_FUNCTION: { value: "true" },
        DEV_AUTH_ENABLED: { value: "false" },
        ALLOW_UNREVIEWED_CASES: { value: "false" },
        CORS_ORIGIN: { value: "https://lowkeylabib.github.io" },
        AI_PROVIDER: { value: "gemini" },
        GEMINI_API_KEY: { value: process.env.GEMINI_API_KEY, required: true },
        GEMINI_MODEL: { value: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite" },
      },
    },
    hello: { name: "Hello World", source: "./hello.ts" },
    gemini: {
      name: "PsySim Gemini Proxy",
      source: "./geminiProxy.ts",
      env: {
        GEMINI_API_KEY: { value: process.env.GEMINI_API_KEY, required: true },
      },
    },
  },
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
