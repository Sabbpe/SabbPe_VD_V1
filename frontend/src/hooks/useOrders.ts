import { useState, useCallback } from 'react';
import { apiClient } from '@/api/client';

export interface OrderRecipient {
  name: string;
  email: string;
  mobile: string;
}

export interface Order {
  id: string;
  orderId: string;
  brandCode: string;
  brandName: string;
  quantity: number;
  totalAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  recipient: OrderRecipient;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CreateOrderData {
  brandCode: string;
  brandName: string;
  skuCode: string;
  quantity: number;
  amountPerVoucher: number;
  recipientFirstName: string;
  recipientLastName: string;
  recipientMobile: string;
  recipientEmail: string;
  recipientAddress?: string;
  recipientCity?: string;
  recipientState?: string;
  recipientPincode?: string;
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrder = useCallback(async (data: CreateOrderData): Promise<Order | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<Order>('/orders', data);

      if (response.success && response.data) {
        setCurrentOrder(response.data);
        return response.data;
      } else {
        setError(response.error || 'Failed to create order');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async (limit = 50, offset = 0) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<Order[]>(
        `/orders?limit=${limit}&offset=${offset}`
      );

      if (response.success && response.data) {
        setOrders(response.data);
      } else {
        setError(response.error || 'Failed to fetch orders');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getOrder = useCallback(async (orderId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<Order>(`/orders/${orderId}`);

      if (response.success && response.data) {
        setCurrentOrder(response.data);
        return response.data;
      } else {
        setError(response.error || 'Failed to fetch order');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch order');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancelOrder = useCallback(async (orderId: string, reason?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<Order>(`/orders/${orderId}/cancel`, {
        reason,
      });

      if (response.success && response.data) {
        setCurrentOrder(response.data);
        return response.data;
      } else {
        setError(response.error || 'Failed to cancel order');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel order');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    orders,
    currentOrder,
    isLoading,
    error,
    createOrder,
    fetchOrders,
    getOrder,
    cancelOrder,
  };
}
