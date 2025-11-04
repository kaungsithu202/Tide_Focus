import express, { Router } from "express";
import authGuard from "../middleware/authGuard";
import roleGuard from "../middleware/authorize";
import { Role } from "../service/auth.service";
import { admin } from "../controllers/admin.controller";

const router = Router();

router.get("/", authGuard, roleGuard([Role.ADMIN]), admin);

export default router;
