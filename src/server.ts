import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "../generated/prisma/index.js";
import { errorWrapper } from "./wrappers/index.ts";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import crypto from "crypto";
import NodeCache from "node-cache";

interface AccessTokenPayload extends jwt.JwtPayload {
  userId: number;
}

interface RefreshTokenPayload extends jwt.JwtPayload {
  userId: number;
}

export const Role = {
  ADMIN: "ADMIN",
  USER: "USER",
};

export type Role = (typeof Role)[keyof typeof Role];

const prisma = new PrismaClient();

const cache = new NodeCache();

const app = express();

dotenv.config();

const port = 3000;

async function main() {}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

app.use(express.json());

const authGuard = async (req: Request, res: Response, next: NextFunction) => {
  const accessToken = req.headers.authorization;

  if (!accessToken) {
    return res.status(401).json({ message: "Access token not found" });
  }

  const invalidToken = await prisma.userInvalidToken.findFirst({
    where: {
      accessToken,
    },
  });

  if (invalidToken) {
    return res
      .status(401)
      .json({ message: "Access token invalid", code: "AccessTokenInvalid" });
  }
  try {
    const decodedAccessToken = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET_KEY
    ) as AccessTokenPayload;

    req.user = { id: decodedAccessToken.userId };
    req.accessToken = { value: accessToken, exp: decodedAccessToken?.iat };

    next();
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        message: "Access token expired",
        code: "AccessTokenExpired",
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        message: "Access token invalid",
        code: "AccessTokenInvalid",
      });
    } else {
      const message =
        error instanceof Error ? error.message : "Unexpected server error";

      return res.status(500).json({ message });
    }
  }
};

const authorize = (roles: Role[] = []) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user?.id,
      },
    });

    console.log("user", user, roles);

    if (!user || !roles.includes(user.role as Role)) {
      return res.status(403).json({ message: "Access Denied" });
    }

    next();
  };
};

app.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name && !email && !password) {
      return res.status(422).json({ message: "Please fill all fields" });
    }

    const isHasDuplicateEmail = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (isHasDuplicateEmail) {
      return res.status(409).json({ message: "Email already exist." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role: role ?? "USER",
        twoFAEnable: false,
        twoFASecret: null,
      },
    });

    return res
      .status(201)
      .json({ message: "User Register Successfully.", userId: user.id });
  } catch (err) {
    if (err instanceof Error)
      return res.status(500).json({ message: err.message });
  }
});

app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(422).json({ message: "Please fill all fields" });
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(401).json({ message: "Email or password is invalid." });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Email or password is invalid." });
    }

    if (user.twoFAEnable) {
      const tempToken = crypto.randomUUID();

      cache.set(
        process.env.CACHE_TEMPORARY_TOKEN_PREFIX + tempToken,
        user.id,
        process.env.CACHE_TEMPORARY_TOKEN_EXPIRES_IN_SECONDS
      );

      return res.status(200).json({
        tempToken,
        expiresInSeconds: process.env.CACHE_TEMPORARY_TOKEN_EXPIRES_IN_SECONDS,
      });
    } else {
      const accessToken = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.ACCESS_TOKEN_SECRET_KEY,
        {
          subject: "accessApi",
          expiresIn: process.env.ACCESS_TOKEN_EXPIRE_TIME as any,
        }
      );

      const refreshToken = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.REFRESH_TOKEN_SECRET_KEY,
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

      return res.status(200).json({
        id: user.id,
        name: user.name,
        email: user.email,
        accessToken,
        refreshToken,
        twoFaEnable: user.twoFAEnable,
      });
    }
  } catch (err) {
    if (err instanceof Error)
      return res.status(500).json({ message: err.message });
  }
});

app.post(
  "/api/auth/change-password",
  authGuard,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(422).json({
          message: "Both currentPassword and newPassword are required",
        });
      }

      console.log("change-pass", currentPassword, newPassword);

      const user = await prisma.user.findUnique({
        where: {
          id: req.user.id,
        },
      });

      if (user) {
        const passwordMatch = await bcrypt.compare(
          currentPassword,
          user.passwordHash
        );

        if (!passwordMatch) {
          return res.status(400).json({
            message: "Current password does not match",
          });
        }

        const isSameAsCurrent = await bcrypt.compare(
          newPassword,
          user.passwordHash
        );

        if (isSameAsCurrent) {
          return res.status(400).json({
            message: "New password cannot be the same as current password",
          });
        }

        const newHashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
          where: {
            id: req.user.id,
          },
          data: {
            passwordHash: newHashedPassword,
            passwordChangedAt: new Date(),
          },
        });

        return res
          .status(200)
          .json({ message: "Password updated successfully" });
      }
    } catch (err) {
      if (err instanceof Error)
        return res.status(500).json({ message: err.message });
    }
  }
);

app.post(
  "/api/auth/login/2fa",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tempToken, totp } = req.body;

      if (!tempToken || !totp) {
        return res
          .status(422)
          .json({ message: "Please fill in all fields (tempToken and totp)" });
      }

      const userId = cache.get(
        process.env.CACHE_TEMPORARY_TOKEN_PREFIX + tempToken
      );

      if (!userId) {
        return res.status(401).json({
          message: "The provided temporary token is incorrect or expired",
        });
      }

      const user = await prisma.user.findUnique({
        where: {
          id: userId as number,
        },
      });

      if (user?.twoFASecret) {
        const verified = authenticator.check(totp, user.twoFASecret);

        if (!verified) {
          return res
            .status(401)
            .json({ message: "The provided TOTP is incorrect or expired" });
        }

        const accessToken = jwt.sign(
          { userId: user.id, role: user.role },
          process.env.ACCESS_TOKEN_SECRET_KEY,
          {
            subject: "accessApi",
            expiresIn: process.env.ACCESS_TOKEN_EXPIRE_TIME as any,
          }
        );

        const refreshToken = jwt.sign(
          { userId: user.id, role: user.role },
          process.env.REFRESH_TOKEN_SECRET_KEY,
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

        return res.status(200).json({
          id: user.id,
          name: user.name,
          email: user.email,
          accessToken,
          refreshToken,
          twoFaEnable: user.twoFAEnable,
        });
      }
    } catch (err) {
      if (err instanceof Error)
        return res.status(500).json({ message: err.message });
    }
  }
);

