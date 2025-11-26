// FILE 7: src/context/AuthContext.tsx
// Auth context provider
// ============================================

import React, { createContext, ReactNode } from 'react';
import { useAuth, AuthContextType } from '@/hooks/useAuth';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}