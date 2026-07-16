import { StatusCodes } from "http-status-codes";

export class AppError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number = StatusCodes.BAD_REQUEST, code = "ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message: string, code = "BAD_REQUEST") => new AppError(message, StatusCodes.BAD_REQUEST, code);
export const unauthorized = (message: string, code = "UNAUTHORIZED") => new AppError(message, StatusCodes.UNAUTHORIZED, code);
export const forbidden = (message: string, code = "FORBIDDEN") => new AppError(message, StatusCodes.FORBIDDEN, code);
export const notFound = (message: string, code = "NOT_FOUND") => new AppError(message, StatusCodes.NOT_FOUND, code);
export const conflict = (message: string, code = "CONFLICT") => new AppError(message, StatusCodes.CONFLICT, code);
export const badGateway = (message: string, code = "UPSTREAM_ERROR") => new AppError(message, StatusCodes.BAD_GATEWAY, code);
