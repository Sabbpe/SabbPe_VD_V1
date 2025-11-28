"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletService = exports.WalletService = void 0;
const supabase_1 = require("../config/supabase");
const uuid_1 = require("uuid");
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
class WalletService {
    // Get merchant_sync id from user_id
    async getMerchantSyncId(userId) {
        try {
            const { data, error } = await supabase_1.supabase
                .from('merchant_sync')
                .select('merchant_id')
                .eq('user_id', userId)
                .single();
            if (error || !data) {
                logger_1.logger.warn('merchant_sync not found for user', { userId });
                throw new Error(`No merchant_sync found for user ${userId}`);
            }
            return data.merchant_id;
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger_1.logger.error('Error getting merchant_sync id:', { error: errorMsg });
            throw err;
        }
    }
    // Get merchant wallet balance
    async getWalletBalance(userId) {
        try {
            // First get merchant_id from merchant_sync
            const merchantId = await this.getMerchantSyncId(userId);
            const { data, error } = await supabase_1.supabase
                .from('merchant_wallet')
                .select('balance, id')
                .eq('merchant_id', merchantId)
                .single();
            if (error) {
                // If wallet doesn't exist, create it
                if (error.code === 'PGRST116') {
                    logger_1.logger.warn('Wallet not found, creating new one', { merchantId });
                    return await this.createWallet(merchantId);
                }
                // If duplicate error, just fetch it again
                if (error.code === '23505') {
                    logger_1.logger.info('Wallet already exists, fetching...', { merchantId });
                    return await this.getWalletBalance(merchantId);
                }
                throw error;
            }
            return data;
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger_1.logger.error('Error fetching wallet balance:', { error: errorMsg });
            throw err;
        }
    }
    // Create new wallet
    async createWallet(merchantId) {
        try {
            const { data, error } = await supabase_1.supabase
                .from('merchant_wallet')
                .insert([{
                    id: (0, uuid_1.v4)(),
                    merchant_id: merchantId,
                    balance: 0
                }])
                .select()
                .single();
            if (error) {
                const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
                logger_1.logger.error('Supabase insert error:', { error: errorMsg, details: error });
                throw error;
            }
            return data;
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger_1.logger.error('Error creating wallet:', { error: errorMsg, details: JSON.stringify(err) });
            throw err;
        }
    }
    // Initiate wallet topup
    async initiateTopup(request) {
        try {
            const { merchantId: userId, amount } = request;
            logger_1.logger.info('💳 Initiating wallet topup', { userId, amount });
            // ✅ Get actual merchant_id from merchant_sync
            const merchantId = await this.getMerchantSyncId(userId);
            logger_1.logger.info('✓ Got merchant_id from user_id', { userId, merchantId });
            // Ensure wallet exists
            const wallet = await this.getWalletBalance(userId);
            logger_1.logger.info('✓ Wallet loaded', { walletId: wallet.id, balance: wallet.balance });
            const txnId = `TOPUP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const paymentResponse = await this.callNDPSPaymentInitiate({
                amount,
                email: 'merchant@example.com',
                mobile: '9876543210',
                product: 'WALLET',
                paymentMethod: request.paymentMethod || 'NB'
            });
            if (!paymentResponse.success) {
                throw new Error('Payment initiation failed: ' + paymentResponse.error);
            }
            // ✅ Record in wallet_topup_transactions
            await this.recordTopupTransaction(merchantId, wallet.id, 'TOPUP', amount, 'PENDING', txnId, 'Wallet topup initiated');
            logger_1.logger.info('✅ Topup initiated', {
                userId,
                merchantId,
                walletId: wallet.id,
                txnId,
                atomTokenId: paymentResponse.atomTokenId
            });
            return {
                success: true,
                txnId,
                atomTokenId: paymentResponse.atomTokenId,
                publicReturnUrl: paymentResponse.publicReturnUrl,
                amount
            };
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger_1.logger.error('Error initiating topup:', { error: errorMsg });
            throw err;
        }
    }
    // Process payment callback
    async processPaymentCallback(callbackData) {
        try {
            logger_1.logger.info('📨 Processing payment callback', { callbackData });
            const { txnId, amount, status, atomTxnId } = callbackData;
            // ✅ AUDIT: Log webhook to merchant_webhooks
            await this.logWebhook('payment_callback', callbackData, status);
            const { data: transaction, error: txnError } = await supabase_1.supabase
                .from('wallet_topup_transactions')
                .select('*')
                .eq('reference_id', txnId)
                .single();
            if (txnError || !transaction) {
                logger_1.logger.error('Transaction not found:', { txnId });
                throw new Error('Transaction not found');
            }
            const txnData = transaction;
            const merchantId = txnData.merchant_id;
            const walletId = txnData.wallet_id;
            if (status === 'SUCCESS' || status === 'OTS0000') {
                const { data: wallet, error: walletError } = await supabase_1.supabase
                    .from('merchant_wallet')
                    .select('balance')
                    .eq('id', walletId)
                    .single();
                if (walletError || !wallet) {
                    throw new Error('Wallet not found');
                }
                const walletData = wallet;
                const balanceBefore = walletData.balance;
                const newBalance = balanceBefore + amount;
                logger_1.logger.info('💰 Updating wallet balance', {
                    walletId,
                    balanceBefore,
                    amount,
                    newBalance
                });
                // ✅ Update merchant_wallet
                const { error: updateError } = await supabase_1.supabase
                    .from('merchant_wallet')
                    .update({
                    balance: newBalance,
                    updated_at: new Date().toISOString()
                })
                    .eq('id', walletId);
                if (updateError) {
                    logger_1.logger.error('Failed to update wallet balance', { error: updateError });
                    throw new Error('Failed to update wallet balance');
                }
                logger_1.logger.info('✓ Wallet balance updated successfully');
                // ✅ Update wallet_topup_transactions
                await supabase_1.supabase
                    .from('wallet_topup_transactions')
                    .update({
                    status: 'SUCCESS',
                    balance_before: balanceBefore,
                    balance_after: newBalance,
                    metadata: {
                        atomTxnId,
                        processed_at: new Date().toISOString()
                    }
                })
                    .eq('id', txnData.id);
                // ✅ AUDIT: Record in wallet_transactions (general ledger)
                await this.recordWalletTransaction(merchantId, 'topup', amount, balanceBefore, newBalance, null, // order_id
                `Wallet topup via payment gateway`, {
                    reference_id: txnId,
                    atomTxnId: atomTxnId,
                    payment_method: 'gateway'
                });
                logger_1.logger.info('✅ Wallet topup successful', {
                    merchantId,
                    amount,
                    balanceBefore,
                    newBalance,
                    atomTxnId
                });
                return {
                    success: true,
                    message: 'Wallet topup successful',
                    balanceBefore,
                    newBalance
                };
            }
            else {
                // Payment failed
                await supabase_1.supabase
                    .from('wallet_topup_transactions')
                    .update({
                    status: 'FAILED',
                    metadata: {
                        atomTxnId,
                        failed_at: new Date().toISOString()
                    }
                })
                    .eq('id', txnData.id);
                logger_1.logger.warn('❌ Payment failed', { txnId, status });
                return {
                    success: false,
                    message: 'Payment failed',
                    status
                };
            }
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger_1.logger.error('Error processing callback:', { error: errorMsg });
            throw err;
        }
    }
    // Deduct from wallet for voucher purchase
    async deductWalletBalance(userId, amount, orderId) {
        try {
            const wallet = await this.getWalletBalance(userId);
            if (wallet.balance < amount) {
                throw new Error('Insufficient wallet balance');
            }
            const merchantId = await this.getMerchantSyncId(userId);
            const balanceBefore = wallet.balance;
            const newBalance = wallet.balance - amount;
            // Update wallet
            await supabase_1.supabase
                .from('merchant_wallet')
                .update({
                balance: newBalance,
                updated_at: new Date().toISOString()
            })
                .eq('id', wallet.id);
            // ✅ AUDIT: Record in wallet_transactions
            await this.recordWalletTransaction(merchantId, 'debit', amount, balanceBefore, newBalance, orderId, 'Voucher purchase deduction', {
                order_id: orderId,
                transaction_type: 'voucher_purchase'
            });
            logger_1.logger.info('✅ Wallet debited for voucher purchase', {
                userId,
                amount,
                newBalance,
                orderId
            });
            return { success: true, newBalance };
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger_1.logger.error('Error deducting wallet balance:', { error: errorMsg });
            throw err;
        }
    }
    // ✅ NEW: Record in wallet_topup_transactions (specific)
    async recordTopupTransaction(merchantId, walletId, type, amount, status, referenceId, description) {
        try {
            const txnData = {
                id: (0, uuid_1.v4)(),
                merchant_id: merchantId,
                wallet_id: walletId,
                transaction_type: type,
                amount,
                status,
                reference_id: referenceId,
                description,
                created_at: new Date().toISOString()
            };
            logger_1.logger.info('Recording topup transaction:', { txnData });
            const { data, error } = await supabase_1.supabase
                .from('wallet_topup_transactions')
                .insert([txnData])
                .select();
            if (error) {
                logger_1.logger.error('Failed to record topup transaction:', {
                    error: error.message,
                    code: error.code
                });
                throw error;
            }
            logger_1.logger.info('✅ Topup transaction recorded:', { transactionId: data?.[0]?.id });
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger_1.logger.error('Error recording topup transaction:', { error: errorMsg });
            throw err;
        }
    }
    // ✅ Record in wallet_transactions (general ledger for audit) - WITH FULL DEBUG
    async recordWalletTransaction(merchantId, transactionType, amount, balanceBefore, balanceAfter, orderId, description, metadata) {
        try {
            logger_1.logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            logger_1.logger.info('📝 STARTING wallet_transactions INSERT');
            logger_1.logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            const txnData = {
                id: (0, uuid_1.v4)(),
                transaction_type: transactionType,
                amount: amount,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                order_id: orderId,
                merchant_id: merchantId,
                description: description,
                metadata: metadata,
                created_at: new Date().toISOString()
            };
            logger_1.logger.info('🔍 Transaction data prepared:', {
                id: txnData.id,
                transaction_type: txnData.transaction_type,
                amount: txnData.amount,
                balance_before: txnData.balance_before,
                balance_after: txnData.balance_after,
                order_id: txnData.order_id,
                merchant_id: txnData.merchant_id,
                description: txnData.description,
                metadata: JSON.stringify(txnData.metadata),
                created_at: txnData.created_at
            });
            logger_1.logger.info('🚀 Calling Supabase insert on wallet_transactions...');
            const { data, error } = await supabase_1.supabase
                .from('wallet_transactions')
                .insert([txnData])
                .select();
            logger_1.logger.info('📥 Supabase response received');
            logger_1.logger.info('🔍 Checking response:', {
                hasError: !!error,
                hasData: !!data,
                dataLength: data?.length,
                errorObject: error ? JSON.stringify(error) : 'none'
            });
            if (error) {
                logger_1.logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                logger_1.logger.error('❌ SUPABASE INSERT ERROR', {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint,
                    fullError: JSON.stringify(error, null, 2)
                });
                logger_1.logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                return;
            }
            if (!data || data.length === 0) {
                logger_1.logger.warn('⚠️ No data returned but no error either!', {
                    data: data,
                    error: error
                });
                return;
            }
            logger_1.logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            logger_1.logger.info('✅ SUCCESS: wallet_transactions INSERT COMPLETED', {
                id: data?.[0]?.id,
                merchant_id: data?.[0]?.merchant_id,
                transaction_type: data?.[0]?.transaction_type,
                amount: data?.[0]?.amount
            });
            logger_1.logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }
        catch (err) {
            logger_1.logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            logger_1.logger.error('🔴 EXCEPTION in recordWalletTransaction', {
                message: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : 'No stack trace'
            });
            logger_1.logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }
    }
    // ✅ NEW: Log webhook callbacks for audit
    // Line ~285-320
    async logWebhook(eventType, payload, status) {
        try {
            const webhookData = {
                id: (0, uuid_1.v4)(),
                event_type: eventType, // ← This column exists in webhook_logs
                payload,
                status,
                received_at: new Date().toISOString(),
                processed: true,
                created_at: new Date().toISOString()
            };
            logger_1.logger.info('📝 Logging webhook event:', { eventType, status });
            const { error } = await supabase_1.supabase
                .from('webhook_logs') // ← Changed from merchant_webhooks
                .insert([webhookData]);
            if (error) {
                logger_1.logger.error('❌ Failed to log webhook:', {
                    error: error.message,
                    code: error.code
                });
            }
            else {
                logger_1.logger.info('✅ Webhook logged successfully');
            }
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger_1.logger.error('Error logging webhook:', { error: errorMsg });
        }
    }
    // Call NDPS payment initiate (or mock)
    async callNDPSPaymentInitiate(paymentData) {
        try {
            const NDPS_URL = process.env.NDPS_SERVER_URL || 'https://sabbpe-uat-988626072499.asia-south1.run.app';
            logger_1.logger.info('📤 Calling NDPS payment initiate...', { url: NDPS_URL });
            const response = await axios_1.default.post(`${NDPS_URL}/api/payment/initiate`, paymentData, {
                timeout: 10000
            });
            return response.data;
        }
        catch (error) {
            logger_1.logger.warn('⚠️ NDPS call failed, using mock payment', {
                error: error instanceof Error ? error.message : String(error)
            });
            const payData = paymentData;
            return {
                success: true,
                atomTokenId: `MOCK_TOKEN_${Date.now()}`,
                txnId: `MOCK_TXN_${Date.now()}`,
                amount: payData.amount,
                publicReturnUrl: `${process.env.NDPS_SERVER_URL || 'https://sabbpe-uat-988626072499.asia-south1.run.app'}/payment/success`
            };
        }
    }
}
exports.WalletService = WalletService;
exports.walletService = new WalletService();
//# sourceMappingURL=wallet.service.js.map