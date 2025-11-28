"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const merchant_service_1 = require("../services/business/merchant.service");
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
async function getMerchantIdFromUserId(userId) {
    const { data: merchantProfile, error } = await supabase_1.supabase
        .from('merchant_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();
    if (error || !merchantProfile) {
        throw new Error('Merchant profile not found');
    }
    return merchantProfile.id;
}
router.get('/dashboard', auth_middleware_1.authMiddleware, auth_middleware_1.requireMerchant, async (req, res) => {
    try {
        const { userId } = req.user || {};
        if (!userId) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const merchantId = await getMerchantIdFromUserId(userId);
        const dashboard = await merchant_service_1.merchantService.getDashboard(merchantId);
        res.status(200).json({
            success: true,
            data: dashboard,
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error('Get merchant dashboard route error', { error: errorMessage });
        res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to fetch dashboard',
        });
    }
});
router.post('/kyc', auth_middleware_1.authMiddleware, auth_middleware_1.requireMerchant, async (req, res) => {
    try {
        const { videoKycFilePath, selfieFilePath, latitude, longitude } = req.body;
        const { userId } = req.user || {};
        if (!userId) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        if (!videoKycFilePath && !selfieFilePath) {
            res.status(400).json({
                success: false,
                error: 'At least one of videoKycFilePath or selfieFilePath is required',
            });
            return;
        }
        const merchantId = await getMerchantIdFromUserId(userId);
        await merchant_service_1.merchantService.submitKYC({
            merchantId,
            videoKycFilePath,
            selfieFilePath,
            latitude,
            longitude,
        });
        res.status(200).json({
            success: true,
            message: 'KYC submitted successfully',
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error('Submit KYC route error', { error: errorMessage });
        res.status(400).json({
            success: false,
            error: errorMessage || 'Failed to submit KYC',
        });
    }
});
router.post('/documents', auth_middleware_1.authMiddleware, auth_middleware_1.requireMerchant, async (req, res) => {
    try {
        const { documentType, fileName, filePath, mimeType, fileSize } = req.body;
        const { userId } = req.user || {};
        if (!userId) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        if (!documentType || !fileName || !filePath) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields: documentType, fileName, filePath',
            });
            return;
        }
        const merchantId = await getMerchantIdFromUserId(userId);
        await merchant_service_1.merchantService.uploadDocument({
            merchantId,
            documentType: documentType,
            fileName,
            filePath,
            mimeType,
            fileSize,
        });
        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error('Upload document route error', { error: errorMessage });
        res.status(400).json({
            success: false,
            error: errorMessage || 'Failed to upload document',
        });
    }
});
router.get('/kyc-status', auth_middleware_1.authMiddleware, auth_middleware_1.requireMerchant, async (req, res) => {
    try {
        const { userId } = req.user || {};
        if (!userId) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const merchantId = await getMerchantIdFromUserId(userId);
        const kycStatus = await merchant_service_1.merchantService.getKYCStatus(merchantId);
        res.status(200).json({
            success: true,
            data: kycStatus || { message: 'No KYC submitted yet' },
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error('Get KYC status route error', { error: errorMessage });
        res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to fetch KYC status',
        });
    }
});
router.get('/documents', auth_middleware_1.authMiddleware, auth_middleware_1.requireMerchant, async (req, res) => {
    try {
        const { userId } = req.user || {};
        if (!userId) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const merchantId = await getMerchantIdFromUserId(userId);
        const documents = await merchant_service_1.merchantService.getDocuments(merchantId);
        res.status(200).json({
            success: true,
            data: documents,
            count: documents.length,
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error('Get documents route error', { error: errorMessage });
        res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to fetch documents',
        });
    }
});
router.post('/sabbpe-onboard', auth_middleware_1.authMiddleware, auth_middleware_1.requireMerchant, async (req, res) => {
    try {
        const { userId } = req.user || {};
        if (!userId) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        const merchantId = await getMerchantIdFromUserId(userId);
        const result = await merchant_service_1.merchantService.onboardWithSabbpe(merchantId);
        res.status(200).json({
            success: true,
            message: 'Merchant onboarded with Sabbpe',
            data: result,
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error('Sabbpe onboard route error', { error: errorMessage });
        res.status(400).json({
            success: false,
            error: errorMessage || 'Failed to onboard with Sabbpe',
        });
    }
});
exports.default = router;
//# sourceMappingURL=merchants.routes.js.map