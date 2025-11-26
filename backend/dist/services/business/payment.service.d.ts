import { SabbpeWebhookPayload } from '../../services/external/sabbpe.service';
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
export declare class PaymentService {
    /**
     * Format EVC card data from ValueDesign response
     */
    private formatEVCCard;
    /**
     * Initiate payment for an order
     */
    initiatePayment(data: PaymentInitiateDTO, returnUrl: string, notifyUrl: string): Promise<{
        paymentUrl: string;
        paymentId: string;
    }>;
    /**
     * Handle payment webhook from Sabbpe
     */
    handlePaymentWebhook(payload: SabbpeWebhookPayload): Promise<void>;
    /**
     * Handle successful payment
     */
    private handlePaymentSuccess;
    /**
     * Handle failed payment
     */
    private handlePaymentFailure;
    /**
     * Get payment status
     */
    getPaymentStatus(orderId: string): Promise<PaymentStatusDTO>;
    /**
     * Refund payment for cancelled order
     */
    refundPayment(orderId: string, reason: string): Promise<{
        refundId: string;
    }>;
}
export declare const paymentService: PaymentService;
//# sourceMappingURL=payment.service.d.ts.map