import { Request, Response, NextFunction } from 'express';
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
export declare const authMiddleware: (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Strict authentication middleware - requires valid token
 */
export declare const requireAuth: (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Require user to be a merchant
 */
export declare const requireMerchant: (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Require user to be a customer
 */
export declare const requireCustomer: (req: AuthRequest, res: Response, next: NextFunction) => void;
export default authMiddleware;
//# sourceMappingURL=auth.middleware.d.ts.map