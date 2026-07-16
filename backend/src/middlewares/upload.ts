import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { badRequest } from "../utils/appError";
import { env } from "../utils/envConfig";

/**
 * In-memory multipart parsing for attachments - the buffer is then streamed to
 * Cloudinary (or written to local disk) by the storage service. Memory storage
 * keeps the upload pipeline storage-agnostic and avoids temp-file cleanup.
 */

// Aligned with what the GHL Media Library ACCEPTS (VERIFIED LIVE 2026-07-13):
// images, pdf, csv, zip, mp4 pass; txt and doc/docx/xls/xlsx are rejected by
// GHL with "Invalid File Type" - blocking them here gives a clean 400 upfront
// instead of a failed upload later. (Office docs can be zipped if needed.)
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  // svg deliberately EXCLUDED - it can carry scripts (stored-XSS vector).
  "application/pdf",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
  "video/mp4",
]);

const parser = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: 8,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) return cb(null, true);
    cb(new Error(`Unsupported file type: ${file.mimetype}`));
  },
}).array("files", 8);

/** Multipart parser that maps multer/filter errors to clean 400 responses. */
export function uploadAttachments(req: Request, res: Response, next: NextFunction) {
  parser(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? `Each file must be ${env.MAX_UPLOAD_MB}MB or smaller`
          : err.code === "LIMIT_FILE_COUNT"
            ? "Too many files (max 8 per upload)"
            : err.message;
      return next(badRequest(message, "UPLOAD_ERROR"));
    }
    return next(badRequest(err instanceof Error ? err.message : "Upload failed", "UPLOAD_ERROR"));
  });
}
