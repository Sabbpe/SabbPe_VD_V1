import { supabase } from '@/config/supabase';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { logger } from '@/utils/logger';

interface TopupRequest {
    merchantId: string;
    amount: number;
    paymentMethod?: string;
}

interface PaymentCallbackData {
    txnId: string;
    amount: number;
    status: string;
    atomTxnId?: string;
    timestamp?: string;
    [key: string]: unknown;  // ← This allows it to be treated as Record<string, unknown>
}

interface WalletData {
    id: string;
    balance: number;
}

interface TransactionData {
    id: string;
    merchant_id: string;
    wallet_id: string;
    status: string;
    [key: string]: unknown;
}

export class WalletService {
    // Get merchant_sync id from user_id
    async getMerchantSyncId(userId: string): Promise<string> {
        try {
            const { data, error } = await supabase
                .from('merchant_sync')
                .select('merchant_id')
                .eq('user_id', userId)
                .single();

            if (error || !data) {
                logger.warn('merchant_sync not found for user', { userId });
                throw new Error(`No merchant_sync found for user ${userId}`);
            }

            return (data as { merchant_id: string }).merchant_id;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger.error('Error getting merchant_sync id:', { error: errorMsg });
            throw err;
        }
    }

    // Get merchant wallet balance
    async getWalletBalance(userId: string): Promise<WalletData> {
        try {
            // First get merchant_id from merchant_sync
            const merchantId = await this.getMerchantSyncId(userId);

            const { data, error } = await supabase
                .from('merchant_wallet')
                .select('balance, id')
                .eq('merchant_id', merchantId)
                .single();

            if (error) {
                // If wallet doesn't exist, create it
                if (error.code === 'PGRST116') {
                    logger.warn('Wallet not found, creating new one', { merchantId });
                    return await this.createWallet(merchantId);
                }
                // If duplicate error, just fetch it again
                if (error.code === '23505') {
                    logger.info('Wallet already exists, fetching...', { merchantId });
                    return await this.getWalletBalance(merchantId);
                }
                throw error;
            }

            return data as WalletData;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger.error('Error fetching wallet balance:', { error: errorMsg });
            throw err;
        }
    }

    // Create new wallet
    async createWallet(merchantId: string): Promise<WalletData> {
        try {
            const { data, error } = await supabase
                .from('merchant_wallet')
                .insert([{
                    id: uuidv4(),
                    merchant_id: merchantId,
                    balance: 0
                }])
                .select()
                .single();

            if (error) {
                const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
                logger.error('Supabase insert error:', { error: errorMsg, details: error });
                throw error;
            }
            return data as WalletData;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger.error('Error creating wallet:', { error: errorMsg, details: JSON.stringify(err) });
            throw err;
        }
    }

    // Initiate wallet topup
    async initiateTopup(request: TopupRequest) {
        try {
            const { merchantId: userId, amount } = request;

            logger.info('💳 Initiating wallet topup', { userId, amount });

            // ✅ Get actual merchant_id from merchant_sync
            const merchantId = await this.getMerchantSyncId(userId);
            logger.info('✓ Got merchant_id from user_id', { userId, merchantId });

            // Ensure wallet exists
            const wallet = await this.getWalletBalance(userId);
            logger.info('✓ Wallet loaded', { walletId: wallet.id, balance: wallet.balance });

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
            await this.recordTopupTransaction(
                merchantId,
                wallet.id,
                'TOPUP',
                amount,
                'PENDING',
                txnId,
                'Wallet topup initiated'
            );

            logger.info('✅ Topup initiated', {
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
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger.error('Error initiating topup:', { error: errorMsg });
            throw err;
        }
    }

    // Process payment callback
    async processPaymentCallback(callbackData: PaymentCallbackData) {
        try {
            logger.info('📨 Processing payment callback', { callbackData });

            const { txnId, amount, status, atomTxnId } = callbackData;

            // ✅ AUDIT: Log webhook to merchant_webhooks
            await this.logWebhook('payment_callback', callbackData as Record<string, unknown>, status);

            const { data: transaction, error: txnError } = await supabase
                .from('wallet_topup_transactions')
                .select('*')
                .eq('reference_id', txnId)
                .single();

            if (txnError || !transaction) {
                logger.error('Transaction not found:', { txnId });
                throw new Error('Transaction not found');
            }

            const txnData = transaction as TransactionData;
            const merchantId = txnData.merchant_id;
            const walletId = txnData.wallet_id;

            if (status === 'SUCCESS' || status === 'OTS0000') {
                const { data: wallet, error: walletError } = await supabase
                    .from('merchant_wallet')
                    .select('balance')
                    .eq('id', walletId)
                    .single();

                if (walletError || !wallet) {
                    throw new Error('Wallet not found');
                }

                const walletData = wallet as { balance: number };
                const balanceBefore = walletData.balance;
                const newBalance = balanceBefore + amount;

                logger.info('💰 Updating wallet balance', {
                    walletId,
                    balanceBefore,
                    amount,
                    newBalance
                });

                // ✅ Update merchant_wallet
                const { error: updateError } = await supabase
                    .from('merchant_wallet')
                    .update({
                        balance: newBalance,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', walletId);

                if (updateError) {
                    logger.error('Failed to update wallet balance', { error: updateError });
                    throw new Error('Failed to update wallet balance');
                }

                logger.info('✓ Wallet balance updated successfully');

                // ✅ Update wallet_topup_transactions
                await supabase
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
                await this.recordWalletTransaction(
                    merchantId,
                    'topup',
                    amount,
                    balanceBefore,
                    newBalance,
                    null, // order_id
                    `Wallet topup via payment gateway`,
                    {
                        reference_id: txnId,
                        atomTxnId: atomTxnId,
                        payment_method: 'gateway'
                    }
                );

                logger.info('✅ Wallet topup successful', {
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
            } else {
                // Payment failed
                await supabase
                    .from('wallet_topup_transactions')
                    .update({
                        status: 'FAILED',
                        metadata: {
                            atomTxnId,
                            failed_at: new Date().toISOString()
                        }
                    })
                    .eq('id', txnData.id);

                logger.warn('❌ Payment failed', { txnId, status });

                return {
                    success: false,
                    message: 'Payment failed',
                    status
                };
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger.error('Error processing callback:', { error: errorMsg });
            throw err;
        }
    }

    // Deduct from wallet for voucher purchase
    async deductWalletBalance(userId: string, amount: number, orderId: string) {
        try {
            const wallet = await this.getWalletBalance(userId);

            if (wallet.balance < amount) {
                throw new Error('Insufficient wallet balance');
            }

            const merchantId = await this.getMerchantSyncId(userId);
            const balanceBefore = wallet.balance;
            const newBalance = wallet.balance - amount;

            // Update wallet
            await supabase
                .from('merchant_wallet')
                .update({
                    balance: newBalance,
                    updated_at: new Date().toISOString()
                })
                .eq('id', wallet.id);

            // ✅ AUDIT: Record in wallet_transactions
            await this.recordWalletTransaction(
                merchantId,
                'debit',
                amount,
                balanceBefore,
                newBalance,
                orderId,
                'Voucher purchase deduction',
                {
                    order_id: orderId,
                    transaction_type: 'voucher_purchase'
                }
            );

            logger.info('✅ Wallet debited for voucher purchase', {
                userId,
                amount,
                newBalance,
                orderId
            });

            return { success: true, newBalance };
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger.error('Error deducting wallet balance:', { error: errorMsg });
            throw err;
        }
    }

    // ✅ NEW: Record in wallet_topup_transactions (specific)
    private async recordTopupTransaction(
        merchantId: string,
        walletId: string,
        type: string,
        amount: number,
        status: string,
        referenceId: string,
        description: string
    ) {
        try {
            const txnData = {
                id: uuidv4(),
                merchant_id: merchantId,
                wallet_id: walletId,
                transaction_type: type,
                amount,
                status,
                reference_id: referenceId,
                description,
                created_at: new Date().toISOString()
            };

            logger.info('Recording topup transaction:', { txnData });

            const { data, error } = await supabase
                .from('wallet_topup_transactions')
                .insert([txnData])
                .select();

            if (error) {
                logger.error('Failed to record topup transaction:', {
                    error: error.message,
                    code: error.code
                });
                throw error;
            }

            logger.info('✅ Topup transaction recorded:', { transactionId: data?.[0]?.id });
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger.error('Error recording topup transaction:', { error: errorMsg });
            throw err;
        }
    }

    // ✅ Record in wallet_transactions (general ledger for audit) - WITH FULL DEBUG
    private async recordWalletTransaction(
        merchantId: string,
        transactionType: string,
        amount: number,
        balanceBefore: number,
        balanceAfter: number,
        orderId: string | null,
        description: string,
        metadata: Record<string, unknown>
    ) {
        try {
            logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            logger.info('📝 STARTING wallet_transactions INSERT');
            logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            const txnData = {
                id: uuidv4(),
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

            logger.info('🔍 Transaction data prepared:', {
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

            logger.info('🚀 Calling Supabase insert on wallet_transactions...');

            const { data, error } = await supabase
                .from('wallet_transactions')
                .insert([txnData])
                .select();

            logger.info('📥 Supabase response received');
            logger.info('🔍 Checking response:', {
                hasError: !!error,
                hasData: !!data,
                dataLength: data?.length,
                errorObject: error ? JSON.stringify(error) : 'none'
            });
            if (error) {
                logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                logger.error('❌ SUPABASE INSERT ERROR', {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint,
                    fullError: JSON.stringify(error, null, 2)
                });
                logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                return;
            }
            if (!data || data.length === 0) {
                logger.warn('⚠️ No data returned but no error either!', {
                    data: data,
                    error: error
                });
                return;
            }
            logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            logger.info('✅ SUCCESS: wallet_transactions INSERT COMPLETED', {
                id: data?.[0]?.id,
                merchant_id: data?.[0]?.merchant_id,
                transaction_type: data?.[0]?.transaction_type,
                amount: data?.[0]?.amount
            });
            logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        } catch (err) {
            logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            logger.error('🔴 EXCEPTION in recordWalletTransaction', {
                message: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : 'No stack trace'
            });
            logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }
    }

    // ✅ NEW: Log webhook callbacks for audit
    // Line ~285-320
    private async logWebhook(
        eventType: string,
        payload: unknown,
        status: string
    ) {
        try {
            const webhookData = {
                id: uuidv4(),
                event_type: eventType,  // ← This column exists in webhook_logs
                payload,
                status,
                received_at: new Date().toISOString(),
                processed: true,
                created_at: new Date().toISOString()
            };

            logger.info('📝 Logging webhook event:', { eventType, status });

            const { error } = await supabase
                .from('webhook_logs')  // ← Changed from merchant_webhooks
                .insert([webhookData]);

            if (error) {
                logger.error('❌ Failed to log webhook:', {
                    error: error.message,
                    code: error.code
                });
            } else {
                logger.info('✅ Webhook logged successfully');
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger.error('Error logging webhook:', { error: errorMsg });
        }
    }

    // Call NDPS payment initiate (or mock)
    private async callNDPSPaymentInitiate(paymentData: unknown) {
        try {
            const NDPS_URL = process.env.NDPS_SERVER_URL || 'https://sabbpe-uat-988626072499.asia-south1.run.app';

            logger.info('📤 Calling NDPS payment initiate...', { url: NDPS_URL });

            const response = await axios.post(`${NDPS_URL}/api/payment/initiate`, paymentData as Record<string, unknown>, {
                timeout: 10000
            });

            return response.data as Record<string, unknown>;
        } catch (error) {
            logger.warn('⚠️ NDPS call failed, using mock payment', {
                error: error instanceof Error ? error.message : String(error)
            });

            const payData = paymentData as Record<string, unknown>;

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

export const walletService = new WalletService();
