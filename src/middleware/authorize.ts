import { NextFunction, Request, Response } from "express";
import prisma from "../config/db";

export const Role = {
  ADMIN: "ADMIN",
  USER: "USER",
};

export type Role = (typeof Role)[keyof typeof Role];

const roleGuard = (roles: Role[] = []) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user?.id,
      },
    });

    if (!user || !roles.includes(user.role as Role)) {
      return res.status(403).json({ message: "Access Denied" });
    }

    next();
  };
};

export default roleGuard;
