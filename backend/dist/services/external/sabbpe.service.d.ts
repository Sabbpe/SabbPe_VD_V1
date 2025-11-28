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
export declare class SabbpeService {
    private axiosInstance;
    constructor();
    /**
     * Generate HMAC-SHA256 signature for request
     */
    private generateSignature;
    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload: SabbpeWebhookPayload, receivedSignature: string): boolean;
    /**
     * Initiate payment with Sabbpe
     */
    initiatePayment(request: SabbpePaymentInitRequest): Promise<SabbpePaymentInitResponse>;
    /**
     * Get payment status
     */
    getPaymentStatus(paymentId: string): Promise<{
        status: string;
        amount: number;
    }>;
    /**
     * Refund payment
     */
    refundPayment(paymentId: string, amount?: number): Promise<{
        success: boolean;
        refundId: string;
    }>;
    /**
     * Onboard merchant with Sabbpe
     */
    onboardMerchant(request: SabbpeMerchantOnboardingRequest): Promise<SabbpeMerchantOnboardingResponse>;
    /**
     * Get merchant status
     */
    getMerchantStatus(merchantId: string): Promise<{
        status: string;
        kycStatus: string;
    }>;
}
export declare const sabbpeService: SabbpeService;
//# sourceMappingURL=sabbpe.service.d.ts.map