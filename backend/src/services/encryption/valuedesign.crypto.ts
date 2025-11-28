import { AESEncryptionService } from './aes.service';
import { logger } from '@/utils/logger';

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
export class ValueDesignCryptoService {
  private aesService: AESEncryptionService;

  constructor(aesService: AESEncryptionService) {
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
  encryptRequest(
    distributorId: string,
    apiUsername: string,
    apiPassword: string,
    requestData: Record<string, unknown>
  ): string {
    try {
      const payload: ValueDesignEncryptionPayload = {
        distributor_id: distributorId,
        api_username: apiUsername,
        api_password: apiPassword,
        request_data: requestData,
      };

      logger.debug('Encrypting ValueDesign request', {
        endpoint: requestData.endpoint,
        hasRequestData: !!requestData,
      });

      return this.aesService.encrypt(payload as any);
    } catch (error) {
      logger.error('Failed to encrypt ValueDesign request', {
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
  decryptResponse(encryptedBase64: string): ValueDesignDecryptedResponse {
    try {
      logger.debug('Decrypting ValueDesign response', {
        responseLength: encryptedBase64.length,
      });

      const decrypted = this.aesService.decryptJSON(encryptedBase64);

      // Validate response structure
      if (!('responseCode' in decrypted)) {
        logger.warn('ValueDesign response missing responseCode', {
          keys: Object.keys(decrypted),
        });
      }

      return decrypted as ValueDesignDecryptedResponse;
    } catch (error) {
      logger.error('Failed to decrypt ValueDesign response', {
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
  createEncryptedPayload(
    endpoint: string,
    params: Record<string, unknown>,
    distributorId: string,
    apiUsername: string,
    apiPassword: string
  ): string {
    const requestData = {
      endpoint,
      ...params,
    };

    return this.encryptRequest(distributorId, apiUsername, apiPassword, requestData);
  }
}