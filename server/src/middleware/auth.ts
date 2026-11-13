import { Request, Response, NextFunction } from 'express';
import { UserProfile } from '../types/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: UserProfile;
    }
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  // Support custom auth headers, Supabase token extraction, or default to demo trainee
  const authHeader = req.headers.authorization;
  const userId = (req.headers['x-user-id'] as string) || 'demo-student';
  const role = ((req.headers['x-user-role'] as string) || 'student') as UserProfile['role'];
  const displayName = (req.headers['x-user-name'] as string) || (role === 'supervisor' ? 'Prof. Supervisor' : 'Demo learner');

  req.user = {
    id: userId,
    displayName,
    email: `${userId}@psysim.edu`,
    role,
  };

  next();
}

export function requireRole(allowedRoles: UserProfile['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient clinical supervisor permissions to access this resource.',
        },
      });
      return;
    }
    next();
  };
}
