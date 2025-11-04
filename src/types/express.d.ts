import type { JwtPayload } from "jsonwebtoken";
import * as express from 'express';

declare global {
  namespace Express {
    interface UserPayload extends JwtPayload {
      userId: number;
    }

    interface Request {
      user: {
        id: number;
      };
      accessToken: {
        value: string;
        exp: number | undefined;
      };
    }
  }
}