app.get(
  "/api/auth/logout",
  authGuard,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // only logout current device

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

      return res.status(204).send();
    } catch (err: unknown) {
      if (err instanceof Error) {
        return res.status(500).json({ message: err.message });
      }
    }
  }
);

app.get(
  "/api/auth/2fa/generate",
  authGuard,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: {
          id: req.user.id,
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
          id: req.user.id,
        },
        data: {
          twoFASecret: secret,
        },
      });

      const qrCode = await QRCode.toBuffer(uri, { width: 300 });

      res.setHeader("Content-Disposition", "attachment; filename=qrcode.png");

      return res.status(200).type("image/png").send(qrCode);
    } catch (err: unknown) {
      if (err instanceof Error)
        return res.status(500).json({ message: err.message });
    }
  }
);

interface TotpRequest extends Request {
  body: {
    totp: string;
  };
}

app.post(
  "/api/auth/2fa/validate",
  authGuard,
  async (req: TotpRequest, res: Response, next: NextFunction) => {
    try {
      const { totp } = req.body;

      // Time-base One Time Password

      if (!totp) {
        return res.status(422).json({ message: "TOTP is required" });
      }

      const user = await prisma.user.findUnique({
        where: {
          id: req.user.id,
        },
      });

      if (user?.twoFASecret) {
        const verified = authenticator.check(totp, user?.twoFASecret);

        if (!verified) {
          return res
            .status(400)
            .json({ message: "TOTP is not correct or expired" });
        }

        await prisma.user.update({
          where: { id: req.user.id },
          data: {
            twoFAEnable: true,
          },
        });

        return res.status(200).json({ message: "TOTP validated successfully" });
      } else {
        return res.status(400).json({ message: "Two FA Secret required" });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        return res.status(500).json({ message: err.message });
      }
    }
  }
);

app.post(
  "/api/auth/2fa/disable",
  authGuard,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, totp } = req.body;

      if (!currentPassword || !totp) {
        return res
          .status(422)
          .json({ message: "Both current password and totp required" });
      }

      const user = await prisma.user.findUnique({
        where: {
          id: req.user.id,
        },
      });

      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      const passwordMatch = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );

      if (!passwordMatch)
        return res.status(400).json({ message: "Incorrect password" });

      if (user?.twoFASecret) {
        const verified = authenticator.check(totp, user?.twoFASecret);

        if (!verified) {
          return res
            .status(400)
            .json({ message: "TOTP is not correct or expired" });
        }
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFAEnable: false,
          twoFASecret: null,
        },
      });

      return res.status(200).json({ message: "2FA disabled successfully" });
    } catch (err) {
      if (err instanceof Error) {
        return res.status(500).json({ message: err.message });
      }
    }
  }
);

app.post(
  "/api/auth/refresh-token",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({ message: "Refresh token not found" });
      }

      const decodeRefreshToken = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET_KEY
      ) as RefreshTokenPayload;

      const userRefreshToken = await prisma.refreshToken.findFirst({
        where: {
          refreshToken: refreshToken,
          userId: decodeRefreshToken.userId,
        },
      });

      if (!userRefreshToken) {
        return res.status(401).json({ message: "Refresh token not found" });
      }

      await prisma.refreshToken.delete({
        where: { id: userRefreshToken.id },
      });

      const accessToken = jwt.sign(
        { userId: decodeRefreshToken.userId, role: decodeRefreshToken.role },
        process.env.ACCESS_TOKEN_SECRET_KEY,
        {
          subject: "accessApi",
          expiresIn: process.env.ACCESS_TOKEN_EXPIRE_TIME as any,
        }
      );

      const newRefreshToken = jwt.sign(
        { userId: decodeRefreshToken.userId, role: decodeRefreshToken.role },
        process.env.REFRESH_TOKEN_SECRET_KEY,
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

      return res.status(200).json({
        accessToken,
        refreshToken: newRefreshToken,
      });
    } catch (err: unknown) {
      if (
        err instanceof jwt.TokenExpiredError ||
        err instanceof jwt.JsonWebTokenError
      ) {
        return res
          .status(401)
          .json({ message: "Refresh token invalid or expired" });
      }
      if (err instanceof Error) {
        return res.status(500).json({ message: err.message });
      }
    }
  }
);

app.get(
  "/api/user/current",
  authGuard,
  errorWrapper(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req?.user?.id },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res
      .status(200)
      .json({ id: user.id, name: user.name, email: user.email });
  })
);

app.get(
  "/api/admin",
  authGuard,
  authorize([Role.ADMIN]),
  errorWrapper(async (req: Request, res: Response) => {
    return res.status(200).json({ message: "Only admin can access" });
  })
);

app.get(
  "/api/user",
  authGuard,
  authorize([Role.ADMIN, Role.USER]),
  errorWrapper(async (req: Request, res: Response) => {
    return res.status(200).json({ message: "Only admin and user can access" });
  })
);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
