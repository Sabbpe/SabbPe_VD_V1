"use strict";
// ============================================
// FILE 1: src/services/external/sabbpe.service.ts
// ============================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sabbpeService = exports.SabbpeService = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../../config/env");
const logger_1 = require("../../utils/logger");
class SabbpeService {
    constructor() {
        this.axiosInstance = axios_1.default.create({
            baseURL: env_1.config.sabbpeApiBaseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': env_1.config.sabbpeApiKey,
            },
        });
    }
    /**
     * Generate HMAC-SHA256 signature for request
     */
    generateSignature(payload) {
        const message = JSON.stringify(payload);
        const signature = crypto_1.default
            .createHmac('sha256', env_1.config.sabbpeApiSecret)
            .update(message)
            .digest('hex');
        logger_1.logger.debug('Signature generated', { payloadLength: message.length });
        return signature;
    }
    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload, receivedSignature) {
        try {
            const payloadToVerify = {
                paymentId: payload.paymentId,
                orderId: payload.orderId,
                status: payload.status,
                amount: payload.amount,
                currency: payload.currency,
                timestamp: payload.timestamp,
            };
            const expectedSignature = this.generateSignature(payloadToVerify);
            const isValid = expectedSignature === receivedSignature;
            if (!isValid) {
                logger_1.logger.warn('Webhook signature verification failed', {
                    paymentId: payload.paymentId,
                    expected: expectedSignature.substring(0, 8),
                    received: receivedSignature.substring(0, 8),
                });
            }
            else {
                logger_1.logger.debug('Webhook signature verified', { paymentId: payload.paymentId });
            }
            return isValid;
        }
        catch (error) {
            logger_1.logger.error('Signature verification error', {
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }
    /**
     * Initiate payment with Sabbpe
     */
    async initiatePayment(request) {
        try {
            logger_1.logger.info('Initiating Sabbpe payment', {
                orderId: request.orderId,
                amount: request.amount,
            });
            const payload = {
                merchantId: request.merchantId,
                orderId: request.orderId,
                amount: request.amount,
                currency: request.currency,
                customerEmail: request.customerEmail,
                customerPhone: request.customerPhone,
                description: request.description,
                returnUrl: request.returnUrl,
                notifyUrl: request.notifyUrl,
                timestamp: new Date().toISOString(),
            };
            const signature = this.generateSignature(payload);
            const response = await this.axiosInstance.post('/payments/initiate', payload, {
                headers: {
                    'X-Signature': signature,
                },
            });
            if (!response.data.success) {
                throw new Error(`Payment initiation failed: ${response.data.message}`);
            }
            logger_1.logger.info('✓ Payment initiated with Sabbpe', {
                paymentId: response.data.paymentId,
                orderId: request.orderId,
            });
            return {
                success: true,
                paymentId: response.data.paymentId,
                paymentUrl: response.data.paymentUrl,
                expiresAt: response.data.expiresAt,
                amount: response.data.amount,
                orderId: response.data.orderId,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to initiate payment with Sabbpe', {
                orderId: request.orderId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Get payment status
     */
    async getPaymentStatus(paymentId) {
        try {
            logger_1.logger.info('Fetching payment status from Sabbpe', { paymentId });
            const response = await this.axiosInstance.get(`/payments/${paymentId}/status`);
            if (!response.data.success) {
                throw new Error(`Failed to fetch payment status: ${response.data.message}`);
            }
            logger_1.logger.info('✓ Payment status fetched', {
                paymentId,
                status: response.data.status,
            });
            return {
                status: response.data.status,
                amount: response.data.amount,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch payment status', {
                paymentId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Refund payment
     */
    async refundPayment(paymentId, amount) {
        try {
            logger_1.logger.info('Processing refund with Sabbpe', { paymentId, amount });
            const payload = {
                paymentId,
                amount,
                timestamp: new Date().toISOString(),
            };
            const signature = this.generateSignature(payload);
            const response = await this.axiosInstance.post('/payments/refund', payload, {
                headers: {
                    'X-Signature': signature,
                },
            });
            if (!response.data.success) {
                throw new Error(`Refund failed: ${response.data.message}`);
            }
            logger_1.logger.info('✓ Refund processed', {
                paymentId,
                refundId: response.data.refundId,
            });
            return {
                success: true,
                refundId: response.data.refundId,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to process refund', {
                paymentId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Onboard merchant with Sabbpe
     */
    async onboardMerchant(request) {
        try {
            logger_1.logger.info('Onboarding merchant with Sabbpe', { email: request.email });
            const payload = {
                businessName: request.businessName,
                email: request.email,
                mobileNumber: request.mobileNumber,
                panNumber: request.panNumber,
                gstNumber: request.gstNumber,
                upiVpa: request.upiVpa,
                bankAccountNumber: request.bankAccountNumber,
                ifscCode: request.ifscCode,
                accountHolderName: request.accountHolderName,
                timestamp: new Date().toISOString(),
            };
            const signature = this.generateSignature(payload);
            const response = await this.axiosInstance.post('/merchants/onboard', payload, {
                headers: {
                    'X-Signature': signature,
                },
            });
            if (!response.data.success) {
                throw new Error(`Merchant onboarding failed: ${response.data.message}`);
            }
            logger_1.logger.info('✓ Merchant onboarded with Sabbpe', {
                merchantId: response.data.merchantId,
                status: response.data.status,
            });
            return {
                success: true,
                merchantId: response.data.merchantId,
                status: response.data.status,
                kycUrl: response.data.kycUrl,
                message: response.data.message,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to onboard merchant', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Get merchant status
     */
    async getMerchantStatus(merchantId) {
        try {
            logger_1.logger.info('Fetching merchant status from Sabbpe', { merchantId });
            const response = await this.axiosInstance.get(`/merchants/${merchantId}/status`);
            if (!response.data.success) {
                throw new Error(`Failed to fetch merchant status: ${response.data.message}`);
            }
            logger_1.logger.info('✓ Merchant status fetched', {
                merchantId,
                status: response.data.status,
            });
            return {
                status: response.data.status,
                kycStatus: response.data.kycStatus,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch merchant status', {
                merchantId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
}
exports.SabbpeService = SabbpeService;
exports.sabbpeService = new SabbpeService();
//# sourceMappingURL=sabbpe.service.js.map