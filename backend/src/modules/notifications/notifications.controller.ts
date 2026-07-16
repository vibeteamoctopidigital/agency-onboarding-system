import type { NextFunction, Request, Response } from "express";
import { notificationsService } from "./notifications.service";

export class NotificationsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      // Clamp: negative pages crash Prisma; unbounded limits invite abuse.
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const result = await notificationsService.list(req.user!.userId, page, limit);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await notificationsService.getUnreadCount(req.user!.userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      await notificationsService.markAsRead(String(req.params.id), req.user!.userId);
      res.json({ success: true, data: { message: "Notification marked as read" } });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      await notificationsService.markAllAsRead(req.user!.userId);
      res.json({ success: true, data: { message: "All notifications marked as read" } });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationsController = new NotificationsController();
