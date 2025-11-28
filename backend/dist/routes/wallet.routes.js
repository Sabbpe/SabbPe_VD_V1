"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const logger_1 = require("../utils/logger");
const wallet_service_1 = require("../services/wallet.service");
const router = (0, express_1.Router)();
// ============================================================================
// MIDDLEWARE - Request ID
// ============================================================================
router.use((req, res, next) => {
    const requestId = `wallet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.locals.requestId = requestId;
    logger_1.logger.debug(`[${requestId}] ${req.method} ${req.path}`, {
        body: req.body ? JSON.stringify(req.body).substring(0, 150) : undefined,
    });
    next();
});
// ============================================================================
// API ENDPOINTS
// ============================================================================
/**
 * GET /api/wallet/balance
 * Get merchant wallet balance
 */
router.get('/balance', auth_middleware_1.authMiddleware, async (req, res) => {
    const requestId = res.locals.requestId;
    try {
        logger_1.logger.info(`[${requestId}] 💰 GET /api/wallet/balance`);
        const merchantId = req.user?.userId;
        if (!merchantId) {
            logger_1.logger.warn(`[${requestId}] ✗ Unauthorized`);
            return res.status(401).json({
                error: 'Unauthorized',
                requestId,
            });
        }
        const wallet = await wallet_service_1.walletService.getWalletBalance(merchantId);
        logger_1.logger.info(`[${requestId}] ✓ Wallet balance fetched`, {
            balance: wallet.balance,
        });
        return res.json({
            success: true,
            data: {
                balance: wallet.balance,
                currency: 'INR',
                walletId: wallet.id,
            },
            requestId,
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error(`[${requestId}] ❌ Error:`, { error: errorMessage });
        return res.status(500).json({
            error: 'Failed to fetch wallet balance',
            requestId,
        });
    }
});
/**
 * POST /api/wallet/topup
 * Initiate wallet top-up (calls NDPS payment)
 */
router.post('/topup', auth_middleware_1.authMiddleware, async (req, res) => {
    const requestId = res.locals.requestId;
    try {
        logger_1.logger.info(`[${requestId}] 💳 POST /api/wallet/topup`);
        const merchantId = req.user?.userId;
        if (!merchantId) {
            logger_1.logger.warn(`[${requestId}] ✗ Unauthorized`);
            return res.status(401).json({
                error: 'Unauthorized',
                requestId,
            });
        }
        const { amount, paymentMethod } = req.body;
        if (!amount || amount <= 0) {
            logger_1.logger.warn(`[${requestId}] ✗ Invalid amount:`, { amount });
            return res.status(400).json({
                error: 'Invalid amount',
                requestId,
            });
        }
        const topupResponse = await wallet_service_1.walletService.initiateTopup({
            merchantId,
            amount: parseFloat(amount),
            paymentMethod,
        });
        logger_1.logger.info(`[${requestId}] ✅ Topup initiated:`, {
            txnId: topupResponse.txnId,
            amount,
        });
        return res.json({
            success: true,
            data: topupResponse,
            requestId,
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error(`[${requestId}] ❌ Error:`, { error: errorMessage });
        return res.status(500).json({
            error: 'Failed to initiate topup',
            message: errorMessage,
            requestId,
        });
    }
});
/**
 * POST /api/payment/callback
 * Receive payment callback from NDPS
 */
router.post('/callback', async (req, res) => {
    const requestId = `callback-${Date.now()}`;
    try {
        logger_1.logger.info(`[${requestId}] 📨 Payment Callback Received`);
        const { txnId, amount, status, atomTxnId } = req.body;
        if (!txnId || !amount || !status) {
            logger_1.logger.warn(`[${requestId}] ✗ Invalid callback data`);
            return res.status(400).json({
                error: 'Invalid callback data',
                requestId,
            });
        }
        const callbackResult = await wallet_service_1.walletService.processPaymentCallback({
            txnId,
            amount: parseFloat(amount),
            status,
            atomTxnId,
        });
        logger_1.logger.info(`[${requestId}] ✅ Callback processed:`, {
            success: callbackResult.success,
            newBalance: callbackResult.newBalance,
        });
        return res.json({
            success: true,
            data: callbackResult,
            requestId,
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error(`[${requestId}] ❌ Error:`, { error: errorMessage });
        return res.status(500).json({
            error: 'Failed to process callback',
            requestId,
        });
    }
});
/**
 * GET /api/wallet/transactions
 * Get wallet transaction history
 */
router.get('/transactions', auth_middleware_1.authMiddleware, async (req, res) => {
    const requestId = res.locals.requestId;
    try {
        logger_1.logger.info(`[${requestId}] 📋 GET /api/wallet/transactions`);
        const merchantId = req.user?.userId;
        if (!merchantId) {
            return res.status(401).json({ error: 'Unauthorized', requestId });
        }
        const { limit = 20, offset = 0 } = req.query;
        // TODO: Fetch from wallet_topup_transactions table
        // For now, return empty array
        logger_1.logger.info(`[${requestId}] ✓ Transactions fetched`);
        return res.json({
            success: true,
            data: {
                transactions: [],
                total: 0,
                limit: parseInt(limit),
                offset: parseInt(offset),
            },
            requestId,
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error(`[${requestId}] ❌ Error:`, { error: errorMessage });
        return res.status(500).json({
            error: 'Failed to fetch transactions',
            requestId,
        });
    }
});
exports.default = router;
//# sourceMappingURL=wallet.routes.js.map