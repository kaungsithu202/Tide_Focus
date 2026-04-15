import { Request, Response } from "express";
import { wrapAsync } from "../util/util";
import {
  changePasswordService,
  disableTwoFaService,
  forgotPasswordService,
  generateTwoFaService,
  loginService,
  logoutService,
  refreshTokenService,
  registerService,
  resetPasswordService,
  twoFaLoginService,
  validateTwoFaService,
} from "../service/auth.service";
import BadRequestError from "../errors/BadRequestError";
import UnauthorizedError from "../errors/UnauthorizedError";

const getRefreshTokenCookieOptions = (req: Request) => {
  const isSecureCookie =
    req.secure ||
    req.get("x-forwarded-proto") === "https" ||
    process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: isSecureCookie ? ("none" as const) : ("lax" as const),
  };
};

export const register = wrapAsync(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

  const result = await registerService({
    name,
    email,
    password,
    role,
  });

  res.cookie(
    "refreshToken",
    result.refreshToken,
    getRefreshTokenCookieOptions(req)
  );

  return res.status(201).json(result);
});

export const login = wrapAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new BadRequestError("Please fill all fields");
  }

  const result = await loginService({ email, password });

  if ("refreshToken" in result) {
    res.cookie(
      "refreshToken",
      result.refreshToken,
      getRefreshTokenCookieOptions(req)
    );
  }

  return res.status(200).json(result);
});

export const setCookie = wrapAsync(async (req: Request, res: Response) => {
  res.cookie("myCookie", "myValue", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  return res.status(201).json();
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

  if (result && "refreshToken" in result) {
    res.cookie(
      "refreshToken",
      result.refreshToken,
      getRefreshTokenCookieOptions(req)
    );
  }

  return res.status(200).json(result);
});

export const logout = wrapAsync(async (req: Request, res: Response) => {
  await logoutService(req);

  res.clearCookie("refreshToken", getRefreshTokenCookieOptions(req));

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
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    throw new UnauthorizedError("Refresh token not found");
  }

  const result = await refreshTokenService({ refreshToken });

  // Set refresh token in HttpOnly cookie
  res.cookie(
    "refreshToken",
    result.refreshToken,
    getRefreshTokenCookieOptions(req)
  );

  return res.status(200).json(result);
});
export const logout4 = wrapAsync(async () => {});

export const forgotPassword = wrapAsync(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      throw new BadRequestError("Email is required");
    }

    await forgotPasswordService({ email });

    return res.status(200).json({
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  }
);

export const resetPassword = wrapAsync(
  async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw new BadRequestError("Token and new password are required");
    }

    const result = await resetPasswordService({ token, newPassword });

    res.clearCookie("refreshToken", getRefreshTokenCookieOptions(req));

    return res.status(200).json(result);
  }
);
