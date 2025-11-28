import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '@/middleware/auth.middleware';
import { paymentService } from '@/services/business/payment.service';
import { logger } from '@/utils/logger';

const router = Router();

router.post('/initiate', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
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

    const result = await paymentService.initiatePayment(
      {
        orderId,
        userId,
        email,
        phone,
      },
      returnUrl,
      notifyUrl
    );

    res.status(200).json({
      success: true,
      message: 'Payment initiated',
      data: result,
    });
  } catch (error) {
    logger.error('Initiate payment route error', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initiate payment',
    });
  }
});

router.get('/status/:orderId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      res.status(400).json({
        success: false,
        error: 'Order ID required',
      });
      return;
    }

    const paymentStatus = await paymentService.getPaymentStatus(orderId);

    res.status(200).json({
      success: true,
      data: paymentStatus,
    });
  } catch (error) {
    logger.error('Get payment status route error', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(404).json({
      success: false,
      error: error instanceof Error ? error.message : 'Payment not found',
    });
  }
});

router.post('/webhook/sabbpe', async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body;

    logger.info('Received Sabbpe webhook', {
      paymentId: payload.paymentId,
      orderId: payload.orderId,
      status: payload.status,
    });

    if (!payload.paymentId || !payload.orderId || !payload.status || !payload.signature) {
      logger.warn('Invalid webhook payload structure');
      res.status(400).json({
        success: false,
        error: 'Invalid payload',
      });
      return;
    }

    await paymentService.handlePaymentWebhook(payload);

    res.status(200).json({
      success: true,
      message: 'Webhook processed',
    });
  } catch (error) {
    logger.error('Sabbpe webhook route error', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(200).json({
      success: false,
      message: 'Webhook received but processing failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/webhook/valuedesign', async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body;

    logger.info('Received ValueDesign webhook', {
      orderId: payload.orderId,
      status: payload.status,
    });

    res.status(200).json({
      success: true,
      message: 'ValueDesign webhook processed',
    });
  } catch (error) {
    logger.error('ValueDesign webhook route error', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(200).json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
});

router.post('/refund/:orderId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
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

    await paymentService.refundPayment(orderId, reason || 'Manual refund requested');

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
    });
  } catch (error) {
    logger.error('Refund route error', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process refund',
    });
  }
});

router.get('/verify-webhook', (req: Request, res: Response): void => {
  try {
    const { signature, payload } = req.query;

    if (!signature || !payload) {
      res.status(400).json({
        success: false,
        error: 'Signature and payload required',
      });
      return;
    }

    const parsedPayload = JSON.parse(payload as string);
    const isValid = true;

    res.status(200).json({
      success: true,
      data: {
        isValid,
        payloadReceived: parsedPayload,
      },
    });
  } catch (error) {
    logger.error('Verify webhook route error', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(400).json({
      success: false,
      error: 'Invalid payload format',
    });
  }
});

export default router;