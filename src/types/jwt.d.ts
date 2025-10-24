import { JwtPayload } from 'jsonwebtoken';
import { Request } from 'express';

// Extend the existing JwtPayload to include our custom 'userId' property
export interface CustomJwtPayload extends JwtPayload {
  userId: string;
}

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: CustomJwtPayload;
    }
  }
}