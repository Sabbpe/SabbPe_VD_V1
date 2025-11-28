import { useState, useCallback } from 'react';
import { apiClient } from '@/api/client';

export interface PaymentResponse {
  paymentUrl: string;
  paymentId: string;
}

export interface PaymentStatus {
  orderId: string;
  paymentId: string;
  status: string;
  amount: number;
  message: string;
}

export function usePayment() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiatePayment = useCallback(
    async (
      orderId: string,
      email: string,
      phone: string
    ): Promise<PaymentResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.post<PaymentResponse>('/payment/initiate', {
          orderId,
          email,
          phone,
        });

        if (response.success && response.data) {
          return response.data;
        } else {
          setError(response.error || 'Failed to initiate payment');
          return null;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initiate payment');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getPaymentStatus = useCallback(async (orderId: string): Promise<PaymentStatus | null> => {
    try {
      const response = await apiClient.get<PaymentStatus>(
        `/payment/status/${orderId}`
      );

      if (response.success && response.data) {
        return response.data;
      } else {
        setError(response.error || 'Failed to fetch payment status');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payment status');
      return null;
    }
  }, []);

  const handlePaymentRedirect = useCallback((paymentUrl: string) => {
    // Redirect to Sabbpe payment gateway
    window.location.href = paymentUrl;
  }, []);

  return {
    isLoading,
    error,
    initiatePayment,
    getPaymentStatus,
    handlePaymentRedirect,
  };
}