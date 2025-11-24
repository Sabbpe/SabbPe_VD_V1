import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, requireMerchant } from '@/middleware/auth.middleware';
import { merchantService } from '@/services/business/merchant.service';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

const router = Router();

async function getMerchantIdFromUserId(userId: string): Promise<string> {
    const { data: merchantProfile, error } = await supabase
        .from('merchant_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

    if (error || !merchantProfile) {
        throw new Error('Merchant profile not found');
    }

    return merchantProfile.id;
}

router.get('/dashboard', authMiddleware, requireMerchant, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user || {};

        if (!userId) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }

        const merchantId = await getMerchantIdFromUserId(userId);
        const dashboard = await merchantService.getDashboard(merchantId);

        res.status(200).json({
            success: true,
            data: dashboard,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Get merchant dashboard route error', { error: errorMessage });
        res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to fetch dashboard',
        });
    }
});

router.post('/kyc', authMiddleware, requireMerchant, async (req: AuthRequest, res: Response): Promise<void> => {
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

        await merchantService.submitKYC({
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
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Submit KYC route error', { error: errorMessage });
        res.status(400).json({
            success: false,
            error: errorMessage || 'Failed to submit KYC',
        });
    }
});

router.post('/documents', authMiddleware, requireMerchant, async (req: AuthRequest, res: Response): Promise<void> => {
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

        await merchantService.uploadDocument({
            merchantId,
            documentType: documentType as 'pan' | 'gst' | 'aadhar' | 'business_license' | 'bank_statement',
            fileName,
            filePath,
            mimeType,
            fileSize,
        });

        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Upload document route error', { error: errorMessage });
        res.status(400).json({
            success: false,
            error: errorMessage || 'Failed to upload document',
        });
    }
});

router.get('/kyc-status', authMiddleware, requireMerchant, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user || {};

        if (!userId) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }

        const merchantId = await getMerchantIdFromUserId(userId);
        const kycStatus = await merchantService.getKYCStatus(merchantId);

        res.status(200).json({
            success: true,
            data: kycStatus || { message: 'No KYC submitted yet' },
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Get KYC status route error', { error: errorMessage });
        res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to fetch KYC status',
        });
    }
});

router.get('/documents', authMiddleware, requireMerchant, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user || {};

        if (!userId) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }

        const merchantId = await getMerchantIdFromUserId(userId);
        const documents = await merchantService.getDocuments(merchantId);

        res.status(200).json({
            success: true,
            data: documents,
            count: documents.length,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Get documents route error', { error: errorMessage });
        res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to fetch documents',
        });
    }
});

router.post('/sabbpe-onboard', authMiddleware, requireMerchant, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user || {};

        if (!userId) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }

        const merchantId = await getMerchantIdFromUserId(userId);
        const result = await merchantService.onboardWithSabbpe(merchantId);

        res.status(200).json({
            success: true,
            message: 'Merchant onboarded with Sabbpe',
            data: result,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Sabbpe onboard route error', { error: errorMessage });
        res.status(400).json({
            success: false,
            error: errorMessage || 'Failed to onboard with Sabbpe',
        });
    }
});

export default router;