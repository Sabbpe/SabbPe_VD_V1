export interface Payment {
    id: string;
    order_id: string;
    sabbpe_payment_id: string;
    amount: number;
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
    webhook_received_at?: string;
    created_at: string;
    updated_at: string;
}
export interface PaymentWebhook {
    paymentId: string;
    orderId: string;
    status: 'SUCCESS' | 'FAILED' | 'PENDING';
    amount: number;
    currency: string;
    timestamp: string;
    signature: string;
    metadata?: Record<string, unknown>;
}
export interface PaymentInitRequest {
    orderId: string;
    amount: number;
    customerEmail: string;
    customerPhone: string;
    description: string;
}
export interface PaymentInitResponse {
    paymentId: string;
    paymentUrl: string;
    status: string;
    expiresAt: string;
}
//# sourceMappingURL=payment.types.d.ts.map