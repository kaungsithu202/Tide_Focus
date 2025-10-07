import { Request, Response } from "express";
import { wrapAsync } from "../util/util.ts";

export const admin = wrapAsync(async (req: Request, res: Response) => {
  return res.status(200).json({ message: "Only admin can access" });
});
