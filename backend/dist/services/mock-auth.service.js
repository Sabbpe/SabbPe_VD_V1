"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockAuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
class MockAuthService {
    constructor() {
        // In-memory store for testing (will be cleared on server restart)
        this.users = new Map();
    }
    /**
     * Generate JWT token
     */
    generateToken(payload) {
        return jsonwebtoken_1.default.sign(payload, env_1.config.jwtSecret, {
            expiresIn: env_1.config.jwtExpiry,
        });
    }
    /**
     * Guest login - create temporary session without database
     */
    async guestLogin(email) {
        try {
            logger_1.logger.info('Mock guest login initiated', { email });
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
            logger_1.logger.info('✓ Mock guest login successful', { userId, email: userEmail });
            return {
                user: {
                    id: userId,
                    email: userEmail,
                },
                token,
                expiresIn: env_1.config.jwtExpiry,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger_1.logger.error('Mock guest login failed', { error: errorMessage });
            throw error;
        }
    }
    /**
     * Verify token validity
     */
    verifyToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, env_1.config.jwtSecret);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger_1.logger.warn('Token verification failed', { error: errorMessage });
            throw new Error('Invalid or expired token');
        }
    }
    /**
     * Refresh token
     */
    refreshToken(oldToken) {
        try {
            const decoded = this.verifyToken(oldToken);
            const newToken = this.generateToken({
                userId: decoded.userId,
                email: decoded.email,
                userType: decoded.userType,
            });
            logger_1.logger.info('Token refreshed', { userId: decoded.userId });
            return newToken;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger_1.logger.error('Token refresh failed', { error: errorMessage });
            throw error;
        }
    }
    /**
     * Get user by ID
     */
    getUser(userId) {
        return this.users.get(userId);
    }
}
// Export singleton instance
exports.mockAuthService = new MockAuthService();
exports.default = MockAuthService;
//# sourceMappingURL=mock-auth.service.js.map