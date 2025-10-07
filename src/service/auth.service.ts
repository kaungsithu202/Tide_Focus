import prisma from "../config/db.ts";
import bcrypt from "bcryptjs";
import NodeCache from "node-cache";
import jwt from "jsonwebtoken";
import BadRequestError from "../errors/BadRequestError.ts";
import { authenticator } from "otplib";
import UnauthorizedError from "../errors/UnauthorizedError.ts";
import { Request } from "express";
import QRCode from "qrcode";

export const Role = {
  ADMIN: "ADMIN",
  USER: "USER",
};

export type Role = (typeof Role)[keyof typeof Role];

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "USER";
}

interface LoginInput {
  email: string;
  password: string;
}

interface ChangePassword {
  userId: number;
  currentPassword: string;
  newPassword: string;
  totp: string;
}

interface TwoFaLogin {
  tempToken: string;
  totp: string;
}

interface DisableTwoFaLogin {
  userId: number;
  currentPassword: string;
  totp: string;
}

interface RefreshTokenPayload extends jwt.JwtPayload {
  userId: number;
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

  return {
    message: "User registered successfully",
    userId: user.id,
  };
}

export async function loginService({ email, password }: LoginInput) {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new Error("Email or password is invalid.");
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatch) {
    throw new Error("Email or password is invalid.");
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
  const userId = cache.get(
    process.env.CACHE_TEMPORARY_TOKEN_PREFIX + tempToken
  );

  if (!userId) {
    throw new UnauthorizedError(
      "The provided temporary token is incorrect or expired"
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId as number,
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

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      accessToken,
      refreshToken,
      twoFaEnable: user.twoFAEnable,
    };
  }
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

export async function generateTwoFaService({ userId }: { userId: number }) {
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
  userId: number;
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
