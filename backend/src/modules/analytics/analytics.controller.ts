import type { NextFunction, Request, Response } from "express";
import { analyticsService } from "./analytics.service";

export class AnalyticsController {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getDashboard(req.user!.agencyId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
