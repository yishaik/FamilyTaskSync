import { Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    userId: number;
    isAuthenticated: boolean;
    tempSecret?: string;
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // For API requests, always respond with JSON
  if (req.path.startsWith('/api/')) {
    if (!req.session.isAuthenticated) {
      return res.status(401).json({ 
        message: "Authentication required",
        redirect: '/login'
      });
    }
    return next();
  }

  // For page requests, redirect to login
  if (!req.session.isAuthenticated) {
    return res.redirect('/login');
  }
  next();
};

export const redirectIfAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  // Check both userId and isAuthenticated flag
  if (req.session.isAuthenticated && req.session.userId) {
    // If it's an API request, return 200 with JSON
    if (req.path.startsWith('/api/')) {
      return res.status(200).json({ 
        authenticated: true,
        redirect: '/'
      });
    }
    // For page requests, redirect to home
    return res.redirect('/');
  }
  next();
};

// Helper to save session as Promise
export const saveSession = (req: Request): Promise<void> => {
  return new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};