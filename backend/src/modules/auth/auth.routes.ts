import { Router } from "express";
import { authController } from "./auth.controller";
import { validateRequest } from "../../utils/httpHandlers";
import { connectSchema, loginSchema, changePasswordSchema, firstLoginPasswordSchema, mediaStorageSchema, impersonateSchema } from "./auth.schema";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";
import { authRateLimiter } from "../../middlewares/strictRateLimiter";
import { requireJsonContent } from "../../middlewares/requireJsonContent";

const router = Router();

// Public, state-changing endpoints: strict per-IP rate limit + JSON-only
// content type (CSRF hardening - cross-origin HTML forms cannot send
// application/json without a CORS preflight, which our CORS policy rejects).
router.post("/connect", authRateLimiter, requireJsonContent, validateRequest(connectSchema), authController.connect);
router.post("/login", authRateLimiter, requireJsonContent, validateRequest(loginSchema), authController.login);
router.post("/refresh", authRateLimiter, requireJsonContent, authController.refresh);

// Owner sets/updates the media-storage sub-account credentials (validated live).
router.put("/media-storage", authenticate, authorize("AGENCY_OWNER"), validateRequest(mediaStorageSchema), authController.updateMediaStorage);
router.post("/impersonate", authenticate, authorize("AGENCY_OWNER"), validateRequest(impersonateSchema), authController.impersonate);
router.post("/change-password", authenticate, validateRequest(changePasswordSchema), authController.changePassword);
router.post("/first-login-password", authenticate, validateRequest(firstLoginPasswordSchema), authController.firstLoginPassword);
router.get("/me", authenticate, authController.getMe);

export { router as authRouter };
