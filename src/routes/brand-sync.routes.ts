import { Router, Request, Response } from 'express';
import { brandSyncService } from '@/services/brand-sync.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { supabase } from '@/config/supabase'

const router = Router();

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
 * Get brand by code
 * GET /api/brands/:brandCode
 */
router.get('/:brandCode', async (req: Request, res: Response) => {
    try {
        const { brandCode } = req.params;
        const brand = await brandSyncService.getBrandByCode(brandCode);

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

export default router;
