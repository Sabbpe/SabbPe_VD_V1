// CORRECTED auth.service.ts - FULL FILE

import jwt from 'jsonwebtoken';
import { config } from '@/config/env';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';
import { UnauthorizedError, ConflictError, NotFoundError } from '@/utils/errors';
import { User, UserRole, MerchantSync } from '@/types/database';

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface GuestLoginResponse {
  user: User;
  token: string;
  expiresIn: string;
}

export interface MerchantRegisterRequest {
  email: string;
  password: string;
  fullName: string;
  mobileNumber: string;
  businessName: string;
  panNumber?: string;
  aadhaarNumber?: string;
  gstNumber?: string;
}

export interface MerchantLoginResponse {
  user: User;
  merchant: MerchantSync;
  token: string;
  expiresIn: string;
  isApproved: boolean;
}

export class AuthService {
  /**
   * Generate JWT token
   */
    public generateToken(payload: JWTPayload): string {
        return jwt.sign(payload, config.jwtSecret, {
            expiresIn: config.jwtExpiry,
        } as any);
    }

  /**
   * Guest login - create temporary session without registration
   */
  async guestLogin(email?: string): Promise<GuestLoginResponse> {
    try {
      logger.info('Guest login initiated', { email });

      // Generate random password for guest
      const guestPassword = Math.random().toString(36).slice(-12);

      // Create guest user in auth.users
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email || `guest-${Date.now()}@giftgo.local`,
        password: guestPassword,
        email_confirm: true,
      });

      if (authError) {
        throw new Error(`Failed to create guest user: ${authError.message}`);
      }

      const userId = authData.user!.id;
      const userEmail = authData.user!.email!;

      // Assign GUEST role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([
          {
            user_id: userId,
            role: UserRole.GUEST,
          },
        ]);

      if (roleError) {
        throw new Error(`Failed to assign guest role: ${roleError.message}`);
      }

      // Generate JWT
      const token = this.generateToken({
        userId,
        email: userEmail,
        role: UserRole.GUEST,
      });

      logger.info('✓ Guest login successful', { userId });

      return {
        user: {
          id: userId,
          email: userEmail,
          created_at: authData.user!.created_at!,
        },
        token,
        expiresIn: config.jwtExpiry,
      };
    } catch (error) {
      logger.error('Guest login failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Merchant registration
   */
  async merchantRegister(req: MerchantRegisterRequest): Promise<GuestLoginResponse> {
    try {
      logger.info('Merchant registration initiated', { email: req.email });

      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('merchant_profiles')
        .select('id')
        .eq('email', req.email)
        .single();

      if (existingUser) {
        throw new ConflictError('Email already registered');
      }

      // Create auth user with proper error handling
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: req.email,
        password: req.password,
        email_confirm: true,
      });

      if (authError) {
        throw new Error(`Failed to create user: ${authError.message}`);
      }

      const userId = authData.user!.id;

      // Create merchant profile
      const { error: profileError } = await supabase
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
      const { error: syncError } = await supabase
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
        logger.warn('Failed to create merchant_sync entry', { error: syncError.message });
      }

      // Assign MERCHANT role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([
          {
            user_id: userId,
            role: UserRole.MERCHANT,
          },
        ]);

      if (roleError) {
        throw new Error(`Failed to assign merchant role: ${roleError.message}`);
      }

      // Generate JWT
      const token = this.generateToken({
        userId,
        email: req.email,
        role: UserRole.MERCHANT,
      });

      logger.info('✓ Merchant registered successfully', { userId, email: req.email });

      return {
        user: {
          id: userId,
          email: req.email,
          created_at: authData.user!.created_at!,
        },
        token,
        expiresIn: config.jwtExpiry,
      };
    } catch (error) {
      logger.error('Merchant registration failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Merchant login with approval check
   */
  async merchantLogin(email: string, password: string): Promise<MerchantLoginResponse> {
    try {
      logger.info('Merchant login initiated', { email });

      // Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        logger.warn('Authentication failed', { email, error: authError.message });
        throw new UnauthorizedError('Invalid email or password');
      }

      const userId = authData.user!.id;

      // Get merchant profile
      const { data: merchantProfile, error: profileError } = await supabase
        .from('merchant_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError || !merchantProfile) {
        throw new NotFoundError('Merchant profile not found');
      }

      // Get merchant_sync to check approval
      const { data: merchantSync, error: syncError } = await supabase
        .from('merchant_sync')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (syncError) {
        logger.warn('Failed to fetch merchant_sync', { error: syncError.message });
      }

      const isApproved = merchantSync?.is_approved || false;

      // Get user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      const role = roleData?.role || UserRole.MERCHANT;

      // Generate JWT
      const token = this.generateToken({
        userId,
        email,
        role: role as UserRole,
      });

      logger.info('✓ Merchant login successful', {
        userId,
        email,
        isApproved,
      });

      return {
        user: {
          id: userId,
          email,
          created_at: authData.user!.created_at!,
        },
        merchant: merchantSync as MerchantSync,
        token,
        expiresIn: config.jwtExpiry,
        isApproved,
      };
    } catch (error) {
      logger.error('Merchant login failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Customer login (if supporting non-merchant registrations)
   */
  async customerLogin(email: string, password: string): Promise<GuestLoginResponse> {
    try {
      logger.info('Customer login initiated', { email });

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        logger.warn('Authentication failed', { email, error: authError.message });
        throw new UnauthorizedError('Invalid email or password');
      }

      const userId = authData.user!.id;

      // Get user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      const role = roleData?.role || UserRole.CUSTOMER;

      const token = this.generateToken({
        userId,
        email,
        role: role as UserRole,
      });

      logger.info('✓ Customer login successful', { userId, email });

      return {
        user: {
          id: userId,
          email,
          created_at: authData.user!.created_at!,
        },
        token,
        expiresIn: config.jwtExpiry,
      };
    } catch (error) {
      logger.error('Customer login failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Logout - token is stateless, client handles deletion
   */
  async logout(userId: string): Promise<void> {
    try {
      logger.info('User logout', { userId });
      // Stateless JWT - just log the event
      // In production, could maintain a blacklist if needed
    } catch (error) {
      logger.error('Logout failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Verify token validity
   */
  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.jwtSecret) as JWTPayload;
    } catch (error) {
      logger.warn('Token verification failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new UnauthorizedError('Invalid or expired token');
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
        role: decoded.role,
      });

      logger.info('Token refreshed', { userId: decoded.userId });
      return newToken;
    } catch (error) {
      logger.error('Token refresh failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export const authService = new AuthService();
