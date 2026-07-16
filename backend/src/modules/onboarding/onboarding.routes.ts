import { Router } from "express";
import { onboardingController } from "./onboarding.controller";
import { validateRequest } from "../../utils/httpHandlers";
import { clientOnboardingSchema } from "./onboarding.schema";
import { uploadAttachments } from "../../middlewares/upload";

const router = Router();

// Onboarding route: accepts multipart form data (so files can be sent, though currently ignored/commented out)
// We validate the body using our Zod schema.
router.post(
  "/client",
  uploadAttachments, // handles multipart/form-data
  validateRequest(clientOnboardingSchema),
  onboardingController.submitClientOnboarding
);

export { router as onboardingRouter };
