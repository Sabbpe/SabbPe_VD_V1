"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentService = exports.PaymentService = void 0;
const supabase_1 = require("../../config/supabase");
const valuedesign_service_1 = require("../../services/valuedesign.service");
const sabbpe_service_1 = require("../../services/external/sabbpe.service");
const order_service_1 = require("../../services/business/order.service");
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
const database_1 = require("../../types/database");
const env_1 = require("../../config/env");
class PaymentService {
    /**
     * Format EVC card data from ValueDesign response
     */
    formatEVCCard(evc) {
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
    async initiatePayment(data, returnUrl, notifyUrl) {
        try {
            logger_1.logger.info('Initiating payment', { orderId: data.orderId });
            // Validate inputs
            if (!data.orderId || !data.userId || !data.email || !data.phone) {
                throw new errors_1.ValidationError('Missing required payment data');
            }
            // Get order
            const order = await order_service_1.orderService.getOrderByOrderId(data.orderId, data.userId);
            if (order.status !== database_1.OrderStatus.PENDING) {
                throw new errors_1.ValidationError(`Cannot initiate payment for order in ${order.status} status`);
            }
            // Update order status to PROCESSING
            await order_service_1.orderService.updateOrderStatus(data.orderId, database_1.OrderStatus.PROCESSING);
            // Initiate payment with Sabbpe
            const paymentResponse = await sabbpe_service_1.sabbpeService.initiatePayment({
                merchantId: env_1.config.sabbpeMerchantId,
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
            const { error } = await supabase_1.supabase.from('payments').insert([
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
                logger_1.logger.warn('Failed to store payment info', { error: error.message });
            }
            logger_1.logger.info('✓ Payment initiated', {
                orderId: data.orderId,
                paymentId: paymentResponse.paymentId,
                amount: order.totalAmount,
            });
            return {
                paymentUrl: paymentResponse.paymentUrl,
                paymentId: paymentResponse.paymentId,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to initiate payment', {
                orderId: data.orderId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Handle payment webhook from Sabbpe
     */
    async handlePaymentWebhook(payload) {
        try {
            logger_1.logger.info('Processing payment webhook', {
                paymentId: payload.paymentId,
                status: payload.status,
                orderId: payload.orderId,
            });
            // Verify signature
            const isValid = sabbpe_service_1.sabbpeService.verifyWebhookSignature(payload, payload.signature);
            if (!isValid) {
                logger_1.logger.warn('Invalid webhook signature', { paymentId: payload.paymentId });
                throw new errors_1.ValidationError('Invalid webhook signature');
            }
            // Get order
            const order = await order_service_1.orderService.getOrderByOrderId(payload.orderId);
            // Update payment status
            const { error: paymentError } = await supabase_1.supabase
                .from('payments')
                .update({
                status: payload.status,
                webhook_received_at: new Date().toISOString(),
                metadata: payload,
            })
                .eq('sabbpe_payment_id', payload.paymentId);
            if (paymentError) {
                logger_1.logger.warn('Failed to update payment status', { error: paymentError.message });
            }
            // Handle based on payment status
            if (payload.status === 'SUCCESS') {
                await this.handlePaymentSuccess(order.id, payload.orderId, payload.paymentId);
            }
            else if (payload.status === 'FAILED') {
                await this.handlePaymentFailure(order.id, payload.orderId, payload.paymentId);
            }
            logger_1.logger.info('✓ Payment webhook processed', { paymentId: payload.paymentId, status: payload.status });
        }
        catch (error) {
            logger_1.logger.error('Failed to process payment webhook', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Handle successful payment
     */
    async handlePaymentSuccess(orderId, orderIdStr, paymentId) {
        try {
            logger_1.logger.info('Payment successful, delivering vouchers', { orderId: orderIdStr });
            // Get order details
            const order = await order_service_1.orderService.getOrder(orderId);
            try {
                // Call ValueDesign to get EVCs with proper parameters
                const evcResponse = await valuedesign_service_1.valueDesignService.getEVCs({
                    orderId: orderIdStr,
                    skuCode: order.brandCode,
                    noOfCard: order.quantity,
                    amount: order.totalAmount.toString(),
                    receiptNo: paymentId,
                    reqId: `REQ-${orderIdStr}`,
                    firstName: order.customerFirstName,
                    lastName: order.customerLastName,
                    mobileNo: order.customerMobile,
                    email: order.customerEmail,
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
                await order_service_1.orderService.addVoucherItems(orderId, order.brandCode, voucherItems);
                // Store ValueDesign response for audit
                await order_service_1.orderService.storeValueDesignResponse(orderId, paymentId, {
                    evc_count: evcsItems.length,
                    timestamp: new Date().toISOString(),
                    wallet_balance: evcResponse.wallet_balance,
                });
                // Update order status to COMPLETED
                await order_service_1.orderService.updateOrderStatus(orderId, database_1.OrderStatus.COMPLETED);
                // Log transaction for wallet (post-settlement)
                const { error: transactionError } = await supabase_1.supabase.from('wallet_transactions').insert([
                    {
                        transaction_type: database_1.TransactionType.DEBIT,
                        amount: order.totalAmount,
                        balance_before: 0,
                        balance_after: 0,
                        order_id: orderId,
                        merchant_id: order.merchantId,
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
                    logger_1.logger.warn('Failed to create wallet transaction', { error: transactionError.message });
                }
                logger_1.logger.info('✓ Vouchers delivered successfully', { orderId: orderIdStr, count: evcsItems.length });
            }
            catch (vdError) {
                logger_1.logger.error('ValueDesign delivery failed', {
                    orderId: orderIdStr,
                    error: vdError instanceof Error ? vdError.message : String(vdError),
                });
                // Mark order as failed if ValueDesign fails
                await order_service_1.orderService.updateOrderStatus(orderId, database_1.OrderStatus.FAILED);
                // Initiate refund
                try {
                    await sabbpe_service_1.sabbpeService.refundPayment(paymentId, order.totalAmount);
                    logger_1.logger.info('✓ Payment refunded due to delivery failure', { paymentId, orderId: orderIdStr });
                }
                catch (refundError) {
                    logger_1.logger.error('Refund failed', {
                        orderId: orderIdStr,
                        error: refundError instanceof Error ? refundError.message : String(refundError),
                    });
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to handle payment success', {
                orderId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Handle failed payment
     */
    async handlePaymentFailure(_orderId, orderIdStr, paymentId) {
        try {
            logger_1.logger.info('Payment failed, cancelling order', { orderId: orderIdStr });
            // Update order status
            await order_service_1.orderService.updateOrderStatus(_orderId, database_1.OrderStatus.FAILED);
            logger_1.logger.info('✓ Payment failure handled', { paymentId, orderId: orderIdStr });
        }
        catch (error) {
            logger_1.logger.error('Failed to handle payment failure', {
                orderId: _orderId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Get payment status
     */
    async getPaymentStatus(orderId) {
        try {
            logger_1.logger.info('Fetching payment status', { orderId });
            if (!orderId) {
                throw new errors_1.ValidationError('Order ID is required');
            }
            const { data: payment, error } = await supabase_1.supabase
                .from('payments')
                .select('*')
                .eq('order_id', orderId)
                .single();
            if (error || !payment) {
                throw new errors_1.NotFoundError('Payment record not found');
            }
            const order = await order_service_1.orderService.getOrder(orderId);
            return {
                orderId,
                paymentId: payment.sabbpe_payment_id,
                status: payment.status,
                amount: order.totalAmount,
                message: `Payment status: ${payment.status}`,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch payment status', {
                orderId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Refund payment for cancelled order
     */
    async refundPayment(orderId, reason) {
        try {
            logger_1.logger.info('Processing refund', { orderId, reason });
            if (!orderId) {
                throw new errors_1.ValidationError('Order ID is required');
            }
            const { data: payment, error } = await supabase_1.supabase
                .from('payments')
                .select('*')
                .eq('order_id', orderId)
                .single();
            if (error || !payment) {
                throw new errors_1.NotFoundError('Payment record not found');
            }
            // Call Sabbpe refund
            const refundResult = await sabbpe_service_1.sabbpeService.refundPayment(payment.sabbpe_payment_id, payment.amount);
            // Update payment status
            const { error: updateError } = await supabase_1.supabase
                .from('payments')
                .update({
                status: 'REFUNDED',
                refund_id: refundResult.refundId,
                refund_reason: reason,
                refunded_at: new Date().toISOString(),
            })
                .eq('id', payment.id);
            if (updateError) {
                logger_1.logger.warn('Failed to update payment refund status', { error: updateError.message });
            }
            logger_1.logger.info('✓ Refund processed', { refundId: refundResult.refundId, orderId });
            return { refundId: refundResult.refundId };
        }
        catch (error) {
            logger_1.logger.error('Failed to process refund', {
                orderId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
}
exports.PaymentService = PaymentService;
exports.paymentService = new PaymentService();
//# sourceMappingURL=payment.service.js.map