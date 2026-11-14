import { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { AppError } from "./AppError";
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const requestId = randomUUID();
  const bodyError = err as { type?: string } | null;
  if (
    bodyError?.type === "entity.parse.failed" ||
    bodyError?.type === "entity.too.large"
  ) {
    res
      .status(bodyError.type === "entity.too.large" ? 413 : 400)
      .json({
        error: {
          code: "INVALID_BODY",
          message: "Provide a valid JSON request within the size limit.",
          requestId,
        },
      });
    return;
  }
  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Check the required fields and permitted values.",
        requestId,
      },
    });
    return;
  }
  if (err instanceof AppError) {
    res
      .status(err.status)
      .json({ error: { code: err.code, message: err.message, requestId } });
    return;
  }
  // Never log raw exceptions: SDK errors can include credentials or clinical content.
  console.error("[PsySim] Request failed", {
    requestId,
    code: "INTERNAL_ERROR",
  });
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message:
        "The request could not be completed. Your last saved session is preserved.",
      requestId,
    },
  });
}
