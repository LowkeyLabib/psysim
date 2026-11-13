import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        details: err.errors,
      },
    });
    return;
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal clinical server error occurred.';
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  console.error('[PsySim Error]', err);

  res.status(statusCode).json({
    error: {
      code,
      message,
    },
  });
}
