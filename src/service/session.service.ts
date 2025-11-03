import prisma from "../config/db";
import BadRequestError from "../errors/BadRequestError";
import EntityNotFoundError from "../errors/EntityNotFoundError";
import { GetAllSessionService } from "../types/session";

export const startSessionService = async ({
  userId,
  categoryId,
  durationSeconds,
  type,
}: {
  userId: number;
  categoryId: number;
  durationSeconds: number;
  type: "stopwatch" | "timer";
}) => {
  const category = await prisma.category.findUnique({
    where: {
      id: categoryId,
    },
  });

  if (!category) {
    throw new EntityNotFoundError("CategoryId is not valid.");
  }

  return await prisma.session.create({
    data: {
      categoryId,
      ...(type === "timer" && { durationSeconds }),
      type,
      userId,
    },
  });
};

export const getAllSessionsService = async ({
  startDate,
  endDate,
  userId,
}: GetAllSessionService) => {
  console.log("trigger", userId);
  const whereClause: any = {
    isCompleted: true,
  };

  if (startDate && endDate) {
    whereClause.createdAt = {
      gte: startDate,
      lte: endDate,
    };
  } else {
    whereClause.userId = userId;
  }

  return await prisma.session.findMany({
    where: whereClause,
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      elapsedSeconds: true,
      isCompleted: true,
      type: true,
      category: {
        select: {
          name: true,
          id: true,
          color: true,
        },
      },
    },
  });
};

export const pauseSessionService = async ({ id }: { id: number }) => {
  const session = await prisma.session.findUnique({
    where: { id },
  });

  if (!session) throw new EntityNotFoundError("Session not found!");

  if (session.isCompleted)
    throw new BadRequestError("Session already completed");

  const now = new Date();

  const elapsedSeconds =
    Math.floor((now.getTime() - session.startedAt.getTime()) / 1000) -
    session.totalPausedSeconds;

  const updated = await prisma.session.update({
    where: { id },
    data: {
      elapsedSeconds,
      pausedAt: now,
    },
  });

  return updated;
};

export const resumeSessionService = async ({ id }: { id: number }) => {
  const session = await prisma.session.findUnique({
    where: { id },
  });

  if (!session) throw new EntityNotFoundError("Session not found!");

  if (!session.pausedAt) throw new BadRequestError("Session is not paused");

  const now = new Date();

  const pausedDuration = Math.floor(
    (now.getTime() - session.pausedAt.getTime()) / 1000
  );

  const updated = await prisma.session.update({
    where: { id },
    data: {
      totalPausedSeconds: session.totalPausedSeconds + pausedDuration,
      pausedAt: null,
    },
  });

  return updated;
};

export const completedSessionService = async ({ id }: { id: number }) => {
  const session = await prisma.session.findUnique({
    where: { id },
  });

  if (!session) throw new EntityNotFoundError("Session not found!");

  if (session.isCompleted)
    throw new BadRequestError("Session already completed");

  const now = new Date();

  let elapsed = Math.floor(
    (now.getTime() - session.startedAt.getTime()) / 1000
  );

  if (session.pausedAt) {
    // If session is paused, subtract pause time up to now
    elapsed -= Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000);
  }

  elapsed -= session.totalPausedSeconds;

  const updated = await prisma.session.update({
    where: { id },
    data: {
      elapsedSeconds: elapsed,
      endedAt: now,
      isCompleted: true,
      pausedAt: null, // clear paused state
    },
  });

  return updated;
};

export const deleteSessionService = async ({ id }: { id: number }) => {
  const session = await prisma.session.findUnique({
    where: { id },
  });

  if (!session) throw new EntityNotFoundError("Session not found!");

  return await prisma.session.delete({
    where: { id },
  });
};
