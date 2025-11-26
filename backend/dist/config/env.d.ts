export interface EnvConfig {
    port: number;
    nodeEnv: 'development' | 'production' | 'test';
    logLevel: string;
    supabaseUrl: string;
    supabaseServiceRoleKey: string;
    jwtSecret: string;
    jwtExpiry: string;
    vdDistributorId: string;
    vdApiUsername: string;
    vdApiPassword: string;
    vdSecretKey: string;
    vdSecretIv: string;
    vdApiBaseUrl: string;
    sabbpeApiKey: string;
    sabbpeApiSecret: string;
    sabbpeApiBaseUrl: string;
    sabbpeWebhookSecret: string;
    sabbpeMerchantId: string;
    redisUrl: string;
    gcpIpWhitelist: string;
}
export declare const config: EnvConfig;
//# sourceMappingURL=env.d.ts.map