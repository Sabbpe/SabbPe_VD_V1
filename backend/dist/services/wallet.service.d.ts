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
    [key: string]: unknown;
}
interface WalletData {
    id: string;
    balance: number;
}
export declare class WalletService {
    getMerchantSyncId(userId: string): Promise<string>;
    getWalletBalance(userId: string): Promise<WalletData>;
    createWallet(merchantId: string): Promise<WalletData>;
    initiateTopup(request: TopupRequest): Promise<{
        success: boolean;
        txnId: string;
        atomTokenId: unknown;
        publicReturnUrl: unknown;
        amount: number;
    }>;
    processPaymentCallback(callbackData: PaymentCallbackData): Promise<{
        success: boolean;
        message: string;
        balanceBefore: number;
        newBalance: number;
        status?: undefined;
    } | {
        success: boolean;
        message: string;
        status: string;
        balanceBefore?: undefined;
        newBalance?: undefined;
    }>;
    deductWalletBalance(userId: string, amount: number, orderId: string): Promise<{
        success: boolean;
        newBalance: number;
    }>;
    private recordTopupTransaction;
    private recordWalletTransaction;
    private logWebhook;
    private callNDPSPaymentInitiate;
}
export declare const walletService: WalletService;
export {};
//# sourceMappingURL=wallet.service.d.ts.map