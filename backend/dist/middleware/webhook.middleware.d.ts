import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to verify webhook authenticity
 * Checks for valid signature from payment gateway
 */
export declare function verifyWebhookSignature(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=webhook.middleware.d.ts.map