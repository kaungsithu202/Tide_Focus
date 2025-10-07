import express, { Router } from "express";
import authGuard from "../middleware/authGuard.ts";
import roleGuard from "../middleware/authorize.ts";
import { Role } from "../service/auth.service.ts";
import { currentUser, user } from "../controllers/user.controller.ts";

const router = Router();

router.get("/", authGuard, roleGuard([Role.ADMIN, Role.USER]), user);

router.get("/current", authGuard, currentUser);

export default router;
