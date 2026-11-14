import dotenv from "dotenv";
import path from "node:path";
// The server owns its environment; never read browser configuration or credentials from requests.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
const nodeEnv = process.env.NODE_ENV || "development";
export const config = {
  port: Number(process.env.PORT || 5000),
  nodeEnv,
  host: process.env.HOST || "127.0.0.1",
  aiProvider: (process.env.AI_PROVIDER || "mock") as "gemini" | "groq" | "mock",
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
    model: process.env.GROQ_MODEL || "",
  },
  supabase: {
    url: process.env.SUPABASE_URL || "",
    anonKey:
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      "",
    isConfigured: Boolean(
      process.env.SUPABASE_URL &&
      (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY),
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
