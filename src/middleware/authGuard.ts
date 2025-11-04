import { NextFunction, Request, Response } from "express";
import prisma from "../config/db";
import jwt, { JwtPayload } from "jsonwebtoken";
import UnauthorizedError from "../errors/UnauthorizedError";
import InternalServerError from "../errors/InternalServerError";

// interface AccessTokenPayload extends jwt.JwtPayload {
//   userId: number;
// }

const authGuard = async (req: Request, res: Response, next: NextFunction) => {
  const authorization = req.headers.authorization;

  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization?.split(" ")[1]
    : authorization;

  if (!accessToken) {
    throw new UnauthorizedError("Access token not found");
  }

  const invalidToken = await prisma.userInvalidToken.findFirst({
    where: {
      accessToken,
    },
  });

  if (invalidToken) {
    throw new UnauthorizedError("Access token invalid");
  }

  try {
    const decodedAccessToken = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET_KEY!
    ) as JwtPayload;

    req.user = { id: decodedAccessToken.userId };
    req.accessToken = { value: accessToken, exp: decodedAccessToken?.iat };

    next();
  } catch (error: unknown) {
    console.log("error", error);
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError("Access token expired");
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError("Access token invalid");
    } else {
      const message =
        error instanceof Error ? error.message : "Unexpected server error";

      throw new InternalServerError(message);
    }
  }
};

export default authGuard;
