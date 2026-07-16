import type { NextFunction, Request, Response } from "express";
import { portalService } from "./portal.service";

export class PortalController {
  async enter(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await portalService.enter(req.body.locationId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async adminEnter(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await portalService.adminEnter();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const portalController = new PortalController();
