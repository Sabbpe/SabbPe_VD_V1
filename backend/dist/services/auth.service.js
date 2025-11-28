"use strict";
// CORRECTED auth.service.ts - FULL FILE
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const database_1 = require("../types/database");
class AuthService {
    /**
     * Generate JWT token
     */
    generateToken(payload) {
        return jsonwebtoken_1.default.sign(payload, env_1.config.jwtSecret, {
            expiresIn: env_1.config.jwtExpiry,
        });
    }
    /**
     * Guest login - create temporary session without registration
     */
    async guestLogin(email) {
        try {
            logger_1.logger.info('Guest login initiated', { email });
            // Generate random password for guest
            const guestPassword = Math.random().toString(36).slice(-12);
            // Create guest user in auth.users
            const { data: authData, error: authError } = await supabase_1.supabase.auth.admin.createUser({
                email: email || `guest-${Date.now()}@giftgo.local`,
                password: guestPassword,
                email_confirm: true,
            });
            if (authError) {
                throw new Error(`Failed to create guest user: ${authError.message}`);
            }
            const userId = authData.user.id;
            const userEmail = authData.user.email;
            // Assign GUEST role
            const { error: roleError } = await supabase_1.supabase
                .from('user_roles')
                .insert([
                {
                    user_id: userId,
                    role: database_1.UserRole.GUEST,
                },
            ]);
            if (roleError) {
                throw new Error(`Failed to assign guest role: ${roleError.message}`);
            }
            // Generate JWT
            const token = this.generateToken({
                userId,
                email: userEmail,
                role: database_1.UserRole.GUEST,
            });
            logger_1.logger.info('✓ Guest login successful', { userId });
            return {
                user: {
                    id: userId,
                    email: userEmail,
                    created_at: authData.user.created_at,
                },
                token,
                expiresIn: env_1.config.jwtExpiry,
            };
        }
        catch (error) {
            logger_1.logger.error('Guest login failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Merchant registration
     */
    async merchantRegister(req) {
        try {
            logger_1.logger.info('Merchant registration initiated', { email: req.email });
            // Check if email already exists
            const { data: existingUser } = await supabase_1.supabase
                .from('merchant_profiles')
                .select('id')
                .eq('email', req.email)
                .single();
            if (existingUser) {
                throw new errors_1.ConflictError('Email already registered');
            }
            // Create auth user with proper error handling
            const { data: authData, error: authError } = await supabase_1.supabase.auth.admin.createUser({
                email: req.email,
                password: req.password,
                email_confirm: true,
            });
            if (authError) {
                throw new Error(`Failed to create user: ${authError.message}`);
            }
            const userId = authData.user.id;
            // Create merchant profile
            const { error: profileError } = await supabase_1.supabase
                .from('merchant_profiles')
                .insert([
                {
                    user_id: userId,
                    full_name: req.fullName,
                    mobile_number: req.mobileNumber,
                    email: req.email,
                    business_name: req.businessName,
                    pan_number: req.panNumber || null,
                    aadhaar_number: req.aadhaarNumber || null,
                    gst_number: req.gstNumber || null,
                    onboarding_status: 'pending',
                },
            ]);
            if (profileError) {
                throw new Error(`Failed to create merchant profile: ${profileError.message}`);
            }
            // Create merchant_sync entry
            const { error: syncError } = await supabase_1.supabase
                .from('merchant_sync')
                .insert([
                {
                    merchant_id: userId,
                    user_id: userId,
                    business_name: req.businessName,
                    email: req.email,
                    mobile_number: req.mobileNumber,
                    is_approved: false,
                },
            ]);
            if (syncError) {
                logger_1.logger.warn('Failed to create merchant_sync entry', { error: syncError.message });
            }
            // Assign MERCHANT role
            const { error: roleError } = await supabase_1.supabase
                .from('user_roles')
                .insert([
                {
                    user_id: userId,
                    role: database_1.UserRole.MERCHANT,
                },
            ]);
            if (roleError) {
                throw new Error(`Failed to assign merchant role: ${roleError.message}`);
            }
            // Generate JWT
            const token = this.generateToken({
                userId,
                email: req.email,
                role: database_1.UserRole.MERCHANT,
            });
            logger_1.logger.info('✓ Merchant registered successfully', { userId, email: req.email });
            return {
                user: {
                    id: userId,
                    email: req.email,
                    created_at: authData.user.created_at,
                },
                token,
                expiresIn: env_1.config.jwtExpiry,
            };
        }
        catch (error) {
            logger_1.logger.error('Merchant registration failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Merchant login with approval check
     */
    async merchantLogin(email, password) {
        try {
            logger_1.logger.info('Merchant login initiated', { email });
            // Authenticate with Supabase
            const { data: authData, error: authError } = await supabase_1.supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (authError) {
                logger_1.logger.warn('Authentication failed', { email, error: authError.message });
                throw new errors_1.UnauthorizedError('Invalid email or password');
            }
            const userId = authData.user.id;
            // Get merchant profile
            const { data: merchantProfile, error: profileError } = await supabase_1.supabase
                .from('merchant_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();
            if (profileError || !merchantProfile) {
                throw new errors_1.NotFoundError('Merchant profile not found');
            }
            // Get merchant_sync to check approval
            const { data: merchantSync, error: syncError } = await supabase_1.supabase
                .from('merchant_sync')
                .select('*')
                .eq('user_id', userId)
                .single();
            if (syncError) {
                logger_1.logger.warn('Failed to fetch merchant_sync', { error: syncError.message });
            }
            const isApproved = merchantSync?.is_approved || false;
            // Get user role
            const { data: roleData } = await supabase_1.supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', userId)
                .single();
            const role = roleData?.role || database_1.UserRole.MERCHANT;
            // Generate JWT
            const token = this.generateToken({
                userId,
                email,
                role: role,
            });
            logger_1.logger.info('✓ Merchant login successful', {
                userId,
                email,
                isApproved,
            });
            return {
                user: {
                    id: userId,
                    email,
                    created_at: authData.user.created_at,
                },
                merchant: merchantSync,
                token,
                expiresIn: env_1.config.jwtExpiry,
                isApproved,
            };
        }
        catch (error) {
            logger_1.logger.error('Merchant login failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Customer login (if supporting non-merchant registrations)
     */
    async customerLogin(email, password) {
        try {
            logger_1.logger.info('Customer login initiated', { email });
            const { data: authData, error: authError } = await supabase_1.supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (authError) {
                logger_1.logger.warn('Authentication failed', { email, error: authError.message });
                throw new errors_1.UnauthorizedError('Invalid email or password');
            }
            const userId = authData.user.id;
            // Get user role
            const { data: roleData } = await supabase_1.supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', userId)
                .single();
            const role = roleData?.role || database_1.UserRole.CUSTOMER;
            const token = this.generateToken({
                userId,
                email,
                role: role,
            });
            logger_1.logger.info('✓ Customer login successful', { userId, email });
            return {
                user: {
                    id: userId,
                    email,
                    created_at: authData.user.created_at,
                },
                token,
                expiresIn: env_1.config.jwtExpiry,
            };
        }
        catch (error) {
            logger_1.logger.error('Customer login failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Logout - token is stateless, client handles deletion
     */
    async logout(userId) {
        try {
            logger_1.logger.info('User logout', { userId });
            // Stateless JWT - just log the event
            // In production, could maintain a blacklist if needed
        }
        catch (error) {
            logger_1.logger.error('Logout failed', {
                error: error instanceof Error ? error.message : String(error),
            });
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
            logger_1.logger.warn('Token verification failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw new errors_1.UnauthorizedError('Invalid or expired token');
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
                role: decoded.role,
            });
            logger_1.logger.info('Token refreshed', { userId: decoded.userId });
            return newToken;
        }
        catch (error) {
            logger_1.logger.error('Token refresh failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
//# sourceMappingURL=auth.service.js.map