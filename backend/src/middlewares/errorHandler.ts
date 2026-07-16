import type { ErrorRequestHandler, RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import { GhlApiError } from "../lib/ghl/ghl.client";

const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    error: { code: "NOT_FOUND", message: "The requested resource was not found" },
  });
};

const addErrorToRequestLog: ErrorRequestHandler = (err, req, res, _next) => {
  // A GHL upstream failure is never OUR internal error - surface the real
  // reason (e.g. "Invalid Private Integration token") instead of a bare 500.
  if (err instanceof GhlApiError) {
    const status = err.httpStatus === 401 || err.httpStatus === 403 ? StatusCodes.BAD_GATEWAY : StatusCodes.BAD_GATEWAY;
    res.status(status).json({
      success: false,
      error: {
        code: "GHL_ERROR",
        message:
          err.httpStatus === 401
            ? `GoHighLevel rejected the agency's API key (${err.message}). The owner must update the stored key or reconnect the agency.`
            : `GoHighLevel request failed: ${err.message}`,
      },
    });
    return;
  }

  const status = err.status || err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || "Internal server error";

  res.locals.err = err;

  if (status === StatusCodes.INTERNAL_SERVER_ERROR) {
    // Always leave a trace for 500s - these are bugs, not user errors.
    console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err?.stack || err);
  }

  res.status(status).json({
    success: false,
    error: {
      // AppError carries its own code; fall back to generic labels.
      code: err.code && typeof err.code === "string" && status !== StatusCodes.INTERNAL_SERVER_ERROR
        ? err.code
        : status === StatusCodes.INTERNAL_SERVER_ERROR ? "INTERNAL_ERROR" : "ERROR",
      message: status === StatusCodes.INTERNAL_SERVER_ERROR ? "Internal server error" : message,
    },
  });
};

export default (): [RequestHandler, ErrorRequestHandler] => [notFoundHandler, addErrorToRequestLog];
