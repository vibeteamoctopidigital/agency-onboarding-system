import { Router } from "express";
import { portalController } from "./portal.controller";
import { validateRequest } from "../../utils/httpHandlers";
import { portalEnterSchema } from "./portal.schema";
import { portalRateLimiter } from "../../middlewares/strictRateLimiter";
import { requireJsonContent } from "../../middlewares/requireJsonContent";

const router = Router();


router.post("/enter", portalRateLimiter, requireJsonContent, validateRequest(portalEnterSchema), portalController.enter);
// Single-agency owner auto-login - validation is entirely server-side
// (env GHL_VERIFY_COMPANY_ID + GHL_VERIFY_API_KEY vs the connected agency row).
router.post("/admin-enter", portalRateLimiter, requireJsonContent, portalController.adminEnter);

export { router as portalRouter };
