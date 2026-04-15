import crypto from "crypto";
import prisma from "../config/db";
import bcrypt from "bcryptjs";
import NodeCache from "node-cache";
import jwt from "jsonwebtoken";
import BadRequestError from "../errors/BadRequestError";
import { authenticator } from "otplib";
import UnauthorizedError from "../errors/UnauthorizedError";
import { Request } from "express";
import QRCode from "qrcode";
import { sendPasswordResetEmail } from "../util/mail";

export const Role = {
  ADMIN: "ADMIN",
  USER: "USER",
};

export type Role = (typeof Role)[keyof typeof Role];

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: "ADMIN" | "USER";
}

interface LoginInput {
  email: string;
  password: string;
}

interface ChangePassword {
  userId: string;
  currentPassword: string;
  newPassword: string;
  totp: string;
}

interface TwoFaLogin {
  tempToken: string;
  totp: string;
}

interface DisableTwoFaLogin {
  userId: string;
  currentPassword: string;
  totp: string;
}

interface RefreshTokenPayload extends jwt.JwtPayload {
  userId: string;
}

const cache = new NodeCache();

export async function registerService({
  name,
  email,
  password,
  role,
}: RegisterInput) {
  if (!name || !email || !password) {
    throw new Error("Please fill all fields");
  }

  const isHasDuplicateEmail = await prisma.user.findUnique({
    where: { email },
  });

  if (isHasDuplicateEmail) {
    throw new Error("Email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: hashedPassword,
      role: role || "USER",
      twoFAEnable: false,
      twoFASecret: null,
    },
  });

  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.ACCESS_TOKEN_SECRET_KEY!,
    {
      subject: "accessApi",
      expiresIn: process.env.ACCESS_TOKEN_EXPIRE_TIME as any,
    }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.REFRESH_TOKEN_SECRET_KEY!,
    {
      subject: "refreshToken",
      expiresIn: process.env.REFRESH_TOKEN_EXPIRE_TIME as any,
    }
  );

  return {
    message: "User registered successfully",
    id: user.id,
    accessToken,
    refreshToken,
  };
}

export async function loginService({ email, password }: LoginInput) {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new BadRequestError("Email or password is invalid.");
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatch) {
    throw new BadRequestError("Email or password is invalid.");
  }

  if (user.twoFAEnable) {
    const tempToken = crypto.randomUUID();

    cache.set(
      process.env.CACHE_TEMPORARY_TOKEN_PREFIX + tempToken,
      user.id,
      process.env.CACHE_TEMPORARY_TOKEN_EXPIRES_IN_SECONDS!
    );

    return {
      tempToken,
      expiresInSeconds: Number(
        process.env.CACHE_TEMPORARY_TOKEN_EXPIRES_IN_SECONDS!
      ),
    };
  }

  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.ACCESS_TOKEN_SECRET_KEY!,
    {
      subject: "accessApi",
      expiresIn: process.env.ACCESS_TOKEN_EXPIRE_TIME as any,
    }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.REFRESH_TOKEN_SECRET_KEY!,
    {
      subject: "refreshToken",
      expiresIn: process.env.REFRESH_TOKEN_EXPIRE_TIME as any,
    }
  );

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      refreshToken,
    },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    accessToken,
    refreshToken,
    twoFaEnable: user.twoFAEnable,
  };
}

export async function changePasswordService({
  userId,
  currentPassword,
  newPassword,
  totp,
}: ChangePassword) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new BadRequestError("User not found");
  }

  const passwordMatch = await bcrypt.compare(
    currentPassword,
    user.passwordHash
  );

  if (!passwordMatch) {
    throw new BadRequestError("Current password does not match");
  }

  if (user.twoFAEnable && user.twoFASecret) {
    const verified = authenticator.check(totp, user.twoFASecret);

    if (!verified) {
      throw new UnauthorizedError("The provided TOTP is incorrect or expired");
    }

    const isSameAsCurrent = await bcrypt.compare(
      newPassword,
      user.passwordHash
    );

    if (isSameAsCurrent) {
      throw new BadRequestError(
        "New password cannot be the same as current password"
      );
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        passwordHash: newHashedPassword,
        passwordChangedAt: new Date(),
      },
    });
  }

  return { message: "Password updated successfully" };
}

export async function twoFaLoginService({ tempToken, totp }: TwoFaLogin) {
  const cacheKey = process.env.CACHE_TEMPORARY_TOKEN_PREFIX + tempToken;
  const userId = cache.get(
    cacheKey
  );

  if (!userId) {
    throw new UnauthorizedError(
      "The provided temporary token is incorrect or expired"
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId as string,
    },
  });

  if (user?.twoFASecret) {
    const verified = authenticator.check(totp, user.twoFASecret);

    if (!verified) {
      throw new UnauthorizedError(
        "The provided temporary token is incorrect or expired"
      );
    }

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.ACCESS_TOKEN_SECRET_KEY!,
      {
        subject: "accessApi",
        expiresIn: process.env.ACCESS_TOKEN_EXPIRE_TIME as any,
      }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.REFRESH_TOKEN_SECRET_KEY!,
      {
        subject: "refreshToken",
        expiresIn: process.env.REFRESH_TOKEN_EXPIRE_TIME as any,
      }
    );

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        refreshToken,
      },
    });

    cache.del(cacheKey);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      accessToken,
      refreshToken,
      twoFaEnable: user.twoFAEnable,
    };
  }

  throw new UnauthorizedError("Two-factor authentication is not available");
}

export async function logoutService(req: Request) {
  // *only logout current device

  // const { refreshToken } = req.body;

  // await prisma.refreshToken.delete({
  //   where: {
  //     refreshToken,
  //   },
  // });

  await prisma.refreshToken.deleteMany({
    where: {
      userId: req.user.id,
    },
  });

  await prisma.userInvalidToken.create({
    data: {
      accessToken: req.accessToken.value,
      userId: req.user.id,
      expirationTime: req.accessToken.exp as any,
    },
  });
}

export async function generateTwoFaService({ userId }: { userId: string }) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  const secret = authenticator.generateSecret();

  const uri = authenticator.keyuri(
    user?.email as string,
    "tideFocus.io",
    secret
  );

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      twoFASecret: secret,
    },
  });

  return await QRCode.toBuffer(uri, { width: 300 });
}

export async function validateTwoFaService({
  userId,
  totp,
}: {
  userId: string;
  totp: string;
}) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (user?.twoFASecret) {
    const verified = authenticator.check(totp, user?.twoFASecret);

    if (!verified) {
      throw new BadRequestError("TOTP is not correct or expired");
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFAEnable: true,
      },
    });

    return { message: "TOTP validated successfully" };
  } else {
    throw new BadRequestError("Two FA Secret required");
  }
}

export async function disableTwoFaService({
  userId,
  currentPassword,
  totp,
}: DisableTwoFaLogin) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new BadRequestError("User not found");
  }

  const passwordMatch = await bcrypt.compare(
    currentPassword,
    user.passwordHash
  );

  if (!passwordMatch) throw new BadRequestError("Incorrect password");

  if (user?.twoFASecret) {
    const verified = authenticator.check(totp, user?.twoFASecret);

    if (!verified) {
      throw new BadRequestError("TOTP is not correct or expired");
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFAEnable: false,
      twoFASecret: null,
    },
  });

  return { message: "2FA disabled successfully" };
}

export async function forgotPasswordService({ email }: { email: string }) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return;
  }

  const RESET_TOKEN_TTL = Number(
    process.env.RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS ?? "1800"
  );

  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id },
  });

  const rawToken = crypto.randomUUID();
  const tokenHash = crypto
    .createHmac("sha256", process.env.RESET_TOKEN_SECRET_KEY!)
    .update(rawToken)
    .digest("hex");

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL * 1000),
    },
  });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;

  await sendPasswordResetEmail({ to: user.email, resetUrl });
}

export async function resetPasswordService({
  token,
  newPassword,
}: {
  token: string;
  newPassword: string;
}) {
  if (!newPassword || newPassword.length < 8) {
    throw new BadRequestError(
      "Password must be at least 8 characters"
    );
  }

  const tokens = await prisma.passwordResetToken.findMany({
    where: {
      expiresAt: { gt: new Date() },
    },
  });

  const incomingHash = crypto
    .createHmac("sha256", process.env.RESET_TOKEN_SECRET_KEY!)
    .update(token)
    .digest("hex");

    

  const validToken = tokens.find((t) => t.usedAt === null && t.tokenHash === incomingHash) ?? null;

  if (!validToken) {
    throw new BadRequestError("Invalid or expired reset token");
  }

  const user = await prisma.user.findUnique({
    where: { id: validToken.userId },
  });

  if (!user) {
    throw new BadRequestError("User not found");
  }

  const sameAsCurrent = await bcrypt.compare(newPassword, user.passwordHash);
  if (sameAsCurrent) {
    throw new BadRequestError(
      "New password cannot be the same as your current password"
    );
  }

  const newHash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        passwordChangedAt: new Date(),
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: validToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    }),
  ]);

  return { message: "Password reset successfully" };
}

export async function refreshTokenService({
  refreshToken,
}: {
  refreshToken: string;
}) {
  const decodeRefreshToken = jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET_KEY!
  ) as RefreshTokenPayload;

  const userRefreshToken = await prisma.refreshToken.findFirst({
    where: {
      refreshToken: refreshToken,
      userId: decodeRefreshToken.userId,
    },
  });

  if (!userRefreshToken) {
    throw new UnauthorizedError("Refresh token not found");
  }

  await prisma.refreshToken.delete({
    where: { id: userRefreshToken.id },
  });

  const accessToken = jwt.sign(
    { userId: decodeRefreshToken.userId, role: decodeRefreshToken.role },
    process.env.ACCESS_TOKEN_SECRET_KEY!,
    {
      subject: "accessApi",
      expiresIn: process.env.ACCESS_TOKEN_EXPIRE_TIME as any,
    }
  );

  const newRefreshToken = jwt.sign(
    { userId: decodeRefreshToken.userId, role: decodeRefreshToken.role },
    process.env.REFRESH_TOKEN_SECRET_KEY!,
    {
      subject: "refreshToken",
      expiresIn: process.env.REFRESH_TOKEN_EXPIRE_TIME as any,
    }
  );

  await prisma.refreshToken.create({
    data: {
      userId: decodeRefreshToken.userId,
      refreshToken: newRefreshToken,
    },
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
}
