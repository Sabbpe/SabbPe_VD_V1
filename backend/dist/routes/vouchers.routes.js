"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const voucher_service_1 = require("../services/business/voucher.service");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
/**
 * GET /api/vouchers/categories
 * Get all active categories
 */
router.get('/categories', async (req, res) => {
    try {
        const categories = await voucher_service_1.voucherService.getCategories();
        res.status(200).json({
            success: true,
            data: categories,
            count: categories.length,
        });
    }
    catch (error) {
        logger_1.logger.error('Get categories route error', {
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch categories',
        });
    }
});
/**
 * GET /api/vouchers/brands
 * Get all brands with optional refresh
 */
router.get('/brands', async (req, res) => {
    try {
        const { refresh } = req.query;
        const forceRefresh = refresh === 'true';
        const brands = await voucher_service_1.voucherService.getBrands(forceRefresh);
        res.status(200).json({
            success: true,
            data: brands,
            count: brands.length,
            cached: !forceRefresh,
        });
    }
    catch (error) {
        logger_1.logger.error('Get brands route error', {
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch brands',
        });
    }
});
/**
 * GET /api/vouchers/brands/:brandCode
 * Get brand details
 */
router.get('/brands/:brandCode', async (req, res) => {
    try {
        const { brandCode } = req.params;
        const brand = await voucher_service_1.voucherService.getBrandByCode(brandCode);
        res.status(200).json({
            success: true,
            data: brand,
        });
    }
    catch (error) {
        logger_1.logger.error('Get brand route error', {
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(404).json({
            success: false,
            error: error instanceof Error ? error.message : 'Brand not found',
        });
    }
});
/**
 * GET /api/vouchers/categories/:categoryId/brands
 * Get brands by category
 */
router.get('/categories/:categoryId/brands', async (req, res) => {
    try {
        const { categoryId } = req.params;
        const brands = await voucher_service_1.voucherService.getBrandsByCategory(categoryId);
        res.status(200).json({
            success: true,
            data: brands,
            count: brands.length,
        });
    }
    catch (error) {
        logger_1.logger.error('Get brands by category route error', {
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch brands',
        });
    }
});
/**
 * GET /api/vouchers/search
 * Search brands by name
 */
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || typeof q !== 'string' || q.length < 2) {
            res.status(400).json({
                success: false,
                error: 'Query must be at least 2 characters',
            });
            return;
        }
        const brands = await voucher_service_1.voucherService.searchBrands(q);
        res.status(200).json({
            success: true,
            data: brands,
            count: brands.length,
            query: q,
        });
    }
    catch (error) {
        logger_1.logger.error('Search brands route error', {
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Search failed',
        });
    }
});
/**
 * POST /api/vouchers/refresh-cache (Admin only)
 * Manually refresh brand cache from ValueDesign
 */
router.post('/refresh-cache', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        // TODO: Add admin role check
        // if (req.user?.role !== UserRole.ADMIN) {
        //   return res.status(403).json({ success: false, error: 'Admin only' });
        // }
        await voucher_service_1.voucherService.refreshBrandCache();
        res.status(200).json({
            success: true,
            message: 'Brand cache refreshed successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Refresh cache route error', {
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to refresh cache',
        });
    }
});
exports.default = router;
//# sourceMappingURL=vouchers.routes.js.map