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
declare class MockAuthService {
    private users;
    /**
     * Generate JWT token
     */
    private generateToken;
    /**
     * Guest login - create temporary session without database
     */
    guestLogin(email?: string): Promise<GuestLoginResponse>;
    /**
     * Verify token validity
     */
    verifyToken(token: string): JWTPayload;
    /**
     * Refresh token
     */
    refreshToken(oldToken: string): string;
    /**
     * Get user by ID
     */
    getUser(userId: string): any;
}
export declare const mockAuthService: MockAuthService;
export default MockAuthService;
//# sourceMappingURL=mock-auth.service.d.ts.map