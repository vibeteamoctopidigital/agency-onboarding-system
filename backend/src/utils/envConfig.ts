import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  HOST: z.string().min(1).default("localhost"),

  PORT: z.coerce.number().int().positive().default(8080),

  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().min(1),
  GHL_EMAIL_SEND_WEBHOOK_URL: z.string().min(1),

  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRY: z.string().default("1d"),
  JWT_REFRESH_EXPIRY: z.string().default("7d"),
  // Sub-accounts run inside a GHL iframe with no password - keep their sessions shorter.
  JWT_SUB_ACCOUNT_REFRESH_EXPIRY: z.string().default("24h"),

  // Single-agency owner auto-login (client requirement): when BOTH are set and
  // match the connected agency in the DB, visiting the admin app logs the
  // owner in automatically - no password. Unset either to disable.
  GHL_VERIFY_COMPANY_ID: z.string().optional(),

  // 32-byte hex key for AES-256-GCM encryption of GHL API keys at rest.
  // Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "ENCRYPTION_KEY must be 64 hex characters (32 bytes)"),

  GHL_API_BASE_URL: z.string().url().default("https://services.leadconnectorhq.com"),
  GHL_API_VERSION: z.string().default("2021-07-28"),

  // Inputs for the one-time live verification script (ghlscripts/verify-ghl.ts).
  // Never used by the app itself - safe to leave unset in production.
  GHL_VERIFY_API_KEY: z.string().optional(),
  GHL_VERIFY_LOCATION_ID: z.string().optional(),

  COMMON_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(1000),

  COMMON_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(1000),

  // Public base URL of THIS backend - used to build absolute URLs for
  // locally-stored attachments. Defaults to http://HOST:PORT at runtime.
  PUBLIC_BASE_URL: z.string().url().optional(),
  // Base URL of the frontend app - used for links inside emails (e.g. "open your ticket").
  APP_BASE_URL: z.string().url().optional(),

  // Email (SMTP via Nodemailer). All optional - when unset, emails are logged
  // to the console instead of sent, so ticket flows still work without creds.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  EMAIL_FROM: z.string().optional(),

  // Cloudinary attachment storage. When unset, files are written to ./uploads
  // and served statically as a local-disk fallback.
  CLOUDINARY_URL: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Max upload size per attachment file, in megabytes.
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(10),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment variables:", parsedEnv.error.format());
  throw new Error("Invalid environment variables");
}

const data = parsedEnv.data;

export const env = {
  ...data,
  isDevelopment: data.NODE_ENV === "development",
  isProduction: data.NODE_ENV === "production",
  isTest: data.NODE_ENV === "test",
  // Absolute, externally-reachable base URL of this API (for attachment links).
  publicBaseUrl: data.PUBLIC_BASE_URL ?? `http://${data.HOST}:${data.PORT}`,
  // Where the frontend lives (for links inside emails).
  appBaseUrl: data.APP_BASE_URL ?? data.CORS_ORIGIN,
  isEmailConfigured: Boolean(data.SMTP_HOST && data.SMTP_PORT),
  isCloudinaryConfigured: Boolean(
    data.CLOUDINARY_URL || (data.CLOUDINARY_CLOUD_NAME && data.CLOUDINARY_API_KEY && data.CLOUDINARY_API_SECRET),
  ),
};
