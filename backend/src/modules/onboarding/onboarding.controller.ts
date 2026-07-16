import type { NextFunction, Request, Response } from "express";
import { onboardingService } from "./onboarding.service";

export class OnboardingController {
  async submitClientOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      // Data is already validated by Zod in the route middleware
      const files = (req.files as Express.Multer.File[]) || [];
      const result = await onboardingService.onboardClient(req.body, files);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const onboardingController = new OnboardingController();
