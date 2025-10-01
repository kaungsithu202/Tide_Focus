import type { NextFunction, Request, Response } from "express";

export const errorWrapper =
    (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
        (req: Request, res: Response, next: NextFunction) => {
            fn(req, res, next).catch((error) => next(error));
        };
