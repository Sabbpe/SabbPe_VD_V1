import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/api/client';

export interface User {
    userId: string;
    email: string;
    role: 'guest' | 'customer' | 'merchant' | 'admin';
}

interface GuestLoginResponse {
    success: boolean;
    data?: {
        token: string;
        user: {
            id: string;
            email: string;
        };
    };
    error?: string;
}

interface MerchantLoginResponse {
    success: boolean;
    data?: {
        token: string;
        merchant: {
            userId: string;
            email: string;
            businessName: string;
            mobileNumber: string;
        };
    };
    error?: string;
}

interface MerchantRegisterResponse {
    success: boolean;
    data?: {
        token: string;
        user: {
            id: string;
            email: string;
        };
    };
    error?: string;
}

export interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    guestLogin: (email?: string) => Promise<void>;
    merchantRegister: (data: MerchantRegisterData) => Promise<void>;
    merchantLogin: (email: string, mobileNumber: string) => Promise<void>;
    logout: () => Promise<void>;
    error: string | null;
}

export interface MerchantRegisterData {
    email: string;
    password: string;
    fullName: string;
    mobileNumber: string;
    businessName: string;
    panNumber?: string;
    gstNumber?: string;
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ✅ Load user from localStorage on mount
    useEffect(() => {
        const savedUser = localStorage.getItem('auth_user');
        const token = localStorage.getItem('auth_token');
        
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (err) {
                console.error('Failed to parse saved user:', err);
                localStorage.removeItem('auth_user');
            }
        } else if (token) {
            try {
                const decoded = JSON.parse(atob(token.split('.')[1]));
                setUser({
                    userId: decoded.userId,
                    email: decoded.email,
                    role: decoded.role,
                });
            } catch (err) {
                console.error('Failed to decode token:', err);
                localStorage.removeItem('auth_token');
            }
        }
    }, []);

    // ✅ Save user to localStorage whenever it changes
    useEffect(() => {
        if (user) {
            localStorage.setItem('auth_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('auth_user');
        }
    }, [user]);

    const guestLogin = useCallback(async (email?: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient.post<GuestLoginResponse>('/auth/guest-login', { email });
            if (response.success && response.data) {
                const data = response.data as unknown as { token: string; user: { id: string; email: string } };
                apiClient.setToken(data.token);
                setUser({
                    userId: data.user.id,
                    email: data.user.email,
                    role: 'guest',
                });
            } else {
                setError(response.error || 'Guest login failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Guest login failed');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const merchantRegister = useCallback(async (data: MerchantRegisterData) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient.post<MerchantRegisterResponse>('/auth/merchant-register', data);
            if (response.success && response.data) {
                const regData = response.data as unknown as { token: string; user: { id: string; email: string } };
                apiClient.setToken(regData.token);
                setUser({
                    userId: regData.user.id,
                    email: regData.user.email,
                    role: 'merchant',
                });
            } else {
                setError(response.error || 'Registration failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const merchantLogin = useCallback(async (email: string, mobileNumber: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient.post<MerchantLoginResponse>('/auth/merchant/login', {
                email,
                mobile_number: mobileNumber,
            });
            if (response.success && response.data) {
                const loginData = response.data as unknown as { token: string; merchant: { userId: string; email: string; businessName: string; mobileNumber: string } };
                apiClient.setToken(loginData.token);
                setUser({
                    userId: loginData.merchant.userId,
                    email: loginData.merchant.email,
                    role: 'merchant',
                });
            } else {
                setError(response.error || 'Login failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        setIsLoading(true);
        try {
            await apiClient.post('/auth/logout', {});
            apiClient.clearToken();
            setUser(null);
            localStorage.removeItem('auth_user');
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        user,
        isLoading,
        isAuthenticated: !!user,
        guestLogin,
        merchantRegister,
        merchantLogin,
        logout,
        error,
    };
}
