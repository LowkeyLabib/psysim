import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/index.js';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  // Support custom dev headers or default to medical student persona
  const userId = (req.headers['x-user-id'] as string) || 'usr_student_demo';
  const role = ((req.headers['x-user-role'] as string) || 'student') as UserRole;
  const name = (req.headers['x-user-name'] as string) || 'Dr. Student (Trainee)';

  req.user = {
    id: userId,
    name,
    email: `${userId}@psysim.edu`,
    role,
  };

  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Insufficient clinical supervisor permissions to access this resource.',
      });
      return;
    }
    next();
  };
}
