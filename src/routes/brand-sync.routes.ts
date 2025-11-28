import { Router, Request, Response } from 'express';
import { brandSyncService } from '@/services/brand-sync.service';
import { valueDesignService } from '@/services/valuedesign.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * Get single brand by slug
 * GET /api/brands/:slug
 * MUST BE BEFORE /:brandCode/stores routes
 */
router.get('/:slug', async (req: Request, res: Response) => {
    try {
        const { slug } = req.params;
        
        logger.info('Fetching brand by slug', { slug });
        
        const { data: brand, error } = await supabase
            .from('brand_cache')
            .select('*')
            .eq('slug', slug)
            .eq('is_active', true)
            .single();
        
        if (error || !brand) {
            logger.warn('Brand not found', { slug });
            return res.status(404).json({
                success: false,
                error: 'Brand not found'
            });
        }
        
        logger.info('✓ Brand found', { slug, brandName: brand.brand_name });
        
        return res.json(brand);
        
    } catch (error) {
        logger.error('Failed to fetch brand by slug:', { 
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch brand'
        });
    }
});

/**
 * Trigger manual brand sync
 * POST /api/brands/sync
 */
router.post('/sync', authMiddleware, async (req: Request, res: Response) => {
    try {
        const result = await brandSyncService.syncBrands();
        
        return res.json({
            success: result.success,
            message: result.success 
                ? `Successfully synced ${result.count} brands` 
                : `Sync failed: ${result.error}`,
            count: result.count,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
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
router.get('/sync/status', async (req: Request, res: Response) => {
    try {
        const lastSyncTime = await brandSyncService.getLastSyncTime();
        
        const { count } = await supabase
            .from('brand_cache')
            .select('*', { count: 'exact', head: true });
        
        return res.json({
            success: true,
            last_synced_at: lastSyncTime,
            total_brands: count || 0
        });
    } catch (error) {
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
router.get('/', async (req: Request, res: Response) => {
    try {
        const { category, search } = req.query;
        const brands = await brandSyncService.getCachedBrands({
            category: category as string,
            search: search as string,
            isActive: true
        });
        
        return res.json({
            success: true,
            count: brands.length,
            brands: brands
        });
    } catch (error) {
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
router.get('/category/:category', async (req: Request, res: Response) => {
    try {
        const { category } = req.params;
        const brands = await brandSyncService.getBrandsByCategory(category);
        
        return res.json({
            success: true,
            count: brands.length,
            brands: brands
        });
    } catch (error) {
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
router.get('/:brandCode/stores/nearby', async (req: Request, res: Response) => {
    try {
        const { brandCode } = req.params;
        const { pincode, latitude, longitude, radius = '10' } = req.query;
        
        const searchRadius = parseFloat(radius as string);
        
        if (!pincode && (!latitude || !longitude)) {
            return res.status(400).json({
                success: false,
                error: 'Please provide either pincode or (latitude, longitude)'
            });
        }
        
        const { data: stores, error } = await supabase
            .from('store_cache')
            .select('*')
            .eq('brand_code', brandCode)
            .eq('is_active', true)
            .not('latitude', 'is', null)
            .not('longitude', 'is', null);
        
        if (error) throw error;
        
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
        
        logger.info('Nearby stores request', { brandCode, pincode, latitude, longitude, radius });
        
        return res.json({
            success: true,
            brandCode: brandCode,
            userLocation: { pincode, latitude, longitude },
            searchRadius: searchRadius,
            count: stores.length,
            stores: stores,
            note: 'Distance calculation not yet implemented - showing all stores'
        });
        
    } catch (error) {
        logger.error('Nearby stores error:', { 
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
router.get('/:brandCode/stores', async (req: Request, res: Response) => {
    try {
        const { brandCode } = req.params;
        const { refresh } = req.query;
        
        const forceRefresh = refresh === 'true';
        
        logger.info('Get stores request', { brandCode, forceRefresh });
        
        if (!forceRefresh) {
            const { data: cachedStores, error } = await supabase
                .from('store_cache')
                .select('*')
                .eq('brand_code', brandCode)
                .eq('is_active', true);
            
            if (!error && cachedStores && cachedStores.length > 0) {
                logger.info('Returning cached stores', { brandCode, count: cachedStores.length });
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
        
        logger.info('Fetching fresh stores from ValueDesign API', { brandCode });
        const stores: any = await valueDesignService.getStores(brandCode);
        
        let storeArray: any[] = [];
        if (Array.isArray(stores)) {
            storeArray = stores;
        } else if (stores.stores && Array.isArray(stores.stores)) {
            storeArray = stores.stores;
        } else if (stores.data && Array.isArray(stores.data)) {
            storeArray = stores.data;
        }
        
        if (storeArray.length > 0) {
            try {
                await supabase
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
                
                const { error: insertError } = await supabase
                    .from('store_cache')
                    .upsert(storesToInsert, {
                        onConflict: 'store_code',
                        ignoreDuplicates: false
                    });
                
                if (insertError) {
                    logger.error('Failed to cache stores:', { 
                        error: insertError.message 
                    });
                }
            } catch (cacheError) {
                logger.error('Error caching stores:', { 
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
        
    } catch (error) {
        logger.error('Get stores error:', { 
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
router.post('/:brandCode/stores/sync', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { brandCode } = req.params;
        const { geocode } = req.query;
        
        const includeGeocoding = geocode === 'true';
        
        logger.info('Syncing stores for brand', { brandCode, geocode: includeGeocoding });
        
        const stores = await valueDesignService.getStores(
            brandCode, 
            true,
            includeGeocoding
        );
        
        return res.json({
            success: true,
            message: `Successfully synced ${stores.length} stores`,
            brandCode: brandCode,
            count: stores.length,
            geocoded: stores.filter(s => s.latitude).length,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Store sync error:', { 
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to sync stores'
        });
    }
});

export default router;
