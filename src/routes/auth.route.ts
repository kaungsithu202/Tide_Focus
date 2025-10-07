import express, { Router } from "express";
import {
  changePassword,
  disableTwoFa,
  generateTwoFa,
  login,
  logout,
  refreshToken,
  register,
  twoFaLogin,
} from "../controllers/auth.controller.ts";
import authGuard from "../middleware/authGuard.ts";

const router = Router();

router.post("/register", register);

router.post("/login", login);

router.post("/change-password", changePassword);

router.post("/login/2fa", twoFaLogin);

router.post("/logout", authGuard, logout);

router.post("/2fa/generate", authGuard, generateTwoFa);

router.post("/2fa/disable", authGuard, disableTwoFa);

router.post("/refresh-token", authGuard, refreshToken);

export default router;
