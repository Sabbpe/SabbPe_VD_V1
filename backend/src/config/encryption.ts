import { logger } from '@/utils/logger';

/**
 * Initialize encryption services
 * 
 * Note: ValueDesign encryption is handled directly in valuedesign.service.ts
 * We don't need a separate AESEncryptionService since the service handles its own encryption
 */
export function initializeEncryption(): void {
    try {
        logger.info('✓ Encryption services initialized (ValueDesign encryption handled internally)');
    } catch (error) {
        logger.error('Failed to initialize encryption services', {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

export default initializeEncryption;