import crypto from 'crypto';
import { logger } from '@/utils/logger';

export interface EncryptionConfig {
  secretKey: string; // Hex format
  secretIv: string;  // Hex format
}

export class AESEncryptionService {
  private config: EncryptionConfig;
  private algorithm = 'aes-256-cbc';

  constructor(config: EncryptionConfig) {
    this.config = config;
    this.validateConfig();
  }

  private validateConfig(): void {
    // Validate secret key is 64 hex characters (256 bits)
    if (!/^[a-f0-9]{64}$/i.test(this.config.secretKey)) {
      throw new Error('Invalid secret key. Must be 64 hex characters (256 bits)');
    }

    // Validate IV is 32 hex characters (128 bits)
    if (!/^[a-f0-9]{32}$/i.test(this.config.secretIv)) {
      throw new Error('Invalid IV. Must be 32 hex characters (128 bits)');
    }
  }

  /**
   * Encrypt plaintext using AES-256-CBC with PKCS5 padding
   * @param plaintext - Data to encrypt (string or object)
   * @returns Base64 encoded encrypted data
   */
  encrypt(plaintext: string | Record<string, unknown>): string {
    try {
      // Convert to string if object
      const data = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);

      // Convert hex strings to buffers
      const key = Buffer.from(this.config.secretKey, 'hex');
      const iv = Buffer.from(this.config.secretIv, 'hex');

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Encrypt (PKCS5 padding is same as PKCS7 in Node.js)
      let encrypted = cipher.update(data, 'utf8', 'binary');
      encrypted += cipher.final('binary');

      // Convert to Base64
      const base64 = Buffer.from(encrypted, 'binary').toString('base64');

      logger.debug('Data encrypted successfully', {
        inputLength: data.length,
        outputLength: base64.length,
      });

      return base64;
    } catch (error) {
      logger.error('Encryption failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt Base64 encoded encrypted data
   * @param encryptedBase64 - Base64 encoded encrypted data
   * @returns Decrypted plaintext string
   */
  decrypt(encryptedBase64: string): string {
    try {
      // Convert hex strings to buffers
      const key = Buffer.from(this.config.secretKey, 'hex');
      const iv = Buffer.from(this.config.secretIv, 'hex');

      // Convert Base64 to binary
      const encrypted = Buffer.from(encryptedBase64, 'base64').toString('binary');

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);

      // Decrypt (PKCS5 padding is same as PKCS7 in Node.js)
      let decrypted = decipher.update(encrypted, 'binary', 'utf8');
      decrypted += decipher.final('utf8');

      logger.debug('Data decrypted successfully', {
        inputLength: encryptedBase64.length,
        outputLength: decrypted.length,
      });

      return decrypted;
    } catch (error) {
      logger.error('Decryption failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt and parse JSON
   * @param encryptedBase64 - Base64 encoded encrypted JSON
   * @returns Parsed JSON object
   */
  decryptJSON(encryptedBase64: string): Record<string, unknown> {
    try {
      const decrypted = this.decrypt(encryptedBase64);
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Failed to decrypt and parse JSON', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Failed to decrypt JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}