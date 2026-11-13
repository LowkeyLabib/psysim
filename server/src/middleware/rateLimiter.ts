import { Request, Response, NextFunction } from 'express';

const requestLog = new Map<string, { count: number; resetTime: number }>();

export function rateLimiter(limit: number = 100, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = (req.ip || '127.0.0.1') + (req.user?.id || '');
    const now = Date.now();
    const record = requestLog.get(key);

    if (!record || now > record.resetTime) {
      requestLog.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= limit) {
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please wait before continuing your clinical consultation.',
      });
      return;
    }

    record.count++;
    next();
  };
}
