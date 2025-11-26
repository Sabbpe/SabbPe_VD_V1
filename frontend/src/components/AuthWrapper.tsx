import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface AuthWrapperProps {
  children: React.ReactNode;
}

/**
 * AuthWrapper - Automatically logs in users as guests if not authenticated
 * This allows seamless browsing and purchasing without forcing login
 */
export const AuthWrapper = ({ children }: AuthWrapperProps) => {
  const { isAuthenticated, guestLogin } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (!isAuthenticated) {
        try {
          await guestLogin();
        } catch (error) {
          console.error('Auto guest login failed:', error);
        }
      }
      setIsInitializing(false);
    };

    initAuth();
  }, [isAuthenticated, guestLogin]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
