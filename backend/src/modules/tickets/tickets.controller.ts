import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ticketsService } from "./tickets.service";

export class TicketsController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await ticketsService.create(req.body, req.user!);
      res.status(StatusCodes.CREATED).json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ticketsService.list({
        agencyId: req.user!.agencyId,
        ...req.query,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async listMine(req: Request, res: Response, next: NextFunction) {
    try {
      const tickets = await ticketsService.listMine(req.user!.userId);
      res.json({ success: true, data: tickets });
    } catch (error) {
      next(error);
    }
  }

  async listMyTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const tickets = await ticketsService.listMyTickets(req.user!.userId);
      res.json({ success: true, data: tickets });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await ticketsService.getById(String(req.params.id), req.user!);
      res.json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  }

  async moveStage(req: Request, res: Response, next: NextFunction) {
    try {
      const { stage, comment, sendEmail } = req.body;
      const ticket = await ticketsService.moveStage(String(req.params.id), stage, req.user!, comment, sendEmail);
      res.json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  }

  async assign(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await ticketsService.assign(String(req.params.id), req.body.assigneeId, req.user!);
      res.json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  }

  async addComment(req: Request, res: Response, next: NextFunction) {
    try {
      const { comment, isInternalNote, sendEmail } = req.body;
      const history = await ticketsService.addComment(String(req.params.id), req.user!, comment, isInternalNote, sendEmail);
      res.status(StatusCodes.CREATED).json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }

  async addAttachments(req: Request, res: Response, next: NextFunction) {
    try {
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      const historyId = typeof req.body?.historyId === "string" && req.body.historyId ? req.body.historyId : undefined;
      const created = await ticketsService.addAttachments(String(req.params.id), req.user!, files, historyId);
      res.status(StatusCodes.CREATED).json({ success: true, data: created });
    } catch (error) {
      next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await ticketsService.approve(String(req.params.id), req.user!, req.body.note);
      res.json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await ticketsService.reject(String(req.params.id), req.user!, req.body.note);
      res.json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const history = await ticketsService.getHistory(String(req.params.id), req.user!);
      res.json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }

  async getUnassigned(req: Request, res: Response, next: NextFunction) {
    try {
      const tickets = await ticketsService.getUnassigned(req.user!.agencyId);
      res.json({ success: true, data: tickets });
    } catch (error) {
      next(error);
    }
  }

  async getReviewQueue(req: Request, res: Response, next: NextFunction) {
    try {
      const tickets = await ticketsService.getReviewQueue(req.user!.agencyId);
      res.json({ success: true, data: tickets });
    } catch (error) {
      next(error);
    }
  }
}

export const ticketsController = new TicketsController();
