import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { config } from "../config";
import { AppError } from "../middleware/AppError";
import { getNeonPool } from "../db/neonPostgres";
import type { UserProfile } from "../types";
let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
export async function verifyNeonIdentity(token: string): Promise<UserProfile> {
  if (!config.neon.isAuthConfigured) throw new AppError(503, "AUTH_SETUP_REQUIRED", "Account access is not configured.");
  jwks ??= createRemoteJWKSet(new URL(config.neon.authJwksUrl));
  let payload;
  try { payload = await verifyNeonToken(token, jwks); }
  catch { throw new AppError(401, "UNAUTHENTICATED", "Please sign in again."); }
  const pool = getNeonPool();
  if (!pool) throw new AppError(503, "STORAGE_UNAVAILABLE", "Account storage is not configured.");
  // Privileges come only from a server-managed application profile, never user metadata.
  const result = await pool.query(
    `INSERT INTO psysim_accounts (auth_id, email, display_name) VALUES ($1,$2,$3)
     ON CONFLICT (auth_id) DO UPDATE SET email=EXCLUDED.email, display_name=EXCLUDED.display_name, updated_at=now()
     RETURNING auth_id, email, display_name, role`,
    [payload.sub, typeof payload.email === "string" ? payload.email : "", typeof payload.name === "string" ? payload.name.slice(0,100) : "Learner"],
  ).catch(() => { throw new AppError(503, "STORAGE_UNAVAILABLE", "Account storage is temporarily unavailable. Please try again."); });
  const row = result.rows[0];
  return { id: row.auth_id, email: row.email, displayName: row.display_name, role: row.role };
}

export async function verifyNeonToken(token: string, key: JWTVerifyGetKey) {
  const { payload } = await jwtVerify(token, key, {
    issuer: config.neon.authIssuer,
    audience: config.neon.authAudience,
    algorithms: ["EdDSA", "RS256", "ES256"],
    requiredClaims: ["sub", "exp", "iat", "iss", "aud"],
  });
  if (typeof payload.sub !== "string" || !payload.sub || payload.sub === "anonymous" || payload.is_anonymous === true || payload.role === "anonymous") throw new AppError(401, "UNAUTHENTICATED", "Please sign in again.");
  return payload;
}
