import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '@/config/env';
import { logger } from '@/utils/logger';

/**
 * Middleware to verify webhook authenticity
 * Checks for valid signature from payment gateway
 */
export function verifyWebhookSignature(req: Request, res: Response, next: NextFunction): void {
  try {
    const receivedSignature = req.headers['x-signature'] as string;
    const payload = req.body;

    if (!receivedSignature) {
      logger.warn('Webhook missing signature header');
      res.status(400).json({ success: false, error: 'Missing signature' });
      return;  // ← Change from "return res.status(...)" to this
    }

    const message = JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', config.sabbpeWebhookSecret)
      .update(message)
      .digest('hex');

    const isValid = expectedSignature === receivedSignature;

    if (!isValid) {
      logger.warn('Webhook signature mismatch', { paymentId: payload.paymentId });
      res.status(401).json({ success: false, error: 'Invalid signature' });
      return;  // ← Same here
    }

    logger.debug('Webhook signature verified', { paymentId: payload.paymentId });
    next();
  } catch (error) {
    logger.error('Webhook verification error', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ success: false, error: 'Signature verification failed' });
  }
}