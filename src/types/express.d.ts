import type { JwtPayload } from "jsonwebtoken";
import * as express from 'express'

declare global {
  namespace Express {
    interface UserPayload extends JwtPayload {
      userId: string;
    }

    interface Request {
      user: {
        id: string;
      };
      accessToken: {
        value: string;
        exp: number | undefined;
      };
    }
  }
}
