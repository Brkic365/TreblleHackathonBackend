// src/middleware/auth.middleware.ts

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { CustomJwtPayload } from '../types/jwt.js'; // Import our custom payload type

/**
 * Middleware to authenticate requests using a JWT.
 * It verifies the token from the 'Authorization' header and attaches the
 * decoded user payload to the request object for use in subsequent handlers.
 * 
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @param next - The next middleware function.
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1]; // Use optional chaining for safety

    if (!token) {
        // Use return to ensure no further code is executed
        res.status(401).json({ error: 'Unauthorized: No token provided.' });
        return;
    }

    jwt.verify(token, process.env['JWT_SECRET'] as string, (err, decodedPayload) => {
        if (err) {
            // Handle specific JWT errors for better client feedback
            if (err.name === 'TokenExpiredError') {
                res.status(403).json({ error: 'Forbidden: Token has expired.' });
            } else {
                res.status(403).json({ error: 'Forbidden: Invalid token.' });
            }
            return;
        }

        // Now, TypeScript knows decodedPayload could be an object or a string.
        // We need to validate its shape.
        if (typeof decodedPayload === 'object' && decodedPayload !== null && 'userId' in decodedPayload) {
            // We have validated the payload, so we can cast it to our custom type.
            req.user = decodedPayload as CustomJwtPayload;
            next();
        } else {
            // This case handles a malformed token that was technically valid but lacks our data.
            res.status(403).json({ error: 'Forbidden: Malformed token payload.' });
        }
    });
};