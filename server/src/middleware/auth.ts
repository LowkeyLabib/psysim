import { Request, Response, NextFunction } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { UserProfile } from "../types";
import { config } from "../config";
import { verifyNeonIdentity } from "../auth/neon";
import { AppError } from "./AppError";

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
      req.user = await verifyNeonIdentity(bearer);
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
