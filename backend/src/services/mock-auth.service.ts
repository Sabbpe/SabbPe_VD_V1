import jwt from 'jsonwebtoken';
import { config } from '@/config/env';
import { logger } from '@/utils/logger';

export interface JWTPayload {
    userId: string;
    email: string;
    userType: 'guest' | 'merchant' | 'customer';
}

export interface GuestLoginResponse {
    user: {
        id: string;
        email: string;
    };
    token: string;
    expiresIn: string;
}

class MockAuthService {
    // In-memory store for testing (will be cleared on server restart)
    private users: Map<string, any> = new Map();

    /**
     * Generate JWT token
     */
    private generateToken(payload: JWTPayload): string {
        return jwt.sign(payload, config.jwtSecret as string, {
            expiresIn: config.jwtExpiry,
        } as any);
    }

    /**
     * Guest login - create temporary session without database
     */
    async guestLogin(email?: string): Promise<GuestLoginResponse> {
        try {
            logger.info('Mock guest login initiated', { email });

            const userId = `guest-${Date.now()}`;
            const userEmail = email || `guest-${Date.now()}@test.local`;

            // Store user in memory
            this.users.set(userId, {
                id: userId,
                email: userEmail,
                userType: 'guest',
                created_at: new Date(),
            });

            // Generate JWT
            const token = this.generateToken({
                userId,
                email: userEmail,
                userType: 'guest',
            });

            logger.info('✓ Mock guest login successful', { userId, email: userEmail });

            return {
                user: {
                    id: userId,
                    email: userEmail,
                },
                token,
                expiresIn: config.jwtExpiry,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('Mock guest login failed', { error: errorMessage });
            throw error;
        }
    }

    /**
     * Verify token validity
     */
    verifyToken(token: string): JWTPayload {
        try {
            return jwt.verify(token, config.jwtSecret as string) as JWTPayload;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.warn('Token verification failed', { error: errorMessage });
            throw new Error('Invalid or expired token');
        }
    }

    /**
     * Refresh token
     */
    refreshToken(oldToken: string): string {
        try {
            const decoded = this.verifyToken(oldToken);

            const newToken = this.generateToken({
                userId: decoded.userId,
                email: decoded.email,
                userType: decoded.userType,
            });

            logger.info('Token refreshed', { userId: decoded.userId });
            return newToken;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('Token refresh failed', { error: errorMessage });
            throw error;
        }
    }

    /**
     * Get user by ID
     */
    getUser(userId: string) {
        return this.users.get(userId);
    }
}

// Export singleton instance
export const mockAuthService = new MockAuthService();
export default MockAuthService;