import express, { Router } from "express";
import authGuard from "../middleware/authGuard.ts";
import roleGuard from "../middleware/authorize.ts";
import { Role } from "../service/auth.service.ts";
import { admin } from "../controllers/admin.controller.ts";

const router = Router();

router.get("/", authGuard, roleGuard([Role.ADMIN]), admin);

export default router;
