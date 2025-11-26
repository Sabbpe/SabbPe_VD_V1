export interface EncryptionConfig {
    secretKey: string;
    secretIv: string;
}
export declare class AESEncryptionService {
    private config;
    private algorithm;
    constructor(config: EncryptionConfig);
    private validateConfig;
    /**
     * Encrypt plaintext using AES-256-CBC with PKCS5 padding
     * @param plaintext - Data to encrypt (string or object)
     * @returns Base64 encoded encrypted data
     */
    encrypt(plaintext: string | Record<string, unknown>): string;
    /**
     * Decrypt Base64 encoded encrypted data
     * @param encryptedBase64 - Base64 encoded encrypted data
     * @returns Decrypted plaintext string
     */
    decrypt(encryptedBase64: string): string;
    /**
     * Decrypt and parse JSON
     * @param encryptedBase64 - Base64 encoded encrypted JSON
     * @returns Parsed JSON object
     */
    decryptJSON(encryptedBase64: string): Record<string, unknown>;
}
//# sourceMappingURL=aes.service.d.ts.map