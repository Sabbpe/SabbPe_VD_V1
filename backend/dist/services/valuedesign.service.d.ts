interface BrandData {
    brandCode: string;
    brandName: string;
    brandImage?: string;
    categoryId?: string;
    categoryName?: string;
    skuCode?: string;
    denomination?: string;
    [key: string]: any;
}
interface EVCItem {
    getCardNo: string;
    getCardPin: string;
    getCardStatus: string;
    getExpiryDate: string;
    balanceBasic: string;
    balanceBonus: string;
    balanceTotal: string;
}
interface EVCBrandDetail {
    product_name: string;
    voucher_name: string;
    items: EVCItem[];
}
interface EVCResponse {
    resultCode?: string | number;
    responseCode?: string | number;
    getMarketingMessage?: string;
    responseMsg?: string;
    statusmessage?: string;
    order_id?: string;
    request_ref_no?: string;
    data?: string;
    brand_details?: EVCBrandDetail[];
    wallet_balance?: string;
    isPending?: boolean;
    [key: string]: any;
}
interface GetEVCParams {
    orderId: string;
    skuCode: string;
    noOfCard: number;
    amount: string;
    receiptNo: string;
    reqId: string;
    firstName?: string;
    lastName?: string;
    mobileNo?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
}
declare class ValueDesignService {
    private client;
    private token;
    private tokenExpiryTime;
    constructor();
    /**
     * Encrypt data using AES-256-CBC
     */
    private encrypt;
    /**
     * Decrypt data using AES-256-CBC
     */
    private decrypt;
    /**
     * Load token from database
     */
    private loadTokenFromDatabase;
    /**
     * Save token to database
     */
    private saveTokenToDatabase;
    /**
     * Generate authentication token
     */
    generateToken(): Promise<string>;
    /**
    * Get brands from ValueDesign
    */
    getBrands(brandCode?: string): Promise<BrandData[]>;
    /**
     * Get stores for a brand
     */
    getStores(brandCode: string): Promise<any>;
    /**
     * Get available EVCs (e-vouchers) for a brand
     */
    getEVCs(params: GetEVCParams): Promise<EVCResponse>;
    /**
     * Get EVC Status
     */
    getEVCStatus(orderId: string, requestRefNo: string): Promise<any>;
    /**
     * Get Activated EVC
     */
    getActivatedEVC(orderId: string, requestRefNo: string): Promise<any>;
    /**
     * Get account wallet balance
     */
    getWalletBalance(): Promise<string>;
}
export declare const valueDesignService: ValueDesignService;
export default ValueDesignService;
//# sourceMappingURL=valuedesign.service.d.ts.map