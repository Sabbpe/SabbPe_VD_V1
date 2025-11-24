import { supabase } from '@/config/supabase';
import { valueDesignService } from '@/services/valuedesign.service';
import { sabbpeService, SabbpeWebhookPayload } from '@/services/external/sabbpe.service';
import { orderService } from '@/services/business/order.service';
import { logger } from '@/utils/logger';
import { NotFoundError, ValidationError } from '@/utils/errors';
import { OrderStatus, TransactionType } from '@/types/database';
import { config } from '@/config/env';

export interface PaymentInitiateDTO {
    orderId: string;
    userId: string;
    email: string;
    phone: string;
}

export interface PaymentStatusDTO {
    orderId: string;
    paymentId: string;
    status: string;
    amount: number;
    message: string;
}

export interface FormattedEVC {
    card_number: string;
    card_pin: string;
    card_status: string;
    balance_basic: number;
    balance_bonus: number;
    balance_total: number;
    expiry_date: string;
}

export class PaymentService {
    /**
     * Format EVC card data from ValueDesign response
     */
    private formatEVCCard(evc: any): FormattedEVC {
        return {
            card_number: evc.getCardNo || '',
            card_pin: evc.getCardPin || '',
            card_status: evc.getCardStatus || '',
            balance_basic: parseFloat(evc.balanceBasic || '0'),
            balance_bonus: parseFloat(evc.balanceBonus || '0'),
            balance_total: parseFloat(evc.balanceTotal || '0'),
            expiry_date: evc.getExpiryDate || '',
        };
    }

