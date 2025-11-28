"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWebhookSignature = verifyWebhookSignature;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
/**
 * Middleware to verify webhook authenticity
 * Checks for valid signature from payment gateway
 */
function verifyWebhookSignature(req, res, next) {
    try {
        const receivedSignature = req.headers['x-signature'];
        const payload = req.body;
        if (!receivedSignature) {
            logger_1.logger.warn('Webhook missing signature header');
            res.status(400).json({ success: false, error: 'Missing signature' });
            return; // ← Change from "return res.status(...)" to this
        }
        const message = JSON.stringify(payload);
        const expectedSignature = crypto_1.default
            .createHmac('sha256', env_1.config.sabbpeWebhookSecret)
            .update(message)
            .digest('hex');
        const isValid = expectedSignature === receivedSignature;
        if (!isValid) {
            logger_1.logger.warn('Webhook signature mismatch', { paymentId: payload.paymentId });
            res.status(401).json({ success: false, error: 'Invalid signature' });
            return; // ← Same here
        }
        logger_1.logger.debug('Webhook signature verified', { paymentId: payload.paymentId });
        next();
    }
    catch (error) {
        logger_1.logger.error('Webhook verification error', {
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ success: false, error: 'Signature verification failed' });
    }
}
//# sourceMappingURL=webhook.middleware.js.map