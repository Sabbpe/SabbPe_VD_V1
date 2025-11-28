import dotenv from 'dotenv';
dotenv.config();
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

function validateEnv(): EnvConfig {
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'VD_DISTRIBUTOR_ID',
    'VD_API_USERNAME',
    'VD_API_PASSWORD',
    'VD_SECRET_KEY',
    'VD_SECRET_IV',
    'VD_API_BASE_URL',
    
  ];

  const missing = requiredEnvVars.filter((envVar) => !process.env[envVar]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    port: parseInt(process.env.PORT || '8080', 10),
    nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    jwtSecret: process.env.JWT_SECRET!,
    jwtExpiry: process.env.JWT_EXPIRY || '24h',
    vdDistributorId: process.env.VD_DISTRIBUTOR_ID!,
    vdApiUsername: process.env.VD_API_USERNAME!,
    vdApiPassword: process.env.VD_API_PASSWORD!,
    vdSecretKey: process.env.VD_SECRET_KEY!,
    vdSecretIv: process.env.VD_SECRET_IV!,
    vdApiBaseUrl: process.env.VD_API_BASE_URL!,
    sabbpeApiKey: process.env.SABBPE_API_KEY || 'placeholder',
    sabbpeApiSecret: process.env.SABBPE_API_SECRET || 'placeholder',
    sabbpeApiBaseUrl: process.env.SABBPE_API_BASE_URL || 'placeholder',
    sabbpeWebhookSecret: process.env.SABBPE_WEBHOOK_SECRET || 'placeholder',
    sabbpeMerchantId: process.env.SABBPE_MERCHANT_ID || 'placeholder',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    gcpIpWhitelist: process.env.GCP_IP_WHITELIST || '34.93.176.245',
  };
}
console.log('DEBUG - SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('DEBUG - SUPABASE_SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);
console.log('DEBUG - SUPABASE_SERVICE_ROLE_KEY first 10 chars:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10));
export const config = validateEnv();