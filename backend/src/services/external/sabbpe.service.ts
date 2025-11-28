// ============================================
// FILE 1: src/services/external/sabbpe.service.ts
// ============================================

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { config } from '@/config/env';
import { logger } from '@/utils/logger';

export interface SabbpePaymentInitRequest {
  merchantId: string;
  orderId: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerPhone: string;
  description: string;
  returnUrl: string;
  notifyUrl: string;
}

export interface SabbpePaymentInitResponse {
  success: boolean;
  paymentId: string;
  paymentUrl: string;
  expiresAt: string;
  amount: number;
  orderId: string;
}

export interface SabbpeWebhookPayload {
  paymentId: string;
  orderId: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  amount: number;
  currency: string;
  timestamp: string;
  signature: string;
  metadata?: Record<string, unknown>;
}

export interface SabbpeMerchantOnboardingRequest {
  businessName: string;
  email: string;
  mobileNumber: string;
  panNumber?: string;
  gstNumber?: string;
  upiVpa?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
}

export interface SabbpeMerchantOnboardingResponse {
  success: boolean;
  merchantId: string;
  status: 'pending' | 'approved' | 'rejected';
  kycUrl?: string;
  message: string;
}

export class SabbpeService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: config.sabbpeApiBaseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.sabbpeApiKey,
      },
    });
  }

  /**
   * Generate HMAC-SHA256 signature for request
   */
  private generateSignature(payload: Record<string, unknown>): string {
    const message = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', config.sabbpeApiSecret)
      .update(message)
      .digest('hex');

    logger.debug('Signature generated', { payloadLength: message.length });
    return signature;
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: SabbpeWebhookPayload, receivedSignature: string): boolean {
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
        logger.warn('Webhook signature verification failed', {
          paymentId: payload.paymentId,
          expected: expectedSignature.substring(0, 8),
          received: receivedSignature.substring(0, 8),
        });
      } else {
        logger.debug('Webhook signature verified', { paymentId: payload.paymentId });
      }

      return isValid;
    } catch (error) {
      logger.error('Signature verification error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Initiate payment with Sabbpe
   */
  async initiatePayment(request: SabbpePaymentInitRequest): Promise<SabbpePaymentInitResponse> {
    try {
      logger.info('Initiating Sabbpe payment', {
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

      logger.info('✓ Payment initiated with Sabbpe', {
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
    } catch (error) {
      logger.error('Failed to initiate payment with Sabbpe', {
        orderId: request.orderId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<{ status: string; amount: number }> {
    try {
      logger.info('Fetching payment status from Sabbpe', { paymentId });

      const response = await this.axiosInstance.get(`/payments/${paymentId}/status`);

      if (!response.data.success) {
        throw new Error(`Failed to fetch payment status: ${response.data.message}`);
      }

      logger.info('✓ Payment status fetched', {
        paymentId,
        status: response.data.status,
      });

      return {
        status: response.data.status,
        amount: response.data.amount,
      };
    } catch (error) {
      logger.error('Failed to fetch payment status', {
        paymentId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Refund payment
   */
  async refundPayment(paymentId: string, amount?: number): Promise<{ success: boolean; refundId: string }> {
    try {
      logger.info('Processing refund with Sabbpe', { paymentId, amount });

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

      logger.info('✓ Refund processed', {
        paymentId,
        refundId: response.data.refundId,
      });

      return {
        success: true,
        refundId: response.data.refundId,
      };
    } catch (error) {
      logger.error('Failed to process refund', {
        paymentId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Onboard merchant with Sabbpe
   */
  async onboardMerchant(request: SabbpeMerchantOnboardingRequest): Promise<SabbpeMerchantOnboardingResponse> {
    try {
      logger.info('Onboarding merchant with Sabbpe', { email: request.email });

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

      logger.info('✓ Merchant onboarded with Sabbpe', {
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
    } catch (error) {
      logger.error('Failed to onboard merchant', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get merchant status
   */
  async getMerchantStatus(merchantId: string): Promise<{ status: string; kycStatus: string }> {
    try {
      logger.info('Fetching merchant status from Sabbpe', { merchantId });

      const response = await this.axiosInstance.get(`/merchants/${merchantId}/status`);

      if (!response.data.success) {
        throw new Error(`Failed to fetch merchant status: ${response.data.message}`);
      }

      logger.info('✓ Merchant status fetched', {
        merchantId,
        status: response.data.status,
      });

      return {
        status: response.data.status,
        kycStatus: response.data.kycStatus,
      };
    } catch (error) {
      logger.error('Failed to fetch merchant status', {
        merchantId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export const sabbpeService = new SabbpeService();