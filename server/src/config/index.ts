import dotenv from "dotenv";
import path from "node:path";
// The server owns its environment; never read browser configuration or credentials from requests.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });
const nodeEnv = process.env.NODE_ENV || "development";
const authBaseUrl = process.env.NEON_AUTH_BASE_URL || "";
// Managed Neon Auth signs JWTs for its origin, without /neondb/auth.
const authOrigin = authBaseUrl ? new URL(authBaseUrl).origin : "";
export const config = {
  port: Number(process.env.PORT || 5000),
  nodeEnv,
  host: process.env.HOST || "127.0.0.1",
  aiProvider: (process.env.AI_PROVIDER || "mock") as
    | "gemini"
    | "groq"
    | "neon-ai-gateway"
    | "mock",
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
    model: process.env.GROQ_MODEL || "",
  },
  neon: {
    databaseUrl: process.env.DATABASE_URL || "",
    databaseUrlUnpooled: process.env.DATABASE_URL_UNPOOLED || "",
    branch: process.env.NEON_BRANCH || "",
    branchId: process.env.NEON_BRANCH_ID || "",
    authBaseUrl,
    authIssuer: process.env.NEON_AUTH_ISSUER || authOrigin,
    authAudience: process.env.NEON_AUTH_AUDIENCE || authOrigin,
    authJwksUrl: process.env.NEON_AUTH_JWKS_URL || "",
    aiGatewayToken: process.env.NEON_AI_GATEWAY_TOKEN || "",
    aiGatewayBaseUrl: process.env.NEON_AI_GATEWAY_BASE_URL || "",
    isPostgresConfigured: Boolean(process.env.DATABASE_URL),
    isAuthConfigured: Boolean(
      authBaseUrl && process.env.NEON_AUTH_JWKS_URL,
    ),
    isAiGatewayConfigured: Boolean(
      process.env.NEON_AI_GATEWAY_BASE_URL && process.env.NEON_AI_GATEWAY_TOKEN,
    ),
  },
  devAuth: nodeEnv !== "production" && process.env.DEV_AUTH_ENABLED === "true",
  devAuthSecret: process.env.DEV_AUTH_SECRET || "",
  allowUnreviewed:
    nodeEnv !== "production" && process.env.ALLOW_UNREVIEWED_CASES === "true",
  databaseFile:
    process.env.DATABASE_FILE ||
    path.resolve(__dirname, "../../data/psysim.sqlite"),
  corsOrigin: process.env.CORS_ORIGIN || "http://127.0.0.1:5173",
};
