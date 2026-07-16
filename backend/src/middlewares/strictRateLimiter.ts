import { rateLimit } from "express-rate-limit";

/**
 * Tight per-IP limits for public, unauthenticated, state-changing endpoints
 * (/auth/connect, /auth/login, /portal/enter). The global limiter still
 * applies on top of this.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many attempts - try again in a few minutes." } },
  validate: { xForwardedForHeader: false, trustProxy: false },
});

export const portalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many attempts - try again in a few minutes." } },
  validate: { xForwardedForHeader: false, trustProxy: false },
});
