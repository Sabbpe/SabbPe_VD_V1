"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const valuedesign_service_1 = require("../services/valuedesign.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
/**
 * GET /api/valuedesign/brands
 * Get all available brands from ValueDesign
 */
router.get('/brands', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const brands = await valuedesign_service_1.valueDesignService.getBrands();
        res.json({
            success: true,
            data: brands,
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error('Failed to fetch brands', { error: errorMessage });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch brands',
        });
    }
});
/**
 * POST /api/valuedesign/get-evcs
 * Purchase/get EVCs (e-vouchers)
 */
router.post('/get-evcs', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { orderId, skuCode, noOfCard, amount, receiptNo, reqId, firstName, lastName, mobileNo, email, address, city, state, country, pincode, } = req.body;
        if (!orderId || !skuCode || noOfCard === undefined || !amount || !receiptNo) {
            res.status(400).json({
                success: false,
                error: 'Missing required mandatory fields: orderId, skuCode, noOfCard, amount, receiptNo',
            });
            return;
        }
        logger_1.logger.info('Getting EVCs', { orderId, skuCode, noOfCard });
        const result = await valuedesign_service_1.valueDesignService.getEVCs({
            orderId,
            skuCode,
            noOfCard: Number(noOfCard),
            amount: String(amount),
            receiptNo,
            reqId: reqId || `REQ-${orderId}`,
            firstName,
            lastName,
            mobileNo,
            email,
            address,
            city,
            state,
            country,
            pincode,
        });
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error('Failed to fetch EVCs', { error: errorMessage });
        res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to fetch EVCs',
        });
    }
});
/**
 * GET /api/valuedesign/wallet-balance
 * Get account wallet balance
 */
router.get('/wallet-balance', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const balance = await valuedesign_service_1.valueDesignService.getWalletBalance();
        res.json({
            success: true,
            data: {
                balance,
                currency: 'INR',
            },
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error('Failed to fetch wallet balance', { error: errorMessage });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch wallet balance',
        });
    }
});
/**
 * GET /api/valuedesign/test-token
 * Test token generation
 */
router.get('/test-token', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const token = await valuedesign_service_1.valueDesignService.generateToken();
        res.json({
            success: true,
            token: token,
            tokenLength: token.length,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: String(error) });
    }
});
/**
 * POST /api/valuedesign/debug-token
 * Debug token generation - raw API call to ValueDesign
 */
router.post('/debug-token', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const axios = require('axios');
        logger_1.logger.info('Debug: Starting raw token generation call');
        const response = await axios.post(`${process.env.VD_API_BASE_URL}/distributor/api-generatetoken/`, // ✅ Use env
        { distributor_id: process.env.VD_DISTRIBUTOR_ID }, // ✅ Use env
        {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'username': process.env.VD_API_USERNAME, // ✅ Use env
                'password': process.env.VD_API_PASSWORD, // ✅ Use env
            },
            validateStatus: () => true,
        });
        const debugResponse = {
            httpStatus: response.status,
            httpStatusText: response.statusText,
            responseData: response.data,
        };
        logger_1.logger.info('Debug: Raw token response', debugResponse);
        res.json({
            success: true,
            debug: debugResponse,
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error('Debug token error', { error: errorMessage });
        res.status(500).json({
            success: false,
            error: errorMessage,
        });
    }
});
/**
 * GET /api/valuedesign/check-outbound-ip
 * Check actual outbound IP from Cloud Run
 */
router.get('/check-outbound-ip', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const axios = require('axios');
        const response = await axios.get('https://api.ipify.org?format=json', {
            timeout: 5000,
        });
        const outboundIp = response.data.ip;
        logger_1.logger.info('Outbound IP from Cloud Run', { outboundIp });
        res.json({
            success: true,
            outboundIp: outboundIp,
            expectedIp: process.env.GCP_IP_WHITELIST,
            matches: outboundIp === process.env.GCP_IP_WHITELIST,
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error('Failed to check outbound IP', { error: errorMessage });
        res.status(500).json({
            success: false,
            error: errorMessage,
        });
    }
});
exports.default = router;
//# sourceMappingURL=valuedesign.routes.js.map