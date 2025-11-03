import { Router } from "express";
import authGuard from "../middleware/authGuard.ts";
import { user } from "../controllers/user.controller.ts";

const router = Router();

// router.get("/", authGuard, roleGuard([Role.ADMIN, Role.USER]), user);

router.get("/", authGuard, user);

export default router;
