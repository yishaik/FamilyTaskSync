import { Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    userId: number;
    isAuthenticated: boolean;
    tempSecret?: string;
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.isAuthenticated) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

export const redirectIfAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.session.isAuthenticated) {
    return res.redirect("/");
  }
  next();
};
