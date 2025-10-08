import { Request, Response } from "express";
import BadRequestError from "../errors/BadRequestError";
import {
  completedSessionService,
  deleteSessionService,
  getAllSessionsService,
  pauseSessionService,
  startSessionService,
} from "../service/session.service";
import { wrapAsync } from "../util/util";

export const startSession = wrapAsync(async (req: Request, res: Response) => {
  const { categoryId, durationSeconds, type } = req.body;

  if (!categoryId || !type) {
    throw new BadRequestError("Please fill all fields categoryId  and type");
  }

  if (type === "timer" && !durationSeconds) {
    throw new BadRequestError(
      "For timer sessions, please provide durationSeconds."
    );
  }
  const result = await startSessionService({
    categoryId,
    type,
    durationSeconds,
    userId: req.user.id,
  });

  return res.status(200).json(result);
});

export const getAllSessions = wrapAsync(async (req: Request, res: Response) => {
  const result = await getAllSessionsService();

  return res.status(200).json(result);
});

export const pauseSession = wrapAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  const result = await pauseSessionService({ id });

  return res.status(200).json({ message: "Session paused", result });
});

export const resumeSession = wrapAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  const result = await pauseSessionService({ id });

  return res.status(200).json({ message: "Session resumed", result });
});

export const completedSession = wrapAsync(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    const result = await completedSessionService({ id });

    return res.status(200).json({ message: "Session completed", result });
  }
);

export const deleteSession = wrapAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  await deleteSessionService({ id });

  return res.status(204).json({ message: "Session deleted" });
});