    /**
     * Initiate payment for an order
     */
    async initiatePayment(
        data: PaymentInitiateDTO,
        returnUrl: string,
        notifyUrl: string
    ): Promise<{ paymentUrl: string; paymentId: string }> {
        try {
            logger.info('Initiating payment', { orderId: data.orderId });

            // Validate inputs
            if (!data.orderId || !data.userId || !data.email || !data.phone) {
                throw new ValidationError('Missing required payment data');
            }

            // Get order
            const order = await orderService.getOrderByOrderId(data.orderId, data.userId);

            if (order.status !== OrderStatus.PENDING) {
                throw new ValidationError(`Cannot initiate payment for order in ${order.status} status`);
            }

            // Update order status to PROCESSING
            await orderService.updateOrderStatus(data.orderId, OrderStatus.PROCESSING);

            // Initiate payment with Sabbpe
            const paymentResponse = await sabbpeService.initiatePayment({
                merchantId: config.sabbpeMerchantId,
                orderId: data.orderId,
                amount: Math.round(order.totalAmount * 100), // Convert to paise
                currency: 'INR',
                customerEmail: data.email,
                customerPhone: data.phone,
                description: `Purchase: ${order.brandName} (Qty: ${order.quantity})`,
                returnUrl,
                notifyUrl,
            });

            // Store payment info in database
            const { error } = await supabase.from('payments').insert([
                {
                    order_id: order.id,
                    sabbpe_payment_id: paymentResponse.paymentId,
                    amount: order.totalAmount,
                    currency: 'INR',
                    status: 'PENDING',
                    created_at: new Date().toISOString(),
                },
            ]);

            if (error) {
                logger.warn('Failed to store payment info', { error: error.message });
            }

            logger.info('✓ Payment initiated', {
                orderId: data.orderId,
                paymentId: paymentResponse.paymentId,
                amount: order.totalAmount,
            });

            return {
                paymentUrl: paymentResponse.paymentUrl,
                paymentId: paymentResponse.paymentId,
            };
        } catch (error) {
            logger.error('Failed to initiate payment', {
                orderId: data.orderId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    /**
     * Handle payment webhook from Sabbpe
     */
    async handlePaymentWebhook(payload: SabbpeWebhookPayload): Promise<void> {
        try {
            logger.info('Processing payment webhook', {
                paymentId: payload.paymentId,
                status: payload.status,
                orderId: payload.orderId,
            });

            // Verify signature
            const isValid = sabbpeService.verifyWebhookSignature(payload, payload.signature);
            if (!isValid) {
                logger.warn('Invalid webhook signature', { paymentId: payload.paymentId });
                throw new ValidationError('Invalid webhook signature');
            }

            // Get order
            const order = await orderService.getOrderByOrderId(payload.orderId);

            // Update payment status
            const { error: paymentError } = await supabase
                .from('payments')
                .update({
                    status: payload.status,
                    webhook_received_at: new Date().toISOString(),
                    metadata: payload,
                })
                .eq('sabbpe_payment_id', payload.paymentId);

            if (paymentError) {
                logger.warn('Failed to update payment status', { error: paymentError.message });
            }

            // Handle based on payment status
            if (payload.status === 'SUCCESS') {
                await this.handlePaymentSuccess(order.id, payload.orderId, payload.paymentId);
            } else if (payload.status === 'FAILED') {
                await this.handlePaymentFailure(order.id, payload.orderId, payload.paymentId);
            }

            logger.info('✓ Payment webhook processed', { paymentId: payload.paymentId, status: payload.status });
        } catch (error) {
            logger.error('Failed to process payment webhook', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    /**
     * Handle successful payment
     */
    private async handlePaymentSuccess(orderId: string, orderIdStr: string, paymentId: string): Promise<void> {
        try {
            logger.info('Payment successful, delivering vouchers', { orderId: orderIdStr });

            // Get order details
            const order = await orderService.getOrder(orderId);

            try {
                // Call ValueDesign to get EVCs with proper parameters
                const evcResponse = await valueDesignService.getEVCs({
                    orderId: orderIdStr,
                    skuCode: order.brandCode,
                    noOfCard: order.quantity,
                    amount: order.totalAmount.toString(),
                    receiptNo: paymentId,
                    reqId: `REQ-${orderIdStr}`,
                    firstName: (order as any).customerFirstName,
                    lastName: (order as any).customerLastName,
                    mobileNo: (order as any).customerMobile,
                    email: (order as any).customerEmail,
                });

                if (!evcResponse?.brand_details || evcResponse.brand_details.length === 0) {
                    throw new Error('No EVCs returned from ValueDesign');
                }

                // Extract EVC items from the response
                const evcsItems = evcResponse.brand_details[0]?.items || [];
                if (evcsItems.length === 0) {
                    throw new Error('No EVC items in response');
                }

                // Format EVC cards
                const voucherItems = evcsItems.map((evc) => this.formatEVCCard(evc));

                // Store vouchers in database
                await orderService.addVoucherItems(orderId, order.brandCode, voucherItems as any);

                // Store ValueDesign response for audit
                await orderService.storeValueDesignResponse(orderId, paymentId, {
                    evc_count: evcsItems.length,
                    timestamp: new Date().toISOString(),
                    wallet_balance: evcResponse.wallet_balance,
                });

                // Update order status to COMPLETED
                await orderService.updateOrderStatus(orderId, OrderStatus.COMPLETED);

                // Log transaction for wallet (post-settlement)
                const { error: transactionError } = await supabase.from('wallet_transactions').insert([
                    {
                        transaction_type: TransactionType.DEBIT,
                        amount: order.totalAmount,
                        balance_before: 0,
                        balance_after: 0,
                        order_id: orderId,
                        merchant_id: (order as any).merchantId,
                        description: `Payment received for order ${orderIdStr}`,
                        metadata: {
                            paymentId,
                            brandCode: order.brandCode,
                            evcCount: evcsItems.length,
                        },
                        created_at: new Date().toISOString(),
                    },
                ]);

                if (transactionError) {
                    logger.warn('Failed to create wallet transaction', { error: transactionError.message });
                }

                logger.info('✓ Vouchers delivered successfully', { orderId: orderIdStr, count: evcsItems.length });
            } catch (vdError) {
                logger.error('ValueDesign delivery failed', {
                    orderId: orderIdStr,
                    error: vdError instanceof Error ? vdError.message : String(vdError),
                });

                // Mark order as failed if ValueDesign fails
                await orderService.updateOrderStatus(orderId, OrderStatus.FAILED);

                // Initiate refund
                try {
                    await sabbpeService.refundPayment(paymentId, order.totalAmount);
                    logger.info('✓ Payment refunded due to delivery failure', { paymentId, orderId: orderIdStr });
                } catch (refundError) {
                    logger.error('Refund failed', {
                        orderId: orderIdStr,
                        error: refundError instanceof Error ? refundError.message : String(refundError),
                    });
                }
            }
        } catch (error) {
            logger.error('Failed to handle payment success', {
                orderId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    /**
     * Handle failed payment
     */
    private async handlePaymentFailure(_orderId: string, orderIdStr: string, paymentId: string): Promise<void> {
        try {
            logger.info('Payment failed, cancelling order', { orderId: orderIdStr });

            // Update order status
            await orderService.updateOrderStatus(_orderId, OrderStatus.FAILED);

            logger.info('✓ Payment failure handled', { paymentId, orderId: orderIdStr });
        } catch (error) {
            logger.error('Failed to handle payment failure', {
                orderId: _orderId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    /**
     * Get payment status
     */
    async getPaymentStatus(orderId: string): Promise<PaymentStatusDTO> {
        try {
            logger.info('Fetching payment status', { orderId });

            if (!orderId) {
                throw new ValidationError('Order ID is required');
            }

            const { data: payment, error } = await supabase
                .from('payments')
                .select('*')
                .eq('order_id', orderId)
                .single();

            if (error || !payment) {
                throw new NotFoundError('Payment record not found');
            }

            const order = await orderService.getOrder(orderId);

            return {
                orderId,
                paymentId: payment.sabbpe_payment_id,
                status: payment.status,
                amount: order.totalAmount,
                message: `Payment status: ${payment.status}`,
            };
        } catch (error) {
            logger.error('Failed to fetch payment status', {
                orderId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    /**
     * Refund payment for cancelled order
     */
    async refundPayment(orderId: string, reason: string): Promise<{ refundId: string }> {
        try {
            logger.info('Processing refund', { orderId, reason });

            if (!orderId) {
                throw new ValidationError('Order ID is required');
            }

            const { data: payment, error } = await supabase
                .from('payments')
                .select('*')
                .eq('order_id', orderId)
                .single();

            if (error || !payment) {
                throw new NotFoundError('Payment record not found');
            }

            // Call Sabbpe refund
            const refundResult = await sabbpeService.refundPayment(payment.sabbpe_payment_id, payment.amount);

            // Update payment status
            const { error: updateError } = await supabase
                .from('payments')
                .update({
                    status: 'REFUNDED',
                    refund_id: refundResult.refundId,
                    refund_reason: reason,
                    refunded_at: new Date().toISOString(),
                })
                .eq('id', payment.id);

            if (updateError) {
                logger.warn('Failed to update payment refund status', { error: updateError.message });
            }

            logger.info('✓ Refund processed', { refundId: refundResult.refundId, orderId });

            return { refundId: refundResult.refundId };
        } catch (error) {
            logger.error('Failed to process refund', {
                orderId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
}

export const paymentService = new PaymentService();