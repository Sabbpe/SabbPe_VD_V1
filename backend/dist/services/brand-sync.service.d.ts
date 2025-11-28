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
export declare class BrandSyncService {
    /**
     * Sync brands from ValueDesign to local cache
     */
    syncBrands(): Promise<{
        success: boolean;
        count: number;
        error?: string;
    }>;
    /**
     * Transform ValueDesign brand to our cache schema
     */
    private transformVDBrandToCache;
    /**
     * Get all cached brands
     */
    getCachedBrands(filters?: {
        category?: string;
        isActive?: boolean;
        search?: string;
    }): Promise<BrandCache[]>;
    /**
     * Get single brand by code
     */
    getBrandByCode(brandCode: string): Promise<BrandCache | null>;
    /**
     * Get brands by category
     */
    getBrandsByCategory(category: string): Promise<BrandCache[]>;
    /**
     * Get last sync time
     */
    getLastSyncTime(): Promise<string | null>;
}
export declare const brandSyncService: BrandSyncService;
export {};
//# sourceMappingURL=brand-sync.service.d.ts.map