import { User, UserRole, MerchantSync } from '../types/database';
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
export declare class AuthService {
    /**
     * Generate JWT token
     */
    generateToken(payload: JWTPayload): string;
    /**
     * Guest login - create temporary session without registration
     */
    guestLogin(email?: string): Promise<GuestLoginResponse>;
    /**
     * Merchant registration
     */
    merchantRegister(req: MerchantRegisterRequest): Promise<GuestLoginResponse>;
    /**
     * Merchant login with approval check
     */
    merchantLogin(email: string, password: string): Promise<MerchantLoginResponse>;
    /**
     * Customer login (if supporting non-merchant registrations)
     */
    customerLogin(email: string, password: string): Promise<GuestLoginResponse>;
    /**
     * Logout - token is stateless, client handles deletion
     */
    logout(userId: string): Promise<void>;
    /**
     * Verify token validity
     */
    verifyToken(token: string): JWTPayload;
    /**
     * Refresh token
     */
    refreshToken(oldToken: string): string;
}
export declare const authService: AuthService;
//# sourceMappingURL=auth.service.d.ts.map