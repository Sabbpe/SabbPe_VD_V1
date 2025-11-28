import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ✅ Updated interfaces to match actual schema
export interface Brand {
  id: string;
  brand_code: string;
  brand_name: string;
  slug: string; // ✅ Added slug field
  category: string | null;
  discount: number | null;
  denomination_list: string | null;
  brand_type: string | null;
  stock_available: number | null;
  is_active: boolean | null;
  description: string | null;
  terms_conditions: string | null;
  images: unknown | null; // JSONB field
  last_fetched_at: string | null;
  cache_expires_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Category {
  id: string;
  category_name: string;
  category_slug: string;
  icon: string | null;
  display_order: number | null;
  is_active: boolean | null;
  created_at: string | null;
}

export interface VoucherDenomination {
  value: number;
  is_available: boolean;
  display_order: number;
}

// ✅ Fetch brands from vouchers.brand_cache
export const useBrands = () => {
  return useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_cache")  // ✅ Changed from "brands" to "brand_cache"
        .select("*")
        .eq("is_active", true)
        .order("brand_name");  // ✅ Changed from "name" to "brand_name"
      
      if (error) {
        console.error("Error fetching brands:", error);
        throw error;
      }
      return data as Brand[];
    },
  });
};

// ✅ Fetch single brand by slug
export const useBrand = (slug: string) => {
  return useQuery({
    queryKey: ["brand", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_cache")
        .select("*")
        .eq("slug", slug)  // ✅ Using slug, not brand_code
        .eq("is_active", true)
        .single();
      
      if (error) {
        console.error("Error fetching brand:", error);
        throw error;
      }
      return data as Brand;
    },
    enabled: !!slug,
  });
};

// ✅ Fetch categories from vouchers.voucher_categories
export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voucher_categories")  // ✅ Changed table name
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      
      if (error) {
        console.error("Error fetching categories:", error);
        throw error;
      }
      return data as Category[];
    },
  });
};

// ✅ Parse denominations from denomination_list field
export const useVoucherDenominations = (brandId: string) => {
  return useQuery({
    queryKey: ["voucher-denominations", brandId],
    queryFn: async () => {
      // First, get the brand to access denomination_list
      const { data: brand, error } = await supabase
        .from("brand_cache")
        .select("denomination_list")
        .eq("id", brandId)
        .single();
      
      if (error) {
        console.error("Error fetching denominations:", error);
        throw error;
      }

      // Parse denomination_list (it's stored as text, likely comma-separated)
      if (!brand?.denomination_list) {
        return [] as VoucherDenomination[];
      }

      // Parse the denomination list
      // Format could be: "100,500,1000" or "100|500|1000" or JSON
      try {
        let denominations: number[] = [];
        
        // Try parsing as JSON first
        try {
          denominations = JSON.parse(brand.denomination_list);
        } catch {
          // If not JSON, try comma or pipe separated
          const separator = brand.denomination_list.includes('|') ? '|' : ',';
          denominations = brand.denomination_list
            .split(separator)
            .map(d => parseFloat(d.trim()))
            .filter(d => !isNaN(d));
        }

        // Convert to VoucherDenomination objects
        return denominations
          .sort((a, b) => a - b)
          .map((value, index) => ({
            value,
            is_available: true,
            display_order: index,
          })) as VoucherDenomination[];
      } catch (parseError) {
        console.error("Error parsing denomination_list:", parseError);
        return [] as VoucherDenomination[];
      }
    },
    enabled: !!brandId,
  });
};