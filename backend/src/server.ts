import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pino } from "pino";
import { env } from "./utils/envConfig";
import rateLimiter from "./middlewares/rateLimiter";
import requestLogger from "./middlewares/requestLogger";
import errorHandler from "./middlewares/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { portalRouter } from "./modules/portal/portal.routes";
import { subAccountsRouter } from "./modules/sub-accounts/sub-accounts.routes";
import { usersRouter } from "./modules/users/users.routes";
import { ticketsRouter } from "./modules/tickets/tickets.routes";
import { notificationsRouter } from "./modules/notifications/notifications.routes";
import { analyticsRouter } from "./modules/analytics/analytics.routes";
import { socialRouter } from "./modules/social/social.routes";
import { auditLogsRouter } from "./modules/audit-logs/audit-logs.routes";
import { onboardingRouter } from "./modules/onboarding/onboarding.routes";
import { storageService } from "./lib/storage/storage.service";

const logger = pino({ name: "server start" });
const app: Express = express();

// Exactly ONE trusted proxy hop (Railway/Vercel edge). "true" would trust the
// client-supplied X-Forwarded-For chain, letting attackers rotate fake IPs to
// bypass the login/portal rate limits.
app.set("trust proxy", 1);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
// CORS_ORIGIN accepts a comma-separated list so production + preview + local
// frontends can all be allowed from one env var.
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean),
    credentials: true,
  }),
);
// crossOriginResourcePolicy relaxed so the frontend (a different origin) can
// load statically-served attachments from the local-disk storage fallback.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(rateLimiter);
app.use(requestLogger);

// Locally-stored attachments (fallback when Cloudinary isn't configured).
app.use("/uploads", express.static(storageService.uploadDir));

// Health check
app.get("/", (_, res) => {
  res.json({ success: true, message: "Agency Dashboard API", version: "1.0.0" });
});

// API routes
app.use("/api/auth", authRouter);
app.use("/api/onboarding", onboardingRouter);
app.use("/api/portal", portalRouter);
app.use("/api/sub-accounts", subAccountsRouter);
app.use("/api/users", usersRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/social", socialRouter);
app.use("/api/audit-logs", auditLogsRouter);

// Error handlers
const [notFoundHandler, errorLogger] = errorHandler();
app.use(notFoundHandler);
app.use(errorLogger);

export { app, logger };
