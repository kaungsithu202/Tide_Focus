import { Router } from "express";
import authGuard from "../middleware/authGuard";
import {
  completedSession,
  deleteSession,
  getAllSessions,
  pauseSession,
  resumeSession,
  startSession,
} from "../controllers/session.controller";

const route = Router();

route.post("/", authGuard, startSession);
route.get("/", authGuard, getAllSessions);
route.post("/:id/pause", authGuard, pauseSession);
route.post("/:id/resume", authGuard, resumeSession);
route.post("/:id/complete", authGuard, completedSession);
route.delete("/:id", authGuard, deleteSession);

export default route;
