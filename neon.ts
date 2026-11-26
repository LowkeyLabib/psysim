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
        NODE_ENV: { value: "production", required: true },
        PSYSIM_FUNCTION: { value: "true", required: true },
        DEV_AUTH_ENABLED: { value: "false", required: true },
        ALLOW_UNREVIEWED_CASES: { value: "true", required: true },
        CORS_ORIGIN: { value: "https://lowkeylabib.github.io", required: true },
        AI_PROVIDER: { value: "gemini", required: true },
        GEMINI_API_KEY: { value: process.env.GEMINI_API_KEY, required: true },
        GEMINI_MODEL: { value: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite", required: true },
        GPT_LUNA_API_KEY: { value: process.env.GPT_LUNA_API_KEY, required: true },
        GPT_LUNA_BASE_URL: { value: "https://tokens.bd/v1", required: true },
        GPT_LUNA_MODEL: { value: process.env.GPT_LUNA_MODEL || "openai/gpt-6-luna", required: true },
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
