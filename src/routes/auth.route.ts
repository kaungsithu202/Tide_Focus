import express, { Router } from "express";
import {
  changePassword,
  disableTwoFa,
  forgotPassword,
  generateTwoFa,
  login,
  logout,
  refreshToken,
  register,
  resetPassword,
  setCookie,
  twoFaLogin,
  validateTwoFa,
} from "../controllers/auth.controller";
import authGuard from "../middleware/authGuard";

const router = Router();

router.post("/register", register);

router.post("/login", login);

router.get("/set-cookie", setCookie);

router.post("/change-password", authGuard, changePassword);

router.post("/login/2fa", twoFaLogin);

router.post("/logout", authGuard, logout);

router.post("/2fa/generate", authGuard, generateTwoFa);

router.post("/2fa/validate", authGuard, validateTwoFa);

router.post("/2fa/disable", authGuard, disableTwoFa);

router.post("/refresh-token", refreshToken);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password", resetPassword);

export default router;
