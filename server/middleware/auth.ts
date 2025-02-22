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
    // If it's an API request, return 401
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ message: "Authentication required" });
    }
    // For page requests, redirect to login
    return res.redirect('/login');
  }
  next();
};

export const redirectIfAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.session.isAuthenticated) {
    // If it's an API request, return 200
    if (req.path.startsWith('/api/')) {
      return res.status(200).json({ authenticated: true });
    }
    // For page requests, redirect to home
    return res.redirect('/');
  }
  next();
};