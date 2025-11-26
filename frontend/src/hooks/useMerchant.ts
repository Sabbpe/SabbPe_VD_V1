import { useState, useCallback } from 'react';
import { apiClient } from '@/api/client';

export interface MerchantDashboard {
  merchant: unknown;
  kycStatus: string;
  approvalStatus: string;
  documents: Array<{ type: string; status: string }>;
  canMakePurchases: boolean;
}

export interface KYCData {
  videoKycFilePath?: string;
  selfieFilePath?: string;
  latitude?: number;
  longitude?: number;
}

export interface DocumentUploadData {
  documentType: 'pan' | 'gst' | 'aadhar' | 'business_license' | 'bank_statement';
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
}

export function useMerchant() {
  const [dashboard, setDashboard] = useState<MerchantDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<MerchantDashboard>('/merchants/dashboard');

      if (response.success && response.data) {
        setDashboard(response.data);
      } else {
        setError(response.error || 'Failed to fetch dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitKYC = useCallback(async (data: KYCData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/merchants/kyc', data);

      if (response.success) {
        // Refresh dashboard
        await fetchDashboard();
        return true;
      } else {
        setError(response.error || 'Failed to submit KYC');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit KYC');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchDashboard]);

  const uploadDocument = useCallback(
    async (data: DocumentUploadData) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.post('/merchants/documents', data);

        if (response.success) {
          // Refresh dashboard
          await fetchDashboard();
          return true;
        } else {
          setError(response.error || 'Failed to upload document');
          return false;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload document');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchDashboard]
  );

  const onboardWithSabbpe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<unknown>('/merchants/sabbpe-onboard', {});

      if (response.success && response.data) {
        // Redirect to Sabbpe KYC
        if (response.data.data?.kycUrl) {
          window.location.href = response.data.data.kycUrl;
        }
        return true;
      } else {
        setError(response.error || 'Failed to onboard with Sabbpe');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to onboard with Sabbpe');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    dashboard,
    isLoading,
    error,
    fetchDashboard,
    submitKYC,
    uploadDocument,
    onboardWithSabbpe,
  };
}