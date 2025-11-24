import { supabase } from '@/config/supabase';
import { valueDesignService } from './valuedesign.service';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTERFACES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ValueDesign API response format
interface VDBrand {
    BrandCode: string;
    BrandName: string;
    Brandtype?: string;
    Category?: string;
    Description?: string;
    minPrice?: number | string;
    maxPrice?: number | string;
    DenominationList?: string;
    Discount?: number | string;
    StockAvailable?: number;
    Images?: string | object;
    TnC?: string | object;
    ImportantInstruction?: object;
    RedeemSteps?: any[];
}

// Our database schema
interface BrandCache {
    id?: string;
    brand_code: string;
    brand_name: string;
    brand_type?: string;
    category?: string;
    description?: string;
    min_price: number;
    max_price: number;
    denomination_list?: string;
    discount: number;
    stock_available: number;
    images: object;
    terms_and_conditions: object;
    important_instructions: object;
    redeem_steps: any[];
    is_active: boolean;
    last_synced_at: string;
}

export class BrandSyncService {
    
    /**
     * Sync brands from ValueDesign to local cache
     */
    async syncBrands(): Promise<{ success: boolean; count: number; error?: string }> {
        try {
            logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            logger.info('🔄 Starting brand sync from ValueDesign...');
            logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            // Fetch all brands from ValueDesign
            const vdBrands = await valueDesignService.getBrands('');

            if (!vdBrands || vdBrands.length === 0) {
                logger.warn('⚠️ No brands returned from ValueDesign');
                return { success: false, count: 0, error: 'No brands found' };
            }

            logger.info(`✓ Fetched ${vdBrands.length} brands from ValueDesign`);

            // Transform VD brands to our schema - FIXED TYPE
            const brandRecords: BrandCache[] = vdBrands.map((vdBrand: any) => {
                return this.transformVDBrandToCache(vdBrand);
            });

            logger.info(`✓ Transformed ${brandRecords.length} brands`);

            // Delete all existing brands (fresh sync)
            logger.info('🗑️ Clearing existing brand cache...');
            const { error: deleteError } = await supabase
                .from('brand_cache')
                .delete()
                .neq('brand_code', ''); // Delete all

            if (deleteError) {
                // FIX: Proper error logging
                logger.error('Failed to clear brand cache:', {
                    message: deleteError.message,
                    code: deleteError.code,
                });
            } else {
                logger.info('✓ Brand cache cleared');
            }

            // Insert new brands in batches
            const batchSize = 500;
            let insertedCount = 0;

            for (let i = 0; i < brandRecords.length; i += batchSize) {
                const batch = brandRecords.slice(i, i + batchSize);
                
                logger.info(`📥 Inserting batch ${Math.floor(i / batchSize) + 1}: ${batch.length} brands`);

                const { data, error: insertError } = await supabase
                    .from('brand_cache')
                    .insert(batch)
                    .select();

                if (insertError) {
                    logger.error(`Failed to insert batch ${Math.floor(i / batchSize) + 1}:`, {
                        error: insertError.message,
                        code: insertError.code,
                    });
                    continue;
                }

                insertedCount += data?.length || 0;
                logger.info(`✓ Batch inserted: ${data?.length} brands`);
            }

            logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            logger.info(`✅ Brand sync completed: ${insertedCount}/${vdBrands.length} brands synced`);
            logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            return { success: true, count: insertedCount };

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('❌ Brand sync failed:', { error: errorMsg });
            return { success: false, count: 0, error: errorMsg };
        }
    }

    /**
     * Transform ValueDesign brand to our cache schema
     */
    private transformVDBrandToCache(vdBrand: any): BrandCache {
        // Parse Images (might be string or object)
        let images = {};
        if (typeof vdBrand.Images === 'string') {
            try {
                const cleanedImages = vdBrand.Images.replace(/'/g, '"');
                images = JSON.parse(cleanedImages);
            } catch (e) {
                logger.warn(`Failed to parse images for ${vdBrand.BrandCode}`);
                images = { raw: vdBrand.Images };
            }
        } else if (vdBrand.Images) {
            images = vdBrand.Images;
        }

        // Parse TnC
        let tnc = {};
        if (typeof vdBrand.TnC === 'string') {
            try {
                const cleanedTnC = vdBrand.TnC.replace(/'/g, '"');
                tnc = JSON.parse(cleanedTnC);
            } catch (e) {
                tnc = { text: vdBrand.TnC };
            }
        } else if (vdBrand.TnC) {
            tnc = vdBrand.TnC;
        }

        return {
            id: uuidv4(),
            brand_code: vdBrand.BrandCode,
            brand_name: vdBrand.BrandName,
            brand_type: vdBrand.Brandtype || 'Fixed',
            category: vdBrand.Category || 'Other',
            description: vdBrand.Description || '',
            min_price: Number(vdBrand.minPrice) || 0,
            max_price: Number(vdBrand.maxPrice) || 0,
            denomination_list: vdBrand.DenominationList || '',
            discount: Number(vdBrand.Discount) || 0,
            stock_available: vdBrand.StockAvailable || 0,
            images: images,
            terms_and_conditions: tnc,
            important_instructions: vdBrand.ImportantInstruction || {},
            redeem_steps: vdBrand.RedeemSteps || [],
            is_active: true,
            last_synced_at: new Date().toISOString(),
        };
    }

    /**
     * Get all cached brands
     */
    async getCachedBrands(filters?: {
        category?: string;
        isActive?: boolean;
        search?: string;
    }): Promise<BrandCache[]> {
        try {
            let query = supabase
                .from('brand_cache')
                .select('*')
                .order('brand_name', { ascending: true });

            if (filters?.category) {
                query = query.eq('category', filters.category);
            }

            if (filters?.isActive !== undefined) {
                query = query.eq('is_active', filters.isActive);
            }

            if (filters?.search) {
                query = query.or(
                    `brand_name.ilike.%${filters.search}%,brand_code.ilike.%${filters.search}%`
                );
            }

            const { data, error } = await query;

            if (error) {
                // FIX: Proper error logging
                logger.error('Failed to fetch cached brands:', {
                    message: error.message,
                    code: error.code,
                });
                return [];
            }

            return data as BrandCache[];
        } catch (error) {
            // FIX: Proper error logging
            logger.error('Error fetching cached brands:', {
                error: error instanceof Error ? error.message : String(error),
            });
            return [];
        }
    }

    /**
     * Get single brand by code
     */
    async getBrandByCode(brandCode: string): Promise<BrandCache | null> {
        try {
            const { data, error } = await supabase
                .from('brand_cache')
                .select('*')
                .eq('brand_code', brandCode)
                .single();

            if (error) {
                // FIX: Proper error logging
                logger.error(`Brand not found: ${brandCode}`, {
                    message: error.message,
                    code: error.code,
                });
                return null;
            }

            return data as BrandCache;
        } catch (error) {
            // FIX: Proper error logging
            logger.error('Error fetching brand by code:', {
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }

    /**
     * Get brands by category
     */
    async getBrandsByCategory(category: string): Promise<BrandCache[]> {
        return this.getCachedBrands({ category, isActive: true });
    }

    /**
     * Get last sync time
     */
    async getLastSyncTime(): Promise<string | null> {
        try {
            const { data, error } = await supabase
                .from('brand_cache')
                .select('last_synced_at')
                .order('last_synced_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !data) {
                return null;
            }

            return data.last_synced_at;
        } catch (error) {
            return null;
        }
    }
}

export const brandSyncService = new BrandSyncService();
