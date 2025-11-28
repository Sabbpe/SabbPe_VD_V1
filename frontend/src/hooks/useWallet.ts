import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/api/client';

export interface WalletData {
    balance: number;
    currency: string;
    walletId: string;
}

export function useWallet() {
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch wallet balance
    const fetchBalance = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient.get('/wallet/balance');
            if (response.success && response.data) {
                setWallet(response.data as WalletData);
            } else {
                setError(response.error || 'Failed to fetch wallet');
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to fetch wallet';
            setError(errorMsg);
            console.error('Wallet fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initiate wallet topup
    const initiateTopup = useCallback(async (amount: number, paymentMethod: string = 'NB') => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient.post('/wallet/topup', {
                amount,
                paymentMethod,
            });

            if (response.success && response.data) {
                return {
                    success: true,
                    data: response.data as Record<string, unknown>,
                };
            } else {
                setError(response.error || 'Failed to initiate topup');
                return {
                    success: false,
                    error: response.error || 'Failed to initiate topup',
                };
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to initiate topup';
            setError(errorMsg);
            return {
                success: false,
                error: errorMsg,
            };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load wallet on mount
    useEffect(() => {
        fetchBalance();
    }, [fetchBalance]);

    return {
        wallet,
        isLoading,
        error,
        fetchBalance,
        initiateTopup,
    };
}
