import type { NextFunction, Request, Response } from "express";
import { auditLogsService } from "./audit-logs.service";

export class AuditLogsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      // Clamp: negative pages crash Prisma; unbounded limits invite abuse.
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
      const result = await auditLogsService.list(req.user!.agencyId, page, limit);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}

export const auditLogsController = new AuditLogsController();
