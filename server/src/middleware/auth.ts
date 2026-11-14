import { Request, Response, NextFunction } from "express";
import { createHmac, createPublicKey, timingSafeEqual, verify } from "node:crypto";
import { UserProfile } from "../types";
import { config } from "../config";
import { getSupabase } from "../db/supabase";
import { AppError } from "./AppError";

interface JwkKey {
  kid?: string;
  kty: string;
  alg?: string;
  [key: string]: unknown;
}

let cachedJwks: { keys: JwkKey[]; fetchedAt: number } | null = null;

async function verifyNeonAuthJwt(token: string): Promise<UserProfile> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in again.");
  }
  const [headerB64, payloadB64, sigB64] = parts;
  const header = JSON.parse(Buffer.from(headerB64, "base64url").toString()) as {
    kid?: string;
    alg?: string;
  };
  const claims = JSON.parse(Buffer.from(payloadB64, "base64url").toString()) as {
    sub?: string;
    email?: string;
    name?: string;
    role?: string;
    exp?: number;
  };

  if (!claims.sub || (claims.exp && claims.exp * 1000 < Date.now())) {
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in again.");
  }

  if (!cachedJwks || Date.now() - cachedJwks.fetchedAt > 300_000) {
    const res = await fetch(config.neon.authJwksUrl);
    if (!res.ok) {
      throw new AppError(503, "AUTH_UNAVAILABLE", "Neon Auth verification unavailable.");
    }
    const body = (await res.json()) as { keys?: JwkKey[] };
    cachedJwks = { keys: body.keys || [], fetchedAt: Date.now() };
  }

  const jwk =
    cachedJwks.keys.find((k) => !header.kid || k.kid === header.kid) ||
    cachedJwks.keys[0];
  if (!jwk) {
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in again.");
  }

  const publicKey = createPublicKey({ key: jwk as never, format: "jwk" });
  const alg = header.alg === "EdDSA" ? null : "sha256";
  const valid = verify(
    alg,
    Buffer.from(`${headerB64}.${payloadB64}`),
    publicKey,
    Buffer.from(sigB64, "base64url"),
  );
  if (!valid) {
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in again.");
  }

  return {
    id: claims.sub,
    email: claims.email || "",
    displayName: String(claims.name || "Learner").slice(0, 100),
    role:
      claims.role === "supervisor" || claims.role === "administrator"
        ? claims.role
        : "student",
  };
}
declare global {
  namespace Express {
    interface Request {
      user?: UserProfile;
    }
  }
}
const local = (req: Request) =>
  ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
    req.socket.remoteAddress || "",
  );
const signature = (value: string) =>
  createHmac("sha256", config.devAuthSecret).update(value).digest("base64url");
export function developmentLogin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!config.devAuth || !local(req) || config.devAuthSecret.length < 32)
    return next(
      new AppError(
        403,
        "DEV_AUTH_DISABLED",
        "Local development sign-in is unavailable.",
      ),
    );
  const payload = Buffer.from(
    JSON.stringify({ id: "local-learner", exp: Date.now() + 86400000 }),
  ).toString("base64url");
  res.cookie("psysim_dev", `${payload}.${signature(payload)}`, {
    httpOnly: true,
    sameSite: "strict",
    path: "/api",
    maxAge: 86400000,
  });
  res.json({ success: true });
}
export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const bearer = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (bearer) {
      const supabase = getSupabase();
      if (supabase) {
        const { data, error } = await supabase.auth.getUser(bearer);
        if (error || !data.user)
          throw new AppError(401, "UNAUTHENTICATED", "Please sign in again.");
        const user = data.user;
        const role = user.app_metadata?.role;
        req.user = {
          id: user.id,
          email: user.email || "",
          displayName: String(
            user.user_metadata?.display_name || "Learner",
          ).slice(0, 100),
          role:
            role === "supervisor" || role === "administrator" ? role : "student",
        };
      } else if (config.neon.isAuthConfigured) {
        req.user = await verifyNeonAuthJwt(bearer);
      } else {
        throw new AppError(
          503,
          "AUTH_SETUP_REQUIRED",
          "Authentication is not configured.",
        );
      }
    } else if (
      config.devAuth &&
      local(req) &&
      config.devAuthSecret.length >= 32
    ) {
      const cookie = req.headers.cookie
        ?.split("; ")
        .find((c) => c.startsWith("psysim_dev="))
        ?.slice(11);
      const [payload, mac] = (cookie || "").split(".");
      if (payload && mac) {
        const expected = signature(payload);
        if (
          mac.length === expected.length &&
          timingSafeEqual(Buffer.from(mac), Buffer.from(expected))
        ) {
          const claims = JSON.parse(
            Buffer.from(payload, "base64url").toString(),
          );
          if (claims.exp > Date.now() && claims.id === "local-learner")
            req.user = {
              id: claims.id,
              displayName: "Local learner",
              email: "local@psysim.invalid",
              role: "student",
            };
        }
      }
    }
    if (!req.user)
      throw new AppError(
        401,
        "UNAUTHENTICATED",
        "Sign in to access your learning workspace.",
      );
    next();
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(401, "UNAUTHENTICATED", "Please sign in again."),
    );
  }
}
export function requireRole(roles: UserProfile["role"][]) {
  return (req: Request, _res: Response, next: NextFunction) =>
    req.user && roles.includes(req.user.role)
      ? next()
      : next(new AppError(403, "FORBIDDEN", "Supervisor access is required."));
}
