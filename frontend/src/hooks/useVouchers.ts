import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/api/client';

export interface Brand {
  id: string;
  brandCode: string;
  brandName: string;
  category: string;
  discount: number;
  denominationList: string[];
  brandType: string;
  minPrice: number;
  maxPrice: number;
  stockAvailable: number;
  isActive: boolean;
  description?: string;
  images?: Record<string, unknown>;
}

export interface Category {
  id: string;
  categoryName: string;
  categorySlug: string;
  icon?: string;
  displayOrder: number;
  isActive: boolean;
}

export function useVouchers() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await apiClient.get<Category[]>('/vouchers/categories');
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  const fetchBrands = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = forceRefresh ? '/vouchers/brands?refresh=true' : '/vouchers/brands';
      const response = await apiClient.get<Brand[]>(url);

      if (response.success && response.data) {
        setBrands(response.data);
      } else {
        setError(response.error || 'Failed to fetch brands');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch brands');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchBrands = useCallback(async (query: string): Promise<Brand[]> => {
    try {
      const response = await apiClient.get<Brand[]>(`/vouchers/search?q=${query}`);
      return response.data || [];
    } catch (err) {
      console.error('Search error:', err);
      return [];
    }
  }, []);

  const getBrandsByCategory = useCallback(async (categoryId: string): Promise<Brand[]> => {
    try {
      const response = await apiClient.get<Brand[]>(
        `/vouchers/categories/${categoryId}/brands`
      );
      return response.data || [];
    } catch (err) {
      console.error('Failed to fetch category brands:', err);
      return [];
    }
  }, []);

  // Fetch categories and brands on mount
  useEffect(() => {
    fetchCategories();
    fetchBrands();
  }, [fetchCategories, fetchBrands]);

  return {
    brands,
    categories,
    isLoading,
    error,
    fetchBrands,
    searchBrands,
    getBrandsByCategory,
  };
}
