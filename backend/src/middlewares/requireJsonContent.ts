import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

/**
 * CSRF hardening for token-less public POSTs: browsers can only submit
 * cross-origin forms as urlencoded/multipart/text-plain without triggering a
 * CORS preflight. Requiring application/json means any cross-origin attempt
 * hits preflight, which our CORS policy rejects.
 */
export function requireJsonContent(req: Request, res: Response, next: NextFunction) {
  if (!req.is("application/json")) {
    res.status(StatusCodes.UNSUPPORTED_MEDIA_TYPE).json({
      success: false,
      error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Content-Type must be application/json" },
    });
    return;
  }
  next();
}
