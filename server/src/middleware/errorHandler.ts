import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid request data provided.',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        issue: e.message,
      })),
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal clinical server error occurred.';

  console.error('[PsySim Error]', err);

  res.status(statusCode).json({
    error: err.code || 'INTERNAL_SERVER_ERROR',
    message,
  });
}
