import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getErrorMessage } from "../util/util.ts";
import CustomError from "../errors/CustomError.ts";

export default function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof CustomError) {
    res.status(error.statusCode).json({
      error: {
        message: error.message,
        code: error.code,
      },
    });
    return;
  }

  if (
    error instanceof jwt.TokenExpiredError ||
    error instanceof jwt.JsonWebTokenError
  ) {
    return res
      .status(401)
      .json({ message: "Refresh token invalid or expired" });
  }
  if (error instanceof Error) {
    return res.status(500).json({ message: error.message });
  }

  res.status(500).json({
    error: {
      message:
        getErrorMessage(error) ||
        "An error occurred. Please view logs for more details",
    },
  });
}
