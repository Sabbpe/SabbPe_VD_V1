"use strict";
// auth.routes.ts - COMPLETE FILE WITH ALL ROUTES
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../types/database");
const auth_service_1 = require("../services/auth.service");
const supabase_1 = require("../config/supabase");
const auth_middleware_1 = require("../middleware/auth.middleware");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
/**
 * POST /api/auth/merchant/login
 * Merchant login - authenticate by email and mobile number
 */
router.post('/merchant/login', async (req, res) => {
    try {
        const { email, mobile_number } = req.body;
        logger_1.logger.info('🔐 Merchant login attempt', { email, mobileNumber: mobile_number });
        // Validate input
        if (!email || !mobile_number) {
            logger_1.logger.warn('❌ Missing credentials', { email, mobile_number });
            res.status(400).json({
                success: false,
                error: 'Email and mobile number required',
            });
            return;
        }
        // Search by EMAIL (unique identifier)
        const { data: merchant, error: merchantError } = await supabase_1.supabase
            .from('merchant_sync')
            .select('*')
            .eq('email', email)
            .single();
        logger_1.logger.info('🔍 Database query result', {
            email,
            found: !!merchant,
            error: merchantError?.message
        });
        if (merchantError || !merchant) {
            logger_1.logger.warn('❌ Merchant not found', {
                email,
                error: merchantError?.message
            });
            res.status(403).json({
                success: false,
                error: 'Invalid email or mobile number',
            });
            return;
        }
        // Verify mobile number matches (normalize: remove leading zeros)
        const normalizedInputMobile = mobile_number.replace(/^0+/, '');
        const normalizedDbMobile = merchant.mobile_number.replace(/^0+/, '');
        if (normalizedInputMobile !== normalizedDbMobile) {
            logger_1.logger.warn('❌ Mobile number mismatch', {
                email,
                inputMobile: mobile_number,
                dbMobile: merchant.mobile_number
            });
            res.status(403).json({
                success: false,
                error: 'Invalid email or mobile number',
            });
            return;
        }
        logger_1.logger.info('✓ Mobile number verified');
        // Check if merchant is approved
        if (!merchant.is_approved) {
            logger_1.logger.warn('❌ Merchant not approved', {
                email,
                isApproved: merchant.is_approved
            });
            res.status(403).json({
                success: false,
                error: 'Merchant not approved yet',
                status: 'pending',
            });
            return;
        }
        // Generate JWT token
        const token = auth_service_1.authService.generateToken({
            userId: merchant.user_id,
            email: merchant.email,
            role: database_1.UserRole.MERCHANT,
        });
        logger_1.logger.info('✅ Merchant login successful', {
            email,
            userId: merchant.user_id,
            merchantId: merchant.merchant_id,
            businessName: merchant.business_name
        });
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                expiresIn: '24h',
                merchant: {
                    merchantId: merchant.merchant_id,
                    userId: merchant.user_id,
                    businessName: merchant.business_name,
                    email: merchant.email,
                    mobileNumber: merchant.mobile_number,
                    isApproved: merchant.is_approved,
                },
            },
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const fullError = error instanceof Error ? error.stack : JSON.stringify(error);
        logger_1.logger.error('🔴 Merchant login error', {
            error: errorMessage,
            stack: fullError
        });
        res.status(500).json({
            success: false,
            error: 'Login failed',
            details: errorMessage
        });
    }
});
/**
 * POST /api/auth/guest-login
 * Guest login - create temporary session
 */
router.post('/guest-login', async (req, res) => {
    try {
        const { email } = req.body;
        logger_1.logger.info('Guest login attempt', { email });
        const result = await auth_service_1.authService.guestLogin(email);
        res.status(200).json({
            success: true,
            message: 'Guest login successful',
            data: result,
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error('Guest login error', { error: errorMessage });
        res.status(500).json({
            success: false,
            error: errorMessage || 'Guest login failed',
        });
    }
});
/**
 * POST /api/auth/merchant-register
 * Merchant registration
 */
router.post('/merchant-register', async (req, res) => {
    try {
        const { email, password, fullName, mobileNumber, businessName, panNumber, aadhaarNumber, gstNumber, } = req.body;
        logger_1.logger.info('Merchant registration attempt', { email, businessName });
        if (!email || !password || !fullName || !mobileNumber || !businessName) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields',
            });
            return;
        }
        const result = await auth_service_1.authService.merchantRegister({
            email,
            password,
            fullName,
            mobileNumber,
            businessName,
            panNumber,
            aadhaarNumber,
            gstNumber,
        });
        res.status(201).json({
            success: true,
            message: 'Merchant registered successfully',
            data: result,
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error('Merchant registration error', { error: errorMessage });
        res.status(400).json({
            success: false,
            error: errorMessage || 'Registration failed',
        });
    }
});
/**
 * POST /api/auth/refresh
 * Refresh JWT token
 */
router.post('/refresh', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            res.status(400).json({
                success: false,
                error: 'Token required',
            });
            return;
        }
        const newToken = auth_service_1.authService.refreshToken(token);
        res.status(200).json({
            success: true,
            message: 'Token refreshed',
            data: {
                token: newToken,
                expiresIn: '24h',
            },
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error('Refresh token error', { error: errorMessage });
        res.status(401).json({
            success: false,
            error: errorMessage || 'Token refresh failed',
        });
    }
});
/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
router.get('/me', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { user } = req;
        if (!user) {
            res.status(401).json({
                success: false,
                error: 'Not authenticated',
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: {
                userId: user.userId,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error('Get user error', { error: errorMessage });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user info',
        });
    }
});
/**
 * POST /api/auth/logout
 * Logout endpoint (client-side token removal)
 */
router.post('/logout', async (req, res) => {
    try {
        logger_1.logger.info('👋 User logout');
        res.status(200).json({
            success: true,
            message: 'Logged out successfully',
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error('Logout error', { error: errorMessage });
        res.status(500).json({
            success: false,
            error: 'Logout failed',
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map