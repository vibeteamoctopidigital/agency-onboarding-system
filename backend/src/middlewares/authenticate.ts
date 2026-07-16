import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { verifyAccessToken, type JwtPayload } from "../utils/jwt";
import { prisma } from "../utils/prisma";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

function deny(res: Response, code: string, message: string) {
  res.status(StatusCodes.UNAUTHORIZED).json({ success: false, error: { code, message } });
}

/**
 * JWT check + a liveness check against the DB. The DB hit matters: without it
 * a FIRED team member (isDeleted) or a BLOCKED sub-account keeps full API
 * access until their token expires (up to a day). One indexed point-read per
 * request is the price of revocation actually working.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return deny(res, "UNAUTHORIZED", "Missing or invalid authorization header");
  }

  const token = authHeader.split(" ")[1];

  let payload: JwtPayload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return deny(res, "TOKEN_EXPIRED", "Access token expired or invalid");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        isDeleted: true,
        subAccountProfile: { select: { status: true } },
      },
    });
    if (!user || user.isDeleted) {
      return deny(res, "ACCOUNT_DISABLED", "This account is no longer active");
    }
    if (payload.role === "SUB_ACCOUNT" && user.subAccountProfile?.status === "BLOCKED") {
      return deny(res, "ACCESS_BLOCKED", "Your support portal access has been disabled by the agency");
    }
  } catch (err) {
    return next(err);
  }

  req.user = payload;
  next();
}
