"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireCustomer = exports.requireMerchant = exports.requireAuth = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
/**
 * Authentication middleware - validates JWT token
 * Allows both authenticated and unauthenticated (guest) access
 */
const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            // Allow guest access - optional authentication
            return next();
        }
        const decoded = jsonwebtoken_1.default.verify(token, env_1.config.jwtSecret);
        req.user = decoded;
        next();
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.warn('Invalid token', { error: errorMessage });
        // Invalid token - still allow guest access for testing
        next();
    }
};
exports.authMiddleware = authMiddleware;
/**
 * Strict authentication middleware - requires valid token
 */
const requireAuth = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            res.status(401).json({ success: false, error: 'No token provided' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, env_1.config.jwtSecret);
        req.user = decoded;
        next();
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.warn('Token verification failed', { error: errorMessage });
        res.status(401).json({ success: false, error: 'Invalid token' });
    }
};
exports.requireAuth = requireAuth;
/**
 * Require user to be a merchant
 */
const requireMerchant = (req, res, next) => {
    (0, exports.requireAuth)(req, res, () => {
        if (!req.user || req.user.role !== 'merchant') {
            res.status(403).json({ success: false, error: 'Only merchants can access this' });
            return;
        }
        next();
    });
};
exports.requireMerchant = requireMerchant;
/**
 * Require user to be a customer
 */
const requireCustomer = (req, res, next) => {
    (0, exports.requireAuth)(req, res, () => {
        if (!req.user || (req.user.role !== 'customer' && req.user.role !== 'guest')) {
            res.status(403).json({ success: false, error: 'Only customers can access this' });
            return;
        }
        next();
    });
};
exports.requireCustomer = requireCustomer;
exports.default = exports.authMiddleware;
//# sourceMappingURL=auth.middleware.js.map