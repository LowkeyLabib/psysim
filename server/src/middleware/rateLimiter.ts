import { Request, Response, NextFunction } from "express";
export function rateLimiter(limit = 100, windowMs = 60000) {
  const records = new Map<string, { count: number; until: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    for (const [key, value] of records)
      if (value.until <= now) records.delete(key);
    const key = req.user?.id || req.ip || "unknown";
    const record = records.get(key) || { count: 0, until: now + windowMs };
    records.set(key, record);
    if (++record.count > limit) {
      res.setHeader("Retry-After", Math.ceil((record.until - now) / 1000));
      res
        .status(429)
        .json({
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please wait before trying again.",
          },
        });
      return;
    }
    next();
  };
}
