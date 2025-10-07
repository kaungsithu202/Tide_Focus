import { Request, Response } from "express";
import { wrapAsync } from "../util/util.ts";
import {
  changePasswordService,
  disableTwoFaService,
  generateTwoFaService,
  loginService,
  logoutService,
  refreshTokenService,
  registerService,
  twoFaLoginService,
  validateTwoFaService,
} from "../service/auth.service.ts";
import BadRequestError from "../errors/BadRequestError.ts";
import UnauthorizedError from "../errors/UnauthorizedError.ts";

export const register = wrapAsync(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

  const result = await registerService({
    name,
    email,
    password,
    role,
  });

  return res.status(201).json(result);
});

export const login = wrapAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(422).json({ message: "Please fill all fields" });
  }

  const result = await loginService({ email, password });

  return res.status(200).json(result);
});

export const changePassword = wrapAsync(async (req: Request, res: Response) => {
  const { currentPassword, newPassword, totp } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(422).json({
      message: "Both currentPassword and newPassword are required",
    });
  }
  const result = await changePasswordService({
    userId: req.user.id,
    currentPassword,
    newPassword,
    totp,
  });

  return res.status(200).json(result);
});

export const twoFaLogin = wrapAsync(async (req: Request, res: Response) => {
  const { tempToken, totp } = req.body;

  if (!tempToken || !totp) {
    throw new BadRequestError("Please fill in all fields (tempToken and totp)");
  }

  const result = await twoFaLoginService({ tempToken, totp });

  return res.status(200).json(result);
});

export const logout = wrapAsync(async (req: Request, res: Response) => {
  await logoutService(req);

  return res.status(204).send();
});

export const generateTwoFa = wrapAsync(async (req: Request, res: Response) => {
  const result = await generateTwoFaService({ userId: req.user.id });

  res.setHeader("Content-Disposition", "attachment; filename=qrcode.png");

  return res.status(200).type("image/png").send(result);
});

export const validateTwoFa = wrapAsync(async (req: Request, res: Response) => {
  const { totp } = req.body;
  if (!totp) {
    throw new BadRequestError("TOTP is required");
  }

  const result = await validateTwoFaService({ userId: req.user.id, totp });

  return res.status(200).json(result);
});

export const disableTwoFa = wrapAsync(async (req: Request, res: Response) => {
  const { currentPassword, totp } = req.body;

  if (!currentPassword || !totp) {
    throw new BadRequestError("Both current password and totp required");
  }

  const result = await disableTwoFaService({
    userId: req.user.id,
    totp,
    currentPassword,
  });

  return res.status(200).json(result);
});

export const refreshToken = wrapAsync(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new UnauthorizedError("Refresh token not found");
  }

  const result = await refreshTokenService({ refreshToken });

  return res.status(200).json(400);
});
export const logout4 = wrapAsync(async () => {});
