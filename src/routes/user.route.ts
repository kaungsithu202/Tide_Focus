import { Router } from "express";
import authGuard from "../middleware/authGuard";
import { user } from "../controllers/user.controller";

const router = Router();

// router.get("/", authGuard, roleGuard([Role.ADMIN, Role.USER]), user);

router.get("/", authGuard, user);

export default router;
