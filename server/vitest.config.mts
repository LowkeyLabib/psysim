import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    pool: "threads",
    env: {
      NODE_ENV: "test",
      AI_PROVIDER: "mock",
      DEV_AUTH_ENABLED: "true",
      DEV_AUTH_SECRET: "test-only-secret-at-least-32-characters",
      ALLOW_UNREVIEWED_CASES: "true",
    },
  },
});
