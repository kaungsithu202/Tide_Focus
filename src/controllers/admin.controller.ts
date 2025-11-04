import { Request, Response } from "express";
import { wrapAsync } from "../util/util";

export const admin = wrapAsync(async (req: Request, res: Response) => {
  return res.status(200).json({ message: "Only admin can access" });
});
