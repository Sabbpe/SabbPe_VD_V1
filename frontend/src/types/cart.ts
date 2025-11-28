// Cart item interface matching the adapted brand structure
export interface CartItem {
  id: string;
  brandId: string;
  brandName: string;
  brandSlug: string;
  category: string;
  denomination: number;
  discount: number;
  logoUrl: string | null;
  description: string | null;
}

// Helper to calculate cart totals
export interface CartSummary {
  subtotal: number;
  discount: number;
  total: number;
  itemCount: number;
}

export const calculateCartSummary = (items: CartItem[]): CartSummary => {
  const subtotal = items.reduce((sum, item) => sum + item.denomination, 0);
  const discount = items.reduce((sum, item) => {
    const discountAmount = item.denomination * (item.discount / 100);
    return sum + discountAmount;
  }, 0);
  const total = subtotal - discount;
  const itemCount = items.length;

  return {
    subtotal,
    discount,
    total,
    itemCount,
  };
};

// Helper to get final price for an item
export const getFinalPrice = (item: CartItem): number => {
  return item.denomination * (1 - item.discount / 100);
};

// Helper to group cart items by brand
export const groupCartItemsByBrand = (items: CartItem[]): Record<string, CartItem[]> => {
  return items.reduce((groups, item) => {
    const key = item.brandId;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, CartItem[]>);
};