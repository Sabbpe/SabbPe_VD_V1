import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '@/middleware/auth.middleware';
import { logger } from '@/utils/logger';
import { walletService } from '@/services/wallet.service';

const router = Router();

// ============================================================================
// MIDDLEWARE - Request ID
// ============================================================================

router.use((req: Request, res: Response, next) => {
    const requestId = `wallet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.locals.requestId = requestId;
    logger.debug(`[${requestId}] ${req.method} ${req.path}`, {
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
router.get('/balance', authMiddleware, async (req: AuthRequest, res: Response) => {
    const requestId = res.locals.requestId;

    try {
        logger.info(`[${requestId}] 💰 GET /api/wallet/balance`);

        const merchantId = req.user?.userId;
        if (!merchantId) {
            logger.warn(`[${requestId}] ✗ Unauthorized`);
            return res.status(401).json({
                error: 'Unauthorized',
                requestId,
            });
        }

        const wallet = await walletService.getWalletBalance(merchantId);

        logger.info(`[${requestId}] ✓ Wallet balance fetched`, {
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
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[${requestId}] ❌ Error:`, { error: errorMessage });
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
router.post('/topup', authMiddleware, async (req: AuthRequest, res: Response) => {
    const requestId = res.locals.requestId;

    try {
        logger.info(`[${requestId}] 💳 POST /api/wallet/topup`);

        const merchantId = req.user?.userId;
        if (!merchantId) {
            logger.warn(`[${requestId}] ✗ Unauthorized`);
            return res.status(401).json({
                error: 'Unauthorized',
                requestId,
            });
        }

        const { amount, paymentMethod } = req.body;

        if (!amount || amount <= 0) {
            logger.warn(`[${requestId}] ✗ Invalid amount:`, { amount });
            return res.status(400).json({
                error: 'Invalid amount',
                requestId,
            });
        }

        const topupResponse = await walletService.initiateTopup({
            merchantId,
            amount: parseFloat(amount),
            paymentMethod,
        });

        logger.info(`[${requestId}] ✅ Topup initiated:`, {
            txnId: topupResponse.txnId,
            amount,
        });

        return res.json({
            success: true,
            data: topupResponse,
            requestId,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[${requestId}] ❌ Error:`, { error: errorMessage });
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
router.post('/callback', async (req: Request, res: Response) => {
    const requestId = `callback-${Date.now()}`;

    try {
        logger.info(`[${requestId}] 📨 Payment Callback Received`);

        const { txnId, amount, status, atomTxnId } = req.body;

        if (!txnId || !amount || !status) {
            logger.warn(`[${requestId}] ✗ Invalid callback data`);
            return res.status(400).json({
                error: 'Invalid callback data',
                requestId,
            });
        }

        const callbackResult = await walletService.processPaymentCallback({
            txnId,
            amount: parseFloat(amount),
            status,
            atomTxnId,
        });

        logger.info(`[${requestId}] ✅ Callback processed:`, {
            success: callbackResult.success,
            newBalance: callbackResult.newBalance,
        });

        return res.json({
            success: true,
            data: callbackResult,
            requestId,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[${requestId}] ❌ Error:`, { error: errorMessage });
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
router.get('/transactions', authMiddleware, async (req: AuthRequest, res: Response) => {
    const requestId = res.locals.requestId;

    try {
        logger.info(`[${requestId}] 📋 GET /api/wallet/transactions`);

        const merchantId = req.user?.userId;
        if (!merchantId) {
            return res.status(401).json({ error: 'Unauthorized', requestId });
        }

        const { limit = 20, offset = 0 } = req.query;

        // TODO: Fetch from wallet_topup_transactions table
        // For now, return empty array
        logger.info(`[${requestId}] ✓ Transactions fetched`);

        return res.json({
            success: true,
            data: {
                transactions: [],
                total: 0,
                limit: parseInt(limit as string),
                offset: parseInt(offset as string),
            },
            requestId,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[${requestId}] ❌ Error:`, { error: errorMessage });
        return res.status(500).json({
            error: 'Failed to fetch transactions',
            requestId,
        });
    }
});

export default router;
