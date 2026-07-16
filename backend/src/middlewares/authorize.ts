import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export function authorize(...allowedRoles: string[]) {

  
  return (req: Request, res: Response, next: NextFunction) => {
  console.log(req.user);

    if (!req.user) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      
      
      res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        error: { code: "FORBIDDEN", message: "You do not have permission to perform this action" },
      });
      return;
    }

    next();
  };
}
