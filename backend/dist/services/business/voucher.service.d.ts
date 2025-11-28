export interface BrandDTO {
    id: string;
    brandCode: string;
    brandName: string;
    category: string;
    categoryId?: string;
    discount: number;
    denominationList: string[];
    brandType: string;
    minPrice: number;
    maxPrice: number;
    stockAvailable: number;
    isActive: boolean;
    description?: string;
    termsConditions?: string;
    images?: Record<string, unknown>;
}
export interface CategoryDTO {
    id: string;
    categoryName: string;
    categorySlug: string;
    icon?: string;
    displayOrder: number;
    isActive: boolean;
}
export declare class VoucherService {
    /**
     * Get all categories
     */
    getCategories(): Promise<CategoryDTO[]>;
    /**
     * Get all brands with caching strategy
     * 1. Check if cache exists and is valid
     * 2. If expired, fetch from ValueDesign API
     * 3. Update cache
     * 4. Return brands
     */
    getBrands(forceRefresh?: boolean): Promise<BrandDTO[]>;
    /**
     * Get brand by code
     */
    getBrandByCode(brandCode: string): Promise<BrandDTO>;
    /**
     * Get brands by category
     */
    getBrandsByCategory(categoryId: string): Promise<BrandDTO[]>;
    /**
     * Search brands by name
     */
    searchBrands(query: string): Promise<BrandDTO[]>;
    /**
     * Map brand_cache to BrandDTO
     */
    private mapBrands;
    /**
     * Parse denomination list from string
     */
    private parseDenominationList;
    /**
     * Get minimum price from denomination list
     */
    private getMinPrice;
    /**
     * Get maximum price from denomination list
     */
    private getMaxPrice;
    /**
     * Refresh brand cache from ValueDesign
     */
    refreshBrandCache(): Promise<void>;
}
export declare const voucherService: VoucherService;
//# sourceMappingURL=voucher.service.d.ts.map