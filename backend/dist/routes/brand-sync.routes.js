"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const brand_sync_service_1 = require("../services/brand-sync.service");
const valuedesign_service_1 = require("../services/valuedesign.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
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
 * Get nearby stores for a brand
 * GET /api/brands/:brandCode/stores/nearby
 */
router.get('/:brandCode/stores/nearby', async (req, res) => {
    try {
        const { brandCode } = req.params;
        const { pincode, latitude, longitude, radius = '10' } = req.query;
        const searchRadius = parseFloat(radius);
        if (!pincode && (!latitude || !longitude)) {
            return res.status(400).json({
                success: false,
                error: 'Please provide either pincode or (latitude, longitude)'
            });
        }
        const { data: stores, error } = await supabase_1.supabase
            .from('store_cache')
            .select('*')
            .eq('brand_code', brandCode)
            .eq('is_active', true)
            .not('latitude', 'is', null)
            .not('longitude', 'is', null);
        if (error)
            throw error;
        if (!stores || stores.length === 0) {
            return res.json({
                success: true,
                message: 'No stores with location data found. Try syncing stores first.',
                userLocation: { pincode, latitude, longitude },
                searchRadius: searchRadius,
                count: 0,
                stores: []
            });
        }
        logger_1.logger.info('Nearby stores request', { brandCode, pincode, latitude, longitude, radius });
        return res.json({
            success: true,
            brandCode: brandCode,
            userLocation: { pincode, latitude, longitude },
            searchRadius: searchRadius,
            count: stores.length,
            stores: stores,
            note: 'Distance calculation not yet implemented - showing all stores'
        });
    }
    catch (error) {
        logger_1.logger.error('Nearby stores error:', {
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to find nearby stores'
        });
    }
});
/**
 * Get all stores for a brand
 * GET /api/brands/:brandCode/stores
 */
router.get('/:brandCode/stores', async (req, res) => {
    try {
        const { brandCode } = req.params;
        const { refresh } = req.query;
        const forceRefresh = refresh === 'true';
        logger_1.logger.info('Get stores request', { brandCode, forceRefresh });
        if (!forceRefresh) {
            const { data: cachedStores, error } = await supabase_1.supabase
                .from('store_cache')
                .select('*')
                .eq('brand_code', brandCode)
                .eq('is_active', true);
            if (!error && cachedStores && cachedStores.length > 0) {
                logger_1.logger.info('Returning cached stores', { brandCode, count: cachedStores.length });
                return res.json({
                    success: true,
                    brandCode: brandCode,
                    count: cachedStores.length,
                    stores: cachedStores,
                    cached: true,
                    timestamp: new Date().toISOString()
                });
            }
        }
        logger_1.logger.info('Fetching fresh stores from ValueDesign API', { brandCode });
        const stores = await valuedesign_service_1.valueDesignService.getStores(brandCode);
        let storeArray = [];
        if (Array.isArray(stores)) {
            storeArray = stores;
        }
        else if (stores.stores && Array.isArray(stores.stores)) {
            storeArray = stores.stores;
        }
        else if (stores.data && Array.isArray(stores.data)) {
            storeArray = stores.data;
        }
        if (storeArray.length > 0) {
            try {
                await supabase_1.supabase
                    .from('store_cache')
                    .update({ is_active: false })
                    .eq('brand_code', brandCode);
                const storesToInsert = storeArray.map((store, index) => ({
                    store_code: `${brandCode}-${store.City || 'UNK'}-${String(index + 1).padStart(3, '0')}`,
                    brand_code: brandCode,
                    brand_name: store.BrandName || 'Unknown',
                    address: store.Address || '',
                    city: store.City || '',
                    state: store.State || '',
                    country: store.Country || 'India',
                    pincode: null,
                    phone: store.ContactNumber || '',
                    is_active: true,
                    raw_data: store,
                    synced_at: new Date().toISOString()
                }));
                const { error: insertError } = await supabase_1.supabase
                    .from('store_cache')
                    .upsert(storesToInsert, {
                    onConflict: 'store_code',
                    ignoreDuplicates: false
                });
                if (insertError) {
                    logger_1.logger.error('Failed to cache stores:', {
                        error: insertError.message
                    });
                }
            }
            catch (cacheError) {
                logger_1.logger.error('Error caching stores:', {
                    error: cacheError instanceof Error ? cacheError.message : String(cacheError)
                });
            }
        }
        return res.json({
            success: true,
            brandCode: brandCode,
            count: storeArray.length,
            stores: storeArray,
            cached: false,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Get stores error:', {
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch stores'
        });
    }
});
/**
 * Sync stores for a specific brand
 * POST /api/brands/:brandCode/stores/sync
 */
router.post('/:brandCode/stores/sync', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { brandCode } = req.params;
        const { geocode } = req.query;
        const includeGeocoding = geocode === 'true';
        logger_1.logger.info('Syncing stores for brand', { brandCode, geocode: includeGeocoding });
        const stores = await valuedesign_service_1.valueDesignService.getStores(brandCode, true, includeGeocoding);
        return res.json({
            success: true,
            message: `Successfully synced ${stores.length} stores`,
            brandCode: brandCode,
            count: stores.length,
            geocoded: stores.filter(s => s.latitude).length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Store sync error:', {
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to sync stores'
        });
    }
});
exports.default = router;
//# sourceMappingURL=brand-sync.routes.js.map