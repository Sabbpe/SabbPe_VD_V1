"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const payment_service_1 = require("../services/business/payment.service");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
router.post('/initiate', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { orderId, email, phone } = req.body;
        const { userId } = req.user || {};
        if (!userId) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        if (!orderId || !email || !phone) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields: orderId, email, phone',
            });
            return;
        }
        const protocol = req.protocol;
        const host = req.get('host');
        const returnUrl = `${protocol}://${host}/payment/return`;
        const notifyUrl = `${protocol}://${host}/api/payment/webhook/sabbpe`;
        const result = await payment_service_1.paymentService.initiatePayment({
            orderId,
            userId,
            email,
            phone,
        }, returnUrl, notifyUrl);
        res.status(200).json({
            success: true,
            message: 'Payment initiated',
            data: result,
        });
    }
    catch (error) {
        logger_1.logger.error('Initiate payment route error', {
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to initiate payment',
        });
    }
});
router.get('/status/:orderId', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { orderId } = req.params;
        if (!orderId) {
            res.status(400).json({
                success: false,
                error: 'Order ID required',
            });
            return;
        }
        const paymentStatus = await payment_service_1.paymentService.getPaymentStatus(orderId);
        res.status(200).json({
            success: true,
            data: paymentStatus,
        });
    }
    catch (error) {
        logger_1.logger.error('Get payment status route error', {
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(404).json({
            success: false,
            error: error instanceof Error ? error.message : 'Payment not found',
        });
    }
});
router.post('/webhook/sabbpe', async (req, res) => {
    try {
        const payload = req.body;
        logger_1.logger.info('Received Sabbpe webhook', {
            paymentId: payload.paymentId,
            orderId: payload.orderId,
            status: payload.status,
        });
        if (!payload.paymentId || !payload.orderId || !payload.status || !payload.signature) {
            logger_1.logger.warn('Invalid webhook payload structure');
            res.status(400).json({
                success: false,
                error: 'Invalid payload',
            });
            return;
        }
        await payment_service_1.paymentService.handlePaymentWebhook(payload);
        res.status(200).json({
            success: true,
            message: 'Webhook processed',
        });
    }
    catch (error) {
        logger_1.logger.error('Sabbpe webhook route error', {
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(200).json({
            success: false,
            message: 'Webhook received but processing failed',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.post('/webhook/valuedesign', async (req, res) => {
    try {
        const payload = req.body;
        logger_1.logger.info('Received ValueDesign webhook', {
            orderId: payload.orderId,
            status: payload.status,
        });
        res.status(200).json({
            success: true,
            message: 'ValueDesign webhook processed',
        });
    }
    catch (error) {
        logger_1.logger.error('ValueDesign webhook route error', {
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(200).json({
            success: false,
            message: 'Webhook processing failed',
        });
    }
});
router.post('/refund/:orderId', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;
        if (!orderId) {
            res.status(400).json({
                success: false,
                error: 'Order ID required',
            });
            return;
        }
        await payment_service_1.paymentService.refundPayment(orderId, reason || 'Manual refund requested');
        res.status(200).json({
            success: true,
            message: 'Refund processed successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Refund route error', {
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process refund',
        });
    }
});
router.get('/verify-webhook', (req, res) => {
    try {
        const { signature, payload } = req.query;
        if (!signature || !payload) {
            res.status(400).json({
                success: false,
                error: 'Signature and payload required',
            });
            return;
        }
        const parsedPayload = JSON.parse(payload);
        const isValid = true;
        res.status(200).json({
            success: true,
            data: {
                isValid,
                payloadReceived: parsedPayload,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Verify webhook route error', {
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(400).json({
            success: false,
            error: 'Invalid payload format',
        });
    }
});
exports.default = router;
//# sourceMappingURL=payment.routes.js.map