import { AESEncryptionService } from './aes.service';
export interface ValueDesignEncryptionPayload {
    distributor_id: string;
    api_username: string;
    api_password: string;
    request_data: Record<string, unknown>;
}
export interface ValueDesignDecryptedResponse {
    responseCode: number;
    responseMsg: string;
    [key: string]: unknown;
}
/**
 * ValueDesign-specific encryption/decryption service
 * Handles the specific payload structure required by ValueDesign API
 */
export declare class ValueDesignCryptoService {
    private aesService;
    constructor(aesService: AESEncryptionService);
    /**
     * Prepare and encrypt a request for ValueDesign API
     *
     * Payload structure:
     * {
     *   "distributor_id": "VDIDSabbPe",
     *   "api_username": "...",
     *   "api_password": "...",
     *   "request_data": { ... }
     * }
     *
     * @param distributorId - ValueDesign distributor ID
     * @param apiUsername - ValueDesign API username
     * @param apiPassword - ValueDesign API password
     * @param requestData - Actual request payload
     * @returns Encrypted Base64 string ready for API call
     */
    encryptRequest(distributorId: string, apiUsername: string, apiPassword: string, requestData: Record<string, unknown>): string;
    /**
     * Decrypt and parse response from ValueDesign API
     *
     * @param encryptedBase64 - Encrypted Base64 response from ValueDesign
     * @returns Decrypted and parsed response object
     */
    decryptResponse(encryptedBase64: string): ValueDesignDecryptedResponse;
    /**
     * Create an encrypted payload for a specific ValueDesign endpoint
     *
     * @param endpoint - ValueDesign API endpoint name (e.g., 'api-generatetoken')
     * @param params - Endpoint-specific parameters
     * @param distributorId - ValueDesign distributor ID
     * @param apiUsername - ValueDesign API username
     * @param apiPassword - ValueDesign API password
     * @returns Encrypted payload ready for HTTP request
     */
    createEncryptedPayload(endpoint: string, params: Record<string, unknown>, distributorId: string, apiUsername: string, apiPassword: string): string;
}
//# sourceMappingURL=valuedesign.crypto.d.ts.map