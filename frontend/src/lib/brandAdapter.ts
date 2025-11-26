import { Brand as DBBrand, Category as DBCategory } from "@/hooks/useBrands";

/**
 * Adapter to map database fields to component-expected fields
 * This allows your existing components to work without changes
 */

// Map DB Brand to Component Brand
export interface ComponentBrand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  discount_percentage: number;
  category_id: string | null;
  is_featured: boolean;
  is_active: boolean;
  gst_status: string | null;
  brand_code: string;
}

// Map DB Category to Component Category
export interface ComponentCategory {
  id: string;
  name: string;
  slug: string;
  icon_name: string | null;
  display_order: number;
}

/**
 * Convert database brand to component-friendly format
 */
export const adaptBrand = (dbBrand: DBBrand): ComponentBrand => {
    // ✅ Parse images JSONB to get logo_url
    let logoUrl: string | null = null;

    if (dbBrand.images) {
        try {
            const images = typeof dbBrand.images === 'string'
                ? JSON.parse(dbBrand.images)
                : dbBrand.images;

            // Handle different image formats from VD API
            if (typeof images === 'string') {
                // Direct URL string
                logoUrl = images;
            } else if (typeof images === 'object') {
                // Check multiple possible fields
                logoUrl = images.main ||
                    images.logo ||
                    images.raw ||
                    images.url ||
                    images[0] || // Array format
                    null;
            }
        } catch (e) {
            // If parsing fails, try using directly as string
            if (typeof dbBrand.images === 'string') {
                logoUrl = dbBrand.images;
            }
            console.warn('Failed to parse brand images:', e);
        }
    }

    // ✅ Generate slug if missing
    const slug = dbBrand.slug ||
        dbBrand.brand_name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') ||
        dbBrand.brand_code;

    return {
        id: dbBrand.id,
        name: dbBrand.brand_name,
        slug: slug,
        description: dbBrand.description,
        logo_url: logoUrl, // ✅ This should now have the image URL
        discount_percentage: dbBrand.discount || 0,
        category_id: dbBrand.category_id || null,
        is_featured: dbBrand.brand_type?.toLowerCase() === 'featured',
        is_active: dbBrand.is_active || false,
        gst_status: 'Inclusive',
        brand_code: dbBrand.brand_code,
    };
};

/**
 * Convert database category to component-friendly format
 */
export const adaptCategory = (dbCategory: DBCategory): ComponentCategory => {
  return {
    id: dbCategory.id,
    name: dbCategory.category_name,
    slug: dbCategory.category_slug,
    icon_name: dbCategory.icon,
    display_order: dbCategory.display_order || 0,
  };
};

/**
 * Batch convert brands
 */
export const adaptBrands = (dbBrands: DBBrand[]): ComponentBrand[] => {
  return dbBrands.map(adaptBrand);
};

/**
 * Batch convert categories
 */
export const adaptCategories = (dbCategories: DBCategory[]): ComponentCategory[] => {
  return dbCategories.map(adaptCategory);
};
