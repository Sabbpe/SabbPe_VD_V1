"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.merchantService = exports.MerchantService = void 0;
const supabase_1 = require("../../config/supabase");
const sabbpe_service_1 = require("../../services/external/sabbpe.service");
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
class MerchantService {
    /**
     * Get merchant profile
     */
    async getMerchantProfile(merchantId) {
        try {
            logger_1.logger.info('Fetching merchant profile', { merchantId });
            const { data: merchant, error } = await supabase_1.supabase
                .from('merchant_profiles')
                .select('*')
                .eq('id', merchantId)
                .single();
            if (error || !merchant) {
                throw new errors_1.NotFoundError('Merchant profile');
            }
            logger_1.logger.info('✓ Merchant profile fetched', { merchantId });
            return merchant;
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch merchant profile', {
                merchantId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Submit KYC
     */
    async submitKYC(data) {
        try {
            logger_1.logger.info('Submitting merchant KYC', { merchantId: data.merchantId });
            // Check if KYC already exists
            const { data: existingKyc } = await supabase_1.supabase
                .from('merchant_kyc')
                .select('id')
                .eq('merchant_id', data.merchantId)
                .single();
            if (existingKyc) {
                // Update existing KYC
                const { error } = await supabase_1.supabase
                    .from('merchant_kyc')
                    .update({
                    video_kyc_file_path: data.videoKycFilePath,
                    selfie_file_path: data.selfieFilePath,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    location_captured: !!(data.latitude && data.longitude),
                    kyc_status: 'pending',
                    updated_at: new Date().toISOString(),
                })
                    .eq('merchant_id', data.merchantId);
                if (error) {
                    throw new Error(`Failed to update KYC: ${error.message}`);
                }
            }
            else {
                // Create new KYC
                const { error } = await supabase_1.supabase
                    .from('merchant_kyc')
                    .insert([
                    {
                        merchant_id: data.merchantId,
                        video_kyc_file_path: data.videoKycFilePath,
                        selfie_file_path: data.selfieFilePath,
                        latitude: data.latitude,
                        longitude: data.longitude,
                        location_captured: !!(data.latitude && data.longitude),
                        kyc_status: 'pending',
                    },
                ]);
                if (error) {
                    throw new Error(`Failed to create KYC: ${error.message}`);
                }
            }
            // Update merchant onboarding status
            await supabase_1.supabase
                .from('merchant_profiles')
                .update({
                onboarding_status: 'submitted',
                submitted_at: new Date().toISOString(),
            })
                .eq('id', data.merchantId);
            // Log audit trail
            await supabase_1.supabase.from('onboarding_audit_log').insert([
                {
                    merchant_id: data.merchantId,
                    action: 'KYC_SUBMITTED',
                    new_status: 'submitted',
                    notes: 'Merchant submitted KYC documents',
                },
            ]);
            logger_1.logger.info('✓ KYC submitted', { merchantId: data.merchantId });
        }
        catch (error) {
            logger_1.logger.error('Failed to submit KYC', {
                merchantId: data.merchantId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Upload merchant document
     */
    async uploadDocument(data) {
        try {
            logger_1.logger.info('Uploading merchant document', {
                merchantId: data.merchantId,
                documentType: data.documentType,
            });
            // Validate document type
            const validTypes = ['pan', 'gst', 'aadhar', 'business_license', 'bank_statement'];
            if (!validTypes.includes(data.documentType)) {
                throw new errors_1.ValidationError(`Invalid document type: ${data.documentType}`);
            }
            // Insert document record
            const { error } = await supabase_1.supabase.from('merchant_documents').insert([
                {
                    merchant_id: data.merchantId,
                    document_type: data.documentType,
                    file_name: data.fileName,
                    file_path: data.filePath,
                    mime_type: data.mimeType,
                    file_size: data.fileSize,
                    status: 'pending',
                },
            ]);
            if (error) {
                throw new Error(`Failed to upload document: ${error.message}`);
            }
            // Log audit trail
            await supabase_1.supabase.from('onboarding_audit_log').insert([
                {
                    merchant_id: data.merchantId,
                    action: 'DOCUMENT_UPLOADED',
                    notes: `Document uploaded: ${data.documentType}`,
                },
            ]);
            logger_1.logger.info('✓ Document uploaded', {
                merchantId: data.merchantId,
                documentType: data.documentType,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to upload document', {
                merchantId: data.merchantId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Get merchant KYC status
     */
    async getKYCStatus(merchantId) {
        try {
            logger_1.logger.info('Fetching KYC status', { merchantId });
            const { data: kyc, error } = await supabase_1.supabase
                .from('merchant_kyc')
                .select('*')
                .eq('merchant_id', merchantId)
                .single();
            if (error && error.code !== 'PGRST116') {
                throw new Error(`Failed to fetch KYC: ${error.message}`);
            }
            logger_1.logger.info('✓ KYC status fetched', { merchantId });
            return kyc || null;
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch KYC status', {
                merchantId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Get merchant documents
     */
    async getDocuments(merchantId) {
        try {
            logger_1.logger.info('Fetching merchant documents', { merchantId });
            const { data: documents, error } = await supabase_1.supabase
                .from('merchant_documents')
                .select('*')
                .eq('merchant_id', merchantId)
                .order('uploaded_at', { ascending: false });
            if (error) {
                throw new Error(`Failed to fetch documents: ${error.message}`);
            }
            logger_1.logger.info('✓ Documents fetched', { count: documents?.length || 0 });
            return documents || [];
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch documents', {
                merchantId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Get merchant dashboard
     */
    async getDashboard(merchantId) {
        try {
            logger_1.logger.info('Fetching merchant dashboard', { merchantId });
            const merchant = await this.getMerchantProfile(merchantId);
            const kyc = await this.getKYCStatus(merchantId);
            const documents = await this.getDocuments(merchantId);
            const { data: merchantSync } = await supabase_1.supabase
                .from('merchant_sync')
                .select('*')
                .eq('merchant_id', merchantId)
                .single();
            const canMakePurchases = merchant.onboarding_status === 'approved' && merchantSync?.is_approved;
            logger_1.logger.info('✓ Dashboard data fetched', { merchantId });
            return {
                merchant,
                kycStatus: kyc?.kyc_status || 'not_started',
                approvalStatus: merchant.onboarding_status,
                documents: documents.map((doc) => ({
                    type: doc.document_type,
                    status: doc.status,
                })),
                onboardingSabbpeStatus: merchantSync?.is_approved ? 'approved' : 'pending',
                canMakePurchases,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch dashboard', {
                merchantId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Verify document (admin)
     */
    async verifyDocument(documentId, approvedBy, status, rejectionReason) {
        try {
            logger_1.logger.info('Verifying document', { documentId, status });
            const updateData = {
                status,
                verified_at: new Date().toISOString(),
                verified_by: approvedBy,
            };
            if (status === 'rejected' && rejectionReason) {
                updateData.rejection_reason = rejectionReason;
            }
            const { error } = await supabase_1.supabase
                .from('merchant_documents')
                .update(updateData)
                .eq('id', documentId);
            if (error) {
                throw new Error(`Failed to verify document: ${error.message}`);
            }
            logger_1.logger.info('✓ Document verified', { documentId, status });
        }
        catch (error) {
            logger_1.logger.error('Failed to verify document', {
                documentId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Approve merchant
     */
    async approveMerchant(request, approvedBy) {
        try {
            logger_1.logger.info('Processing merchant approval', {
                merchantId: request.merchantId,
                status: request.approvalStatus,
            });
            const newStatus = request.approvalStatus === 'approved' ? 'approved' : 'rejected';
            // Update merchant profile
            const updateData = {
                onboarding_status: newStatus,
                reviewed_at: new Date().toISOString(),
                reviewed_by: approvedBy,
                risk_level: request.riskLevel || 'medium',
            };
            if (request.approvalStatus === 'rejected') {
                updateData.rejection_reason = request.rejectionReason;
            }
            const { error } = await supabase_1.supabase
                .from('merchant_profiles')
                .update(updateData)
                .eq('id', request.merchantId);
            if (error) {
                throw new Error(`Failed to update merchant: ${error.message}`);
            }
            // Update merchant_sync
            await supabase_1.supabase
                .from('merchant_sync')
                .update({
                is_approved: request.approvalStatus === 'approved',
                approved_at: request.approvalStatus === 'approved' ? new Date().toISOString() : null,
            })
                .eq('merchant_id', request.merchantId);
            // Update KYC status
            await supabase_1.supabase
                .from('merchant_kyc')
                .update({
                kyc_status: newStatus,
                verified_at: new Date().toISOString(),
                verified_by: approvedBy,
            })
                .eq('merchant_id', request.merchantId);
            // Log approval status change
            await supabase_1.supabase.from('application_status_history').insert([
                {
                    merchant_id: request.merchantId,
                    previous_status: 'submitted',
                    new_status: newStatus,
                    changed_by: approvedBy,
                    reason: request.rejectionReason || 'Approved by admin review',
                },
            ]);
            // Log audit trail
            await supabase_1.supabase.from('onboarding_audit_log').insert([
                {
                    merchant_id: request.merchantId,
                    action: `MERCHANT_${newStatus.toUpperCase()}`,
                    new_status: newStatus,
                    performed_by: approvedBy,
                    notes: request.rejectionReason || 'Merchant approved',
                },
            ]);
            // Create notification
            await supabase_1.supabase.from('notifications').insert([
                {
                    user_id: null, // Would be merchant's user_id
                    type: request.approvalStatus === 'approved' ? 'success' : 'error',
                    title: request.approvalStatus === 'approved' ? 'Account Approved' : 'Account Rejected',
                    message: request.approvalStatus === 'approved'
                        ? 'Your merchant account has been approved. You can now purchase vouchers.'
                        : `Your merchant account has been rejected. Reason: ${request.rejectionReason}`,
                },
            ]);
            logger_1.logger.info('✓ Merchant approval processed', {
                merchantId: request.merchantId,
                status: newStatus,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to approve merchant', {
                merchantId: request.merchantId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Get pending approvals (admin)
     */
    async getPendingApprovals(limit = 50, offset = 0) {
        try {
            logger_1.logger.info('Fetching pending approvals', { limit, offset });
            const { count } = await supabase_1.supabase
                .from('merchant_profiles')
                .select('id', { count: 'exact', head: true })
                .eq('onboarding_status', 'submitted');
            const { data: merchants, error } = await supabase_1.supabase
                .from('merchant_profiles')
                .select('*')
                .eq('onboarding_status', 'submitted')
                .order('submitted_at', { ascending: true })
                .range(offset, offset + limit - 1);
            if (error) {
                throw new Error(`Failed to fetch pending approvals: ${error.message}`);
            }
            logger_1.logger.info('✓ Pending approvals fetched', { count: merchants?.length || 0 });
            return {
                merchants: merchants || [],
                total: count || 0,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch pending approvals', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Onboard merchant with Sabbpe
     */
    async onboardWithSabbpe(merchantId) {
        try {
            logger_1.logger.info('Onboarding merchant with Sabbpe', { merchantId });
            const merchant = await this.getMerchantProfile(merchantId);
            const response = await sabbpe_service_1.sabbpeService.onboardMerchant({
                businessName: merchant.business_name || merchant.full_name,
                email: merchant.email,
                mobileNumber: merchant.mobile_number,
                panNumber: merchant.pan_number,
                gstNumber: merchant.gst_number,
            });
            // Store Sabbpe merchant ID
            await supabase_1.supabase
                .from('merchant_profiles')
                .update({
                bank_application_id: response.merchantId,
            })
                .eq('id', merchantId);
            logger_1.logger.info('✓ Merchant onboarded with Sabbpe', {
                merchantId,
                sabbpeMerchantId: response.merchantId,
            });
            return {
                kycUrl: response.kycUrl || '',
                status: response.status,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to onboard merchant with Sabbpe', {
                merchantId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
}
exports.MerchantService = MerchantService;
exports.merchantService = new MerchantService();
//# sourceMappingURL=merchant.service.js.map