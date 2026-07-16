import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "./envConfig";

export interface JwtPayload {
  userId: string;
  role: string;
  agencyId: string;
}

type Expiry = SignOptions["expiresIn"];

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY as Expiry,
  });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    // Passwordless sub-account sessions (location-id entry) get a shorter life.
    expiresIn: (payload.role === "SUB_ACCOUNT" ? env.JWT_SUB_ACCOUNT_REFRESH_EXPIRY : env.JWT_REFRESH_EXPIRY) as Expiry,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  // Pin the algorithm - never let a token dictate its own verification scheme.
  return jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] }) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ["HS256"] }) as JwtPayload;
}
