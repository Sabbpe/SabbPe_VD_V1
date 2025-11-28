import { Brand as DBBrand, Category as DBCategory } from "@/hooks/useBrands";

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
  brand_type?: string;
  // NEW FIELDS
  channel?: string;
  voucher_bills?: string;
  sub_description?: string;
  validity_days?: number;
  terms_and_conditions?: string;
  redeem_steps?: string;
  important_instructions?: string;
  images?: string;
}

export interface ComponentCategory {
  id: string;
  name: string;
  slug: string;
  icon_name: string | null;
  display_order: number;
}

export const adaptBrand = (dbBrand: DBBrand): ComponentBrand => {
    let logoUrl: string | null = null;
    if (dbBrand.images) {
        try {
            const images = typeof dbBrand.images === 'string' ? JSON.parse(dbBrand.images) : dbBrand.images;
            if (typeof images === 'string') {
                logoUrl = images;
            } else if (typeof images === 'object') {
                logoUrl = images.main || images.logo || images.raw || images.url || images[0] || null;
            }
        } catch (e) {
            if (typeof dbBrand.images === 'string') logoUrl = dbBrand.images;
        }
    }

    const slug = dbBrand.slug || dbBrand.brand_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || dbBrand.brand_code;

    return {
        id: dbBrand.id,
        name: dbBrand.brand_name,
        slug: slug,
        description: dbBrand.description,
        logo_url: logoUrl,
        discount_percentage: dbBrand.discount || 0,
        category_id: dbBrand.category_id || null,
        is_featured: dbBrand.brand_type?.toLowerCase() === 'featured',
        is_active: dbBrand.is_active || false,
        gst_status: 'Inclusive',
        brand_code: dbBrand.brand_code,
        brand_type: dbBrand.brand_type,
        // NEW FIELDS
        channel: dbBrand.channel,
        voucher_bills: dbBrand.voucher_bills,
        sub_description: dbBrand.sub_description,
        validity_days: dbBrand.validity_days,
        terms_and_conditions: dbBrand.terms_and_conditions,
        redeem_steps: dbBrand.redeem_steps,
        important_instructions: dbBrand.important_instructions,
        images: typeof dbBrand.images === 'string' ? dbBrand.images : JSON.stringify(dbBrand.images),
    };
};

export const adaptCategory = (dbCategory: DBCategory): ComponentCategory => {
  return {
    id: dbCategory.id,
    name: dbCategory.category_name,
    slug: dbCategory.category_slug,
    icon_name: dbCategory.icon,
    display_order: dbCategory.display_order || 0,
  };
};

export const adaptBrands = (dbBrands: DBBrand[]): ComponentBrand[] => {
  return dbBrands.map(adaptBrand);
};

export const adaptCategories = (dbCategories: DBCategory[]): ComponentCategory[] => {
  return dbCategories.map(adaptCategory);
};
