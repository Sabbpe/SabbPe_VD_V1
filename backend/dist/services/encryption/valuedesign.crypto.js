"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValueDesignCryptoService = void 0;
const logger_1 = require("../../utils/logger");
/**
 * ValueDesign-specific encryption/decryption service
 * Handles the specific payload structure required by ValueDesign API
 */
class ValueDesignCryptoService {
    constructor(aesService) {
        this.aesService = aesService;
    }
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
    encryptRequest(distributorId, apiUsername, apiPassword, requestData) {
        try {
            const payload = {
                distributor_id: distributorId,
                api_username: apiUsername,
                api_password: apiPassword,
                request_data: requestData,
            };
            logger_1.logger.debug('Encrypting ValueDesign request', {
                endpoint: requestData.endpoint,
                hasRequestData: !!requestData,
            });
            return this.aesService.encrypt(payload);
        }
        catch (error) {
            logger_1.logger.error('Failed to encrypt ValueDesign request', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Decrypt and parse response from ValueDesign API
     *
     * @param encryptedBase64 - Encrypted Base64 response from ValueDesign
     * @returns Decrypted and parsed response object
     */
    decryptResponse(encryptedBase64) {
        try {
            logger_1.logger.debug('Decrypting ValueDesign response', {
                responseLength: encryptedBase64.length,
            });
            const decrypted = this.aesService.decryptJSON(encryptedBase64);
            // Validate response structure
            if (!('responseCode' in decrypted)) {
                logger_1.logger.warn('ValueDesign response missing responseCode', {
                    keys: Object.keys(decrypted),
                });
            }
            return decrypted;
        }
        catch (error) {
            logger_1.logger.error('Failed to decrypt ValueDesign response', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
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
    createEncryptedPayload(endpoint, params, distributorId, apiUsername, apiPassword) {
        const requestData = {
            endpoint,
            ...params,
        };
        return this.encryptRequest(distributorId, apiUsername, apiPassword, requestData);
    }
}
exports.ValueDesignCryptoService = ValueDesignCryptoService;
//# sourceMappingURL=valuedesign.crypto.js.map