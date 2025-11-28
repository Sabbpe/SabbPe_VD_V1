import axios, { AxiosInstance } from 'axios';
import { createCipheriv, createDecipheriv } from 'crypto';
import { getVDErrorMessage } from './vd-error-codes';
import { logger } from '@/utils/logger';
import { supabase } from '@/config/supabase';


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const VD_CONFIG = {
    baseUrl: process.env.VD_API_BASE_URL,
    distributorId: process.env.VD_DISTRIBUTOR_ID,
    vdApiUsername: process.env.VD_API_USERNAME,
    vdApiPassword: process.env.VD_API_PASSWORD,
    secretKey: process.env.VD_SECRET_KEY,
    secretIv: process.env.VD_SECRET_IV,
};

/**
 * Validate that all required configuration is present
 */
const validateConfig = () => {
    const required: (keyof typeof VD_CONFIG)[] = [
        'baseUrl',
        'distributorId',
        'vdApiUsername',
        'vdApiPassword',
        'secretKey',
        'secretIv',
    ];
    const missing = required.filter(key => !VD_CONFIG[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required ValueDesign configuration: ${missing.join(', ')}`);
    }

    logger.info('✓ ValueDesign configuration validated', {
        baseUrl: VD_CONFIG.baseUrl,
        distributorId: VD_CONFIG.distributorId,
    });
};

// Validate config on module load
validateConfig();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTERFACES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ValueDesignResponse<T = any> {
    responseCode?: number | string;
    responseMsg?: string;
    status?: string;
    statuscode?: number;
    statusmessage?: string;
    data?: T;
    [key: string]: any;
}

interface TokenResponse {
    token: string;
    expiry_date: string;
    status: string;
    responseCode?: number | string;
    responseMsg?: string;
    statusmessage?: string;
}

interface BrandData {
    brandCode: string;
    brandName: string;
    brandImage?: string;
    categoryId?: string;
    categoryName?: string;
    skuCode?: string;
    denomination?: string;
    [key: string]: any;
}

interface EVCItem {
    getCardNo: string;
    getCardPin: string;
    getCardStatus: string;
    getExpiryDate: string;
    balanceBasic: string;
    balanceBonus: string;
    balanceTotal: string;
}

interface EVCBrandDetail {
    product_name: string;
    voucher_name: string;
    items: EVCItem[];
}

interface EVCResponse {
    resultCode?: string | number;
    responseCode?: string | number;
    getMarketingMessage?: string;
    responseMsg?: string;
    statusmessage?: string;
    order_id?: string;
    request_ref_no?: string;
    data?: string;
    brand_details?: EVCBrandDetail[];
    wallet_balance?: string;
    isPending?: boolean;
    [key: string]: any;
}

interface GetEVCParams {
    orderId: string;
    skuCode: string;
    noOfCard: number;
    amount: string;
    receiptNo: string;
    reqId: string;
    firstName?: string;
    lastName?: string;
    mobileNo?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SERVICE CLASS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class ValueDesignService {
    private client: AxiosInstance;
    private token: string | null = null;
    private tokenExpiryTime: Date | null = null;

    constructor() {
        this.client = axios.create({
            baseURL: VD_CONFIG.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Add request interceptor to force authentication headers
        this.client.interceptors.request.use((config) => {
            config.headers['username'] = VD_CONFIG.vdApiUsername;
            config.headers['password'] = VD_CONFIG.vdApiPassword;
            return config;
        });

        // Add response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                if (axios.isAxiosError(error)) {
                    logger.error('ValueDesign API Error:', {
                        status: error.response?.status,
                        statusText: error.response?.statusText,
                        data: error.response?.data,
                        url: error.config?.url,
                        method: error.config?.method,
                    });
                }
                throw error;
            }
        );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ENCRYPTION / DECRYPTION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * Encrypt data using AES-256-CBC
     */
    private encrypt(data: string): string {
        try {
            const key = Buffer.from(VD_CONFIG.secretKey!, 'utf8');
            const iv = Buffer.from(VD_CONFIG.secretIv!, 'utf8');

            const cipher = createCipheriv('aes-256-cbc', key, iv);
            let encrypted = cipher.update(data, 'utf8', 'base64');
            encrypted += cipher.final('base64');
            return encrypted;
        } catch (error) {
            logger.error('Encryption failed:', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw new Error('Failed to encrypt data');
        }
    }

    /**
     * Decrypt data using AES-256-CBC
     */
    private decrypt(encryptedData: string): string {
        try {
            const key = Buffer.from(VD_CONFIG.secretKey!, 'utf8');
            const iv = Buffer.from(VD_CONFIG.secretIv!, 'utf8');

            const decipher = createDecipheriv('aes-256-cbc', key, iv);
            let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            logger.error('Decryption failed:', {
                error: error instanceof Error ? error.message : String(error),
                dataLength: encryptedData?.length,
            });
            throw new Error('Failed to decrypt data');
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TOKEN MANAGEMENT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * Load token from database
     */
    private async loadTokenFromDatabase(): Promise<{ token: string; expiry: Date } | null> {
        try {
            const { data, error } = await supabase
                .from('valuedesign_token_cache')
                .select('token, expiry_date')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !data) {
                logger.debug('No cached token in database');
                return null;
            }

            const expiryDate = new Date(data.expiry_date);
            const now = new Date();

            // Check if token is still valid (with 5 min safety buffer)
            const safeExpiryTime = new Date(expiryDate.getTime() - 5 * 60 * 1000);

            if (safeExpiryTime <= now) {
                logger.info('Cached token in database has expired', {
                    expiry: expiryDate.toISOString(),
                    now: now.toISOString(),
                });
                return null;
            }

            logger.info('✓ Loaded valid token from database', {
                expiry: expiryDate.toISOString(),
                remainingDays: Math.floor((safeExpiryTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
            });

            return {
                token: data.token,
                expiry: safeExpiryTime,
            };
        } catch (error) {
            logger.error('Failed to load token from database:', {
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }

    /**
     * Save token to database
     */
    private async saveTokenToDatabase(token: string, encryptedToken: string, expiryDate: string): Promise<void> {
        try {
            const { error } = await supabase.from('valuedesign_token_cache').insert({
                token: token,
                encrypted_token: encryptedToken,
                expiry_date: expiryDate,
            });

            if (error) {
                logger.error('Failed to save token to database:', { error: error.message });
            } else {
                logger.info('✓ Token saved to database', { expiry: expiryDate });
            }
        } catch (error) {
            logger.error('Failed to save token to database:', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Generate authentication token
     */
    async generateToken(): Promise<string> {
        try {
            // 1. Check in-memory cache first (fastest)
            if (this.token && this.tokenExpiryTime && this.tokenExpiryTime > new Date()) {
                logger.debug('Using in-memory cached ValueDesign token');
                return this.token;
            }

            // 2. Check database cache (survives restarts)
            const cachedToken = await this.loadTokenFromDatabase();
            if (cachedToken) {
                // Load into memory cache
                this.token = cachedToken.token;
                this.tokenExpiryTime = cachedToken.expiry;
                logger.info('✓ Using database-cached ValueDesign token');
                return this.token;
            }

            // 3. Generate new token from ValueDesign API
            logger.info('Generating new ValueDesign token...', {
                url: `${VD_CONFIG.baseUrl}/distributor/api-generatetoken/`,
                distributorId: VD_CONFIG.distributorId,
            });

            const response = await this.client.post<TokenResponse>(
                '/distributor/api-generatetoken/',
                { distributor_id: VD_CONFIG.distributorId },
                {
                    timeout: 30000,
                    headers: {
                        'Content-Type': 'application/json',
                        username: VD_CONFIG.vdApiUsername,
                        password: VD_CONFIG.vdApiPassword,
                    },
                    validateStatus: () => true,
                }
            );

            logger.info('Token generation response:', {
                status: response.status,
                responseCode: response.data?.responseCode,
                responseMsg: response.data?.responseMsg,
                hasToken: !!response.data?.token,
            });

            // Check HTTP status
            if (response.status !== 200) {
                throw new Error(`Token generation HTTP error: ${response.status} - ${response.statusText}`);
            }

            // Check ValueDesign response status
            if (response.data.status !== 'SUCCESS' && response.data.responseCode !== 0 && response.data.responseCode !== '0') {
                throw new Error(`Token generation failed: ${response.data.responseMsg || response.data.statusmessage || 'Unknown error'}`);
            }

            const encryptedToken = response.data.token;
            if (!encryptedToken) {
                throw new Error('No token in response');
            }

            // Decrypt the token
            const decryptedToken = this.decrypt(encryptedToken);

            logger.info('✓ Token decrypted successfully', {
                encryptedLength: encryptedToken.length,
                decryptedLength: decryptedToken.length,
                expiryDate: response.data.expiry_date,
            });

            // Cache in memory
            this.token = decryptedToken;

            // Calculate expiry with 5-minute safety buffer
            if (response.data.expiry_date) {
                const expiryDate = new Date(response.data.expiry_date);
                this.tokenExpiryTime = new Date(expiryDate.getTime() - 5 * 60 * 1000);
            } else {
                // Default to 23 hours if no expiry date provided
                this.tokenExpiryTime = new Date(Date.now() + 23 * 60 * 60 * 1000);
            }

            // Save to database for persistence
            await this.saveTokenToDatabase(decryptedToken, encryptedToken, response.data.expiry_date);

            logger.info('✓ ValueDesign token generated and cached successfully', {
                expiryDate: response.data.expiry_date,
                cacheExpiryDate: this.tokenExpiryTime.toISOString(),
            });

            return this.token as string;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                logger.error('ValueDesign token API error:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    url: error.config?.url,
                    fullUrl: `${error.config?.baseURL}${error.config?.url}`,
                });
            }
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('Failed to generate ValueDesign token:', { error: errorMessage });
            throw error;
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // BRAND OPERATIONS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

     /**
     * Get brands from ValueDesign
     */
    async getBrands(brandCode: string = ''): Promise<BrandData[]> {
    try {
        logger.info('Fetching brands from ValueDesign', { brandCode });

        const token = await this.generateToken();
        
        // 🔥 LOG THE EXACT REQUEST WE'RE SENDING
        const requestPayload = { BrandCode: brandCode || '' };
        const requestHeaders = { token: token };
        
        logger.info('🚀 Sending request to VD Brands API:', {
            url: `${VD_CONFIG.baseUrl}/distributor/api-getbrand/`,
            payload: requestPayload,
            headers: {
                token: token.substring(0, 20) + '...' + token.substring(token.length - 10),
                tokenLength: token.length
            }
        });

        const response = await this.client.post<ValueDesignResponse>(
            '/distributor/api-getbrand/',
            requestPayload,
            {
                headers: requestHeaders,
            }
        );

        // 🔥 LOG THE EXACT RESPONSE
        logger.info('📥 VD Brands API Response:', {
            httpStatus: response.status,
            responseData: response.data
        });

            // 🔥 CHECK FOR ERRORS WITH PROPER CODE MAPPING
            const isSuccess = response.data.status === 'SUCCESS' || 
                             response.data.responseCode === 0 || 
                             response.data.responseCode === '0';

            if (!isSuccess) {
                const errorCode = response.data.responseCode || response.data.statuscode;
                const errorMessage = getVDErrorMessage(errorCode);
                
                logger.error('❌ ValueDesign Brand API Error:', {
                    errorCode: errorCode,
                    errorMessage: errorMessage,
                    responseMsg: response.data.responseMsg,
                    statusmessage: response.data.statusmessage,
                    fullResponse: response.data
                });
                
                throw new Error(`ValueDesign Error [${errorCode}]: ${errorMessage}`);
            }

            // Decrypt if data exists
            if (response.data.data) {
                try {
                    const decryptedData = this.decrypt(response.data.data);
                    const parsedData = JSON.parse(decryptedData);

                    logger.info('✓ Brand data decrypted successfully', {
                        brandCount: Array.isArray(parsedData) ? parsedData.length : 0,
                    });
                    return Array.isArray(parsedData) ? parsedData : [];
                } catch (decryptError) {
                    logger.error('Failed to decrypt brand data:', { error: String(decryptError) });
                    return [];
                }
            }

            return [];
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('Failed to fetch brands:', { error: errorMessage });
            throw error;
        }
    }

    /**
     * Get stores for a brand
     */
    async getStores(brandCode: string): Promise<any> {
        try {
            logger.info('Fetching stores for brand', { brandCode });
            const token = await this.generateToken();

            const response = await this.client.post<ValueDesignResponse>(
                '/distributor/api-getstore/',
                { BrandCode: brandCode },
                {
                    headers: {
                        token: token,
                    },
                }
            );

            logger.info('Store response received:', {
                status: response.data.status,
                hasData: !!response.data.data,
            });

            // Decrypt if data exists
            if (response.data.data) {
                try {
                    const decryptedData = this.decrypt(response.data.data);
                    const parsedData = JSON.parse(decryptedData);

                    logger.info('✓ Store data decrypted successfully');
                    return parsedData;
                } catch (decryptError) {
                    logger.error('Failed to decrypt store data:', { error: String(decryptError) });
                    return response.data;
                }
            }

            return response.data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('Failed to fetch stores:', { error: errorMessage });
            throw error;
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // EVC (VOUCHER) OPERATIONS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * Get available EVCs (e-vouchers) for a brand
     */
    async getEVCs(params: GetEVCParams): Promise<EVCResponse> {
        try {
            logger.info('Fetching EVCs from ValueDesign', { orderId: params.orderId });
            const token = await this.generateToken();
            
            const payload = {
                order_id: params.orderId,
                sku_code: params.skuCode,
                distributor_id: VD_CONFIG.distributorId,
                no_of_card: params.noOfCard.toString(),
                amount: params.amount,
                receiptNo: params.receiptNo,
                reqId: params.reqId,
                curr: '356',
                firstname: params.firstName || 'Customer',
                lastname: params.lastName || 'Name',
                mobile_no: params.mobileNo || '',
                email: params.email || '',
                address: params.address || '',
                city: params.city || '',
                state: params.state || '',
                country: params.country || 'India',
                pincode: params.pincode || '',
            };
            
            logger.info('🎫 EVC Payload:', payload);
            
            const encryptedPayload = this.encrypt(JSON.stringify(payload));
            
            const response = await this.client.post<EVCResponse>(
                '/distributor/getevc/',
                { payload: encryptedPayload },
                {
                    headers: {
                        token: token,
                    },
                }
            );
            
            logger.info('EVC response received:', {
                resultCode: response.data.resultCode,
                responseCode: response.data.responseCode,
                message: response.data.getMarketingMessage,
                responseMsg: response.data.responseMsg,
                statusmessage: response.data.statusmessage,
                orderId: response.data.order_id,
                hasData: !!response.data.data,
            });

            // Log full response for debugging
            logger.debug('Full EVC response:', { response: response.data });

            // ✅ Check for errors (but allow pending/processing status)
            const isSuccess = 
    response.data.resultCode === '0' || response.data.resultCode === 0 ||
    response.data.responseCode === '0' || response.data.responseCode === 0;

if (!isSuccess) {
                // Code 1105 means order is being processed - this is OK
                if (response.data.responseCode === '1105' || response.data.responseCode === 1105) {
                    logger.info('⏳ Order is being processed by ValueDesign', {
                        orderId: params.orderId,
                        message: response.data.responseMsg
                    });
                    
                    // Return partial response - order is pending
                    return {
                        ...response.data,
                        resultCode: '0', // Mark as success since it's just pending
                        isPending: true
                    };
                }
                
                const errorMsg = response.data.getMarketingMessage || response.data.responseMsg || response.data.statusmessage || 'Unknown error';
                logger.error('ValueDesign EVC error:', {
                    resultCode: response.data.resultCode,
                    responseCode: response.data.responseCode,
                    message: errorMsg,
                    fullResponse: response.data
                });
                throw new Error(`EVC generation failed: ${errorMsg}`);
            }

            // Check if data exists (skip for pending orders)
            if (!response.data.data && !response.data.isPending) {
                logger.error('EVC response has no data:', response.data);
                throw new Error(`EVC generation failed: No voucher data returned. ${response.data.getMarketingMessage || ''}`);
            }

            // Decrypt data if available
            if (response.data.data) {
                try {
                    const decryptedData = this.decrypt(response.data.data);
                    const parsedData = JSON.parse(decryptedData);
                    
                    logger.info('✓ EVC data decrypted successfully', {
                        orderId: params.orderId,
                        itemCount: parsedData.brand_details?.[0]?.items?.length || 0,
                    });
                    
                    return {
                        ...response.data,
                        ...parsedData,
                    };
                } catch (decryptError) {
                    logger.error('Failed to decrypt EVC data:', { error: String(decryptError) });
                    return response.data;
                }
            }

            return response.data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('Failed to fetch EVCs:', { error: errorMessage });
            throw error;
        }
    }

    /**
     * Get EVC Status
     */
    async getEVCStatus(orderId: string, requestRefNo: string): Promise<any> {
        try {
            logger.info('Fetching EVC status', { orderId, requestRefNo });
            const token = await this.generateToken();

            const response = await this.client.post<ValueDesignResponse>(
                '/distributor/getevcstatus/',
                {
                    order_id: orderId,
                    request_ref_no: requestRefNo,
                },
                {
                    headers: {
                        token: token,
                    },
                }
            );

            logger.info('✓ EVC status fetched', {
                orderId,
                status: response.data.status,
            });
            return response.data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('Failed to fetch EVC status:', { error: errorMessage });
            throw error;
        }
    }

    /**
     * Get Activated EVC
     */
    async getActivatedEVC(orderId: string, requestRefNo: string): Promise<any> {
        try {
            logger.info('Fetching activated EVC', { orderId, requestRefNo });
            const token = await this.generateToken();

            const response = await this.client.post<ValueDesignResponse>(
                '/distributor/getactivatedevc/',
                {
                    order_id: orderId,
                    request_ref_no: requestRefNo,
                },
                {
                    headers: {
                        token: token,
                    },
                }
            );

            logger.info('✓ Activated EVC fetched', {
                orderId,
                status: response.data.status,
            });
            return response.data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('Failed to fetch activated EVC:', { error: errorMessage });
            throw error;
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // WALLET OPERATIONS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * Get account wallet balance
     */
    async getWalletBalance(): Promise<string> {
        try {
            logger.info('Fetching ValueDesign wallet balance');
            const token = await this.generateToken();

            const response = await this.client.post<ValueDesignResponse>(
                '/distributor/getwalletbalance/',
                { distributor_id: VD_CONFIG.distributorId },
                {
                    headers: {
                        token: token,
                    },
                }
            );

            logger.info('Wallet balance response received:', {
                status: response.data.status,
                hasWalletData: !!response.data.walletdetails,
            });

            if (response.data.walletdetails) {
                const balance = response.data.walletdetails.balance || response.data.walletdetails.wallet_balance;
                logger.info('✓ ValueDesign wallet balance fetched', { balance });
                return balance;
            }

            return response.data.wallet_balance || '0';
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('Failed to fetch wallet balance:', { error: errorMessage });
            throw error;
        }
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const valueDesignService = new ValueDesignService();
export default ValueDesignService;
