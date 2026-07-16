import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { socialService } from "./social.service";

export class SocialController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await socialService.create(req.body, req.user!);
      res.status(StatusCodes.CREATED).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await socialService.list(req.user!, {
        status: req.query.status as string | undefined,
        subAccountId: req.query.subAccountId as string | undefined,
        orderType: req.query.orderType as string | undefined,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updateOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await socialService.updateOrder(String(req.params.id), req.user!, req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await socialService.getById(String(req.params.id), req.user!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async accept(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await socialService.accept(String(req.params.id), req.user!, req.body?.note);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async respondToProposal(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await socialService.respondToProposal(String(req.params.id), req.user!, req.body.approve, req.body?.note);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async assign(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await socialService.assign(String(req.params.id), req.user!, req.body.assigneeIds);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async setStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await socialService.setStatus(String(req.params.id), req.user!, req.body.status, req.body?.note);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async addProgressNote(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await socialService.addProgressNote(String(req.params.id), req.user!, req.body.note);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async confirm(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await socialService.confirm(String(req.params.id), req.user!, req.body?.note);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async requestChanges(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await socialService.requestChanges(String(req.params.id), req.user!, req.body.note);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await socialService.cancel(String(req.params.id), req.user!, req.body?.note);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async addFiles(req: Request, res: Response, next: NextFunction) {
    try {
      const files = (req.files as Express.Multer.File[]) ?? [];
      const data = await socialService.addFiles(String(req.params.id), req.user!, files);
      res.status(StatusCodes.CREATED).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async subAccountProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await socialService.subAccountProfile(req.user!.agencyId, String(req.params.id));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const socialController = new SocialController();
