import type { NextFunction, Request, Response } from "express";
import { subAccountsService } from "./sub-accounts.service";

export class SubAccountsController {
  async listRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await subAccountsService.listRequests(req.user!.agencyId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async listAll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await subAccountsService.listAll(req.user!.agencyId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async overview(req: Request, res: Response, next: NextFunction) {
    try {
      const forceRefresh = req.query.refresh === "true";
      const data = await subAccountsService.overview(req.user!.agencyId, forceRefresh);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async connectLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await subAccountsService.connectLocation(req.user!.agencyId, req.user!.userId, req.body.locationId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await subAccountsService.approve(req.user!.agencyId, req.user!.userId, String(req.params.id));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await subAccountsService.reject(req.user!.agencyId, req.user!.userId, String(req.params.id), req.body?.comment);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async changeStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await subAccountsService.changeStatus(
        req.user!.agencyId,
        req.user!.userId,
        String(req.params.id),
        req.body.status,
        req.body?.comment,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async bulkApprove(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await subAccountsService.bulkApprove(req.user!.agencyId, req.user!.userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const subAccountsController = new SubAccountsController();
