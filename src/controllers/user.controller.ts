import { Request, Response } from "express";
import { userService } from "../service/user.service";
import { wrapAsync } from "../util/util";

export const user = wrapAsync(async (req: Request, res: Response) => {
  const result = await userService({ userId: req.user.id });

  return res.status(200).json(result);
});
