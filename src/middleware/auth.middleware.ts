import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config/env';
import { logger } from '@/utils/logger';

export interface AuthenticatedUser {
    userId: string;
    email: string;
    role: 'guest' | 'merchant' | 'customer' | 'admin';
    merchantId?: string;
    iat?: number;
    exp?: number;
}

export interface AuthRequest extends Request {
    user?: AuthenticatedUser;
}

/**
 * Authentication middleware - validates JWT token
 * Allows both authenticated and unauthenticated (guest) access
 */
export const authMiddleware = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            // Allow guest access - optional authentication
            return next();
        }
        const decoded = jwt.verify(token, config.jwtSecret as string) as AuthenticatedUser;
        req.user = decoded;
        next();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn('Invalid token', { error: errorMessage });
        // Invalid token - still allow guest access for testing
        next();
    }
};

/**
 * Strict authentication middleware - requires valid token
 */
export const requireAuth = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            res.status(401).json({ success: false, error: 'No token provided' });
            return;
        }
        const decoded = jwt.verify(token, config.jwtSecret as string) as AuthenticatedUser;
        req.user = decoded;
        next();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn('Token verification failed', { error: errorMessage });
        res.status(401).json({ success: false, error: 'Invalid token' });
    }
};

/**
 * Require user to be a merchant
 */
export const requireMerchant = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void => {
    requireAuth(req, res, () => {
        if (!req.user || req.user.role !== 'merchant') {
            res.status(403).json({ success: false, error: 'Only merchants can access this' });
            return;
        }
        next();
    });
};

/**
 * Require user to be a customer
 */
export const requireCustomer = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void => {
    requireAuth(req, res, () => {
        if (!req.user || (req.user.role !== 'customer' && req.user.role !== 'guest')) {
            res.status(403).json({ success: false, error: 'Only customers can access this' });
            return;
        }
        next();
    });
};

export default authMiddleware;
