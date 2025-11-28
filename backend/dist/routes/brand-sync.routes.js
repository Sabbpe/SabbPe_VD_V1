"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const brand_sync_service_1 = require("../services/brand-sync.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const supabase_1 = require("../config/supabase");
const router = (0, express_1.Router)();
/**
 * Trigger manual brand sync
 * POST /api/brands/sync
 */
router.post('/sync', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const result = await brand_sync_service_1.brandSyncService.syncBrands();
        return res.json({
            success: result.success,
            message: result.success
                ? `Successfully synced ${result.count} brands`
                : `Sync failed: ${result.error}`,
            count: result.count,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * Get all cached brands
 * GET /api/brands
 */
router.get('/', async (req, res) => {
    try {
        const { category, search } = req.query;
        const brands = await brand_sync_service_1.brandSyncService.getCachedBrands({
            category: category,
            search: search,
            isActive: true
        });
        return res.json({
            success: true,
            count: brands.length,
            brands: brands
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * Get brand by code
 * GET /api/brands/:brandCode
 */
router.get('/:brandCode', async (req, res) => {
    try {
        const { brandCode } = req.params;
        const brand = await brand_sync_service_1.brandSyncService.getBrandByCode(brandCode);
        if (!brand) {
            return res.status(404).json({
                success: false,
                error: 'Brand not found'
            });
        }
        return res.json({
            success: true,
            brand: brand
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * Get brands by category
 * GET /api/brands/category/:category
 */
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const brands = await brand_sync_service_1.brandSyncService.getBrandsByCategory(category);
        return res.json({
            success: true,
            count: brands.length,
            brands: brands
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * Get sync status
 * GET /api/brands/sync/status
 */
router.get('/sync/status', async (req, res) => {
    try {
        const lastSyncTime = await brand_sync_service_1.brandSyncService.getLastSyncTime();
        const { count } = await supabase_1.supabase
            .from('brand_cache')
            .select('*', { count: 'exact', head: true });
        return res.json({
            success: true,
            last_synced_at: lastSyncTime,
            total_brands: count || 0
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
exports.default = router;
//# sourceMappingURL=brand-sync.routes.js.map