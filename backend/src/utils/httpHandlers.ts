import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ZodError, ZodSchema } from "zod";

export function validateRequest(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      req.body = parsed.body;
      next();
    } catch (err) {
      if (err instanceof Error && "errors" in err && Array.isArray((err as ZodError).errors)) {
        const zodError = err as ZodError;
        const errors = zodError.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Invalid input", details: errors },
        });
        return;
      }
      next(err);
    }
  };
}
