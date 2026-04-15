import { Request, Response } from "express";
import BadRequestError from "../errors/BadRequestError";
import {
  completedSessionService,
  deleteSessionService,
  getAllSessionsService,
  pauseSessionService,
  resumeSessionService,
  startSessionService,
} from "../service/session.service";
import { wrapAsync } from "../util/util";

const objectIdRegex = /^[a-f\d]{24}$/i;

const isValidObjectId = (value: string) => objectIdRegex.test(value);

const getParamValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const startSession = wrapAsync(async (req: Request, res: Response) => {
  const { categoryId, durationSeconds, type } = req.body;

  if (!categoryId || !type) {
    throw new BadRequestError("Please fill all fields categoryId  and type");
  }

  if (typeof categoryId !== "string" || !isValidObjectId(categoryId)) {
    throw new BadRequestError("Invalid categoryId");
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

interface SessionQuery {
  startDate?: string;
  endDate?: string;
}

export const getAllSessions = wrapAsync(
  async (req: Request<{}, {}, {}, SessionQuery>, res: Response) => {
    const { startDate, endDate } = req.query;

    const result = await getAllSessionsService({
      startDate,
      endDate,
      userId: req.user.id,
    });

    return res.status(200).json(result);
  }
);

export const pauseSession = wrapAsync(async (req: Request, res: Response) => {
  const id = getParamValue(req.params.id);

  if (!id || !isValidObjectId(id)) {
    throw new BadRequestError("Invalid session ID");
  }

  const result = await pauseSessionService({ id, userId: req.user.id });

  return res.status(200).json({ message: "Session paused", result });
});

export const resumeSession = wrapAsync(async (req: Request, res: Response) => {
  const id = getParamValue(req.params.id);

  if (!id || !isValidObjectId(id)) {
    throw new BadRequestError("Invalid session ID");
  }

  const result = await resumeSessionService({ id, userId: req.user.id });

  return res.status(200).json({ message: "Session resumed", result });
});

export const completedSession = wrapAsync(
  async (req: Request, res: Response) => {
    const id = getParamValue(req.params.id);

    if (!id || !isValidObjectId(id)) {
      throw new BadRequestError("Invalid session ID");
    }

    const result = await completedSessionService({ id, userId: req.user.id });

    return res.status(200).json({ message: "Session completed", result });
  }
);

export const deleteSession = wrapAsync(async (req: Request, res: Response) => {
  const id = getParamValue(req.params.id);

  if (!id || !isValidObjectId(id)) {
    throw new BadRequestError("Invalid session ID");
  }

  await deleteSessionService({ id, userId: req.user.id });

  return res.status(204).json({ message: "Session deleted" });
});
