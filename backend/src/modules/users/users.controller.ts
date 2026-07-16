import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { usersService } from "./users.service";

export class UsersController {
  async listTeamMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await usersService.listTeamMembers(req.user!.agencyId);
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }

  async createTeamMember(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.createTeamMember(req.user!.agencyId, req.user!.userId, req.body);
      res.status(StatusCodes.CREATED).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async syncTeamFromGhl(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.syncTeamFromGhl(req.user!.agencyId, req.user!.userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateTeamMember(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.updateTeamMember(req.user!.agencyId, String(req.params.id), req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteTeamMember(req: Request, res: Response, next: NextFunction) {
    try {
      await usersService.deleteTeamMember(req.user!.agencyId, req.user!.userId, String(req.params.id));
      res.json({ success: true, data: { message: "Team member removed" } });
    } catch (error) {
      next(error);
    }
  }

  async toggleAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.toggleAvailability(req.user!.userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getMyStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await usersService.getStats(req.user!.userId, req.user!.agencyId);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  async listAllTeamStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await usersService.listAllTeamStats(req.user!.agencyId);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  async listSubAccounts(req: Request, res: Response, next: NextFunction) {
    try {
      const accounts = await usersService.listSubAccounts(req.user!.agencyId);
      res.json({ success: true, data: accounts });
    } catch (error) {
      next(error);
    }
  }

  async createSubAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.createSubAccount(req.user!.agencyId, req.user!.userId, req.body);
      res.status(StatusCodes.CREATED).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const usersController = new UsersController();
