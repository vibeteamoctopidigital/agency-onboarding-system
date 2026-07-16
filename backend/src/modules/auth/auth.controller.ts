import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { authService } from "./auth.service";

export class AuthController {
  async connect(req: Request, res: Response, next: NextFunction) {
    try {
      // NEVER log req.body here - it carries the owner's password and both GHL PITs.
      const result = await authService.connect(req.body);
      res.status(StatusCodes.CREATED).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateMediaStorage(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.updateMediaStorage(req.user!.agencyId, req.user!.userId, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: { code: "MISSING_TOKEN", message: "Refresh token is required" },
        });
        return;
      }
      const result = await authService.refreshToken(refreshToken);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(req.user!.userId, currentPassword, newPassword);
      res.json({ success: true, data: { message: "Password changed successfully" } });
    } catch (error) {
      next(error);
    }
  }

  async firstLoginPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.firstLoginSetPassword(req.user!.userId, req.body.newPassword);
      res.json({ success: true, data: { message: "Password set successfully" } });
    } catch (error) {
      next(error);
    }
  }

  async impersonate(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.body;
      const result = await authService.impersonate(req.user!.userId, req.user!.agencyId, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getMe(req.user!.userId);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
