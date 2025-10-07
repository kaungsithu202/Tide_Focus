import type { JwtPayload } from "jsonwebtoken";

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
