import { MerchantProfile } from '../../types/database';
export interface MerchantKYCSubmissionDTO {
    merchantId: string;
    videoKycFilePath?: string;
    selfieFilePath?: string;
    latitude?: number;
    longitude?: number;
}
export interface MerchantDocumentUploadDTO {
    merchantId: string;
    documentType: 'pan' | 'gst' | 'aadhar' | 'business_license' | 'bank_statement';
    fileName: string;
    filePath: string;
    mimeType: string;
    fileSize: number;
}
export interface MerchantApprovalRequest {
    merchantId: string;
    approvalStatus: 'approved' | 'rejected';
    rejectionReason?: string;
    riskLevel?: 'low' | 'medium' | 'high';
}
export interface MerchantDashboardDTO {
    merchant: MerchantProfile;
    kycStatus: string;
    approvalStatus: string;
    documents: Array<{
        type: string;
        status: string;
    }>;
    onboardingSabbpeStatus?: string;
    canMakePurchases: boolean;
}
export declare class MerchantService {
    /**
     * Get merchant profile
     */
    getMerchantProfile(merchantId: string): Promise<MerchantProfile>;
    /**
     * Submit KYC
     */
    submitKYC(data: MerchantKYCSubmissionDTO): Promise<void>;
    /**
     * Upload merchant document
     */
    uploadDocument(data: MerchantDocumentUploadDTO): Promise<void>;
    /**
     * Get merchant KYC status
     */
    getKYCStatus(merchantId: string): Promise<any>;
    /**
     * Get merchant documents
     */
    getDocuments(merchantId: string): Promise<unknown[]>;
    /**
     * Get merchant dashboard
     */
    getDashboard(merchantId: string): Promise<MerchantDashboardDTO>;
    /**
     * Verify document (admin)
     */
    verifyDocument(documentId: string, approvedBy: string, status: 'verified' | 'rejected', rejectionReason?: string): Promise<void>;
    /**
     * Approve merchant
     */
    approveMerchant(request: MerchantApprovalRequest, approvedBy: string): Promise<void>;
    /**
     * Get pending approvals (admin)
     */
    getPendingApprovals(limit?: number, offset?: number): Promise<{
        merchants: MerchantProfile[];
        total: number;
    }>;
    /**
     * Onboard merchant with Sabbpe
     */
    onboardWithSabbpe(merchantId: string): Promise<{
        kycUrl: string;
        status: string;
    }>;
}
export declare const merchantService: MerchantService;
//# sourceMappingURL=merchant.service.d.ts.map