import { Request, Response } from "express";
import { currentUserService } from "../service/user.service.ts";
import { wrapAsync } from "../util/util.ts";

export const currentUser = wrapAsync(async (req: Request, res: Response) => {
  const result = await currentUserService({ userId: req.user.id });

  return res.status(200).json(result);
});

export const user = wrapAsync(async (req: Request, res: Response) => {
  return res.status(200).json({ message: "Only admin and user can access" });
});
