"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voucherService = exports.VoucherService = void 0;
const supabase_1 = require("../../config/supabase");
const valuedesign_service_1 = require("../../services/valuedesign.service");
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
class VoucherService {
    /**
     * Get all categories
     */
    async getCategories() {
        try {
            logger_1.logger.info('Fetching voucher categories');
            const { data: categories, error } = await supabase_1.supabase
                .from('voucher_categories')
                .select('*')
                .eq('is_active', true)
                .order('display_order', { ascending: true });
            if (error) {
                throw new Error(`Failed to fetch categories: ${error.message}`);
            }
            const mapped = (categories || []).map((cat) => ({
                id: cat.id,
                categoryName: cat.category_name,
                categorySlug: cat.category_slug,
                icon: cat.icon,
                displayOrder: cat.display_order,
                isActive: cat.is_active,
            }));
            logger_1.logger.info('✓ Categories fetched', { count: mapped.length });
            return mapped;
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch categories', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Get all brands with caching strategy
     * 1. Check if cache exists and is valid
     * 2. If expired, fetch from ValueDesign API
     * 3. Update cache
     * 4. Return brands
     */
    async getBrands(forceRefresh = false) {
        try {
            logger_1.logger.info('Fetching brands', { forceRefresh });
            let brands = [];
            if (!forceRefresh) {
                // Try to get from cache
                const { data: cachedBrands, error } = await supabase_1.supabase
                    .from('brand_cache')
                    .select('*')
                    .eq('is_active', true)
                    .gt('cache_expires_at', new Date().toISOString());
                if (!error && cachedBrands && cachedBrands.length > 0) {
                    logger_1.logger.info('✓ Brands loaded from cache', { count: cachedBrands.length });
                    return this.mapBrands(cachedBrands);
                }
                logger_1.logger.debug('Cache expired or empty, fetching from ValueDesign');
            }
            // Fetch from ValueDesign API
            const vdBrands = await valuedesign_service_1.valueDesignService.getBrands();
            // Clear old cache
            await supabase_1.supabase.from('brand_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            // Insert new brands - map from ValueDesign format
            const brandsToInsert = vdBrands.map((brand) => ({
                brand_code: brand.brandCode,
                brand_name: brand.brandName,
                category: brand.categoryId || '',
                category_id: brand.categoryId,
                discount: 0, // ValueDesign API doesn't return this
                denomination_list: '', // ValueDesign API doesn't return this
                brand_type: '', // ValueDesign API doesn't return this
                stock_available: 0, // ValueDesign API doesn't return this
                description: '',
                terms_conditions: '',
                images: {},
                is_active: true,
                last_fetched_at: new Date().toISOString(),
                cache_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            }));
            const { data: inserted, error: insertError } = await supabase_1.supabase
                .from('brand_cache')
                .insert(brandsToInsert)
                .select();
            if (insertError) {
                logger_1.logger.warn('Failed to update brand cache', { error: insertError.message });
            }
            else {
                logger_1.logger.info('✓ Brand cache updated', { count: inserted?.length || 0 });
            }
            brands = inserted || [];
            return this.mapBrands(brands);
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch brands', {
                error: error instanceof Error ? error.message : String(error),
            });
            // Fallback: return expired cache
            try {
                const { data: fallbackBrands } = await supabase_1.supabase
                    .from('brand_cache')
                    .select('*')
                    .eq('is_active', true)
                    .limit(100);
                if (fallbackBrands && fallbackBrands.length > 0) {
                    logger_1.logger.warn('Returning expired cache due to API failure');
                    return this.mapBrands(fallbackBrands);
                }
            }
            catch (_) {
                // Ignore fallback errors
            }
            throw error;
        }
    }
    /**
     * Get brand by code
     */
    async getBrandByCode(brandCode) {
        try {
            logger_1.logger.info('Fetching brand', { brandCode });
            const { data: brand, error } = await supabase_1.supabase
                .from('brand_cache')
                .select('*')
                .eq('brand_code', brandCode)
                .eq('is_active', true)
                .single();
            if (error || !brand) {
                throw new errors_1.NotFoundError('Brand');
            }
            const mapped = this.mapBrands([brand]);
            return mapped[0];
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch brand', {
                brandCode,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Get brands by category
     */
    async getBrandsByCategory(categoryId) {
        try {
            logger_1.logger.info('Fetching brands by category', { categoryId });
            const { data: brands, error } = await supabase_1.supabase
                .from('brand_cache')
                .select('*')
                .eq('category_id', categoryId)
                .eq('is_active', true)
                .order('brand_name', { ascending: true });
            if (error) {
                throw new Error(`Failed to fetch brands: ${error.message}`);
            }
            logger_1.logger.info('✓ Brands fetched by category', { count: brands?.length || 0 });
            return this.mapBrands(brands || []);
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch brands by category', {
                categoryId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Search brands by name
     */
    async searchBrands(query) {
        try {
            logger_1.logger.info('Searching brands', { query });
            const { data: brands, error } = await supabase_1.supabase
                .from('brand_cache')
                .select('*')
                .eq('is_active', true)
                .ilike('brand_name', `%${query}%`)
                .limit(20);
            if (error) {
                throw new Error(`Failed to search brands: ${error.message}`);
            }
            logger_1.logger.info('✓ Brand search completed', { count: brands?.length || 0 });
            return this.mapBrands(brands || []);
        }
        catch (error) {
            logger_1.logger.error('Failed to search brands', {
                query,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Map brand_cache to BrandDTO
     */
    mapBrands(brands) {
        return brands.map((brand) => ({
            id: brand.id,
            brandCode: brand.brand_code,
            brandName: brand.brand_name,
            category: brand.category || '',
            categoryId: brand.category_id,
            discount: brand.discount || 0,
            denominationList: this.parseDenominationList(brand.denomination_list),
            brandType: brand.brand_type || '',
            minPrice: this.getMinPrice(brand.denomination_list),
            maxPrice: this.getMaxPrice(brand.denomination_list),
            stockAvailable: brand.stock_available || 0,
            isActive: brand.is_active,
            description: brand.description,
            termsConditions: brand.terms_conditions,
            images: brand.images,
        }));
    }
    /**
     * Parse denomination list from string
     */
    parseDenominationList(denominationStr) {
        if (!denominationStr)
            return [];
        try {
            return denominationStr.split(',').map((d) => d.trim()).filter((d) => d);
        }
        catch {
            return [];
        }
    }
    /**
     * Get minimum price from denomination list
     */
    getMinPrice(denominationStr) {
        const denoms = this.parseDenominationList(denominationStr);
        if (denoms.length === 0)
            return 0;
        return Math.min(...denoms.map((d) => parseFloat(d) || 0));
    }
    /**
     * Get maximum price from denomination list
     */
    getMaxPrice(denominationStr) {
        const denoms = this.parseDenominationList(denominationStr);
        if (denoms.length === 0)
            return 0;
        return Math.max(...denoms.map((d) => parseFloat(d) || 0));
    }
    /**
     * Refresh brand cache from ValueDesign
     */
    async refreshBrandCache() {
        try {
            logger_1.logger.info('Manually refreshing brand cache');
            await this.getBrands(true);
            logger_1.logger.info('✓ Brand cache refreshed');
        }
        catch (error) {
            logger_1.logger.error('Failed to refresh brand cache', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
}
exports.VoucherService = VoucherService;
exports.voucherService = new VoucherService();
//# sourceMappingURL=voucher.service.js.map