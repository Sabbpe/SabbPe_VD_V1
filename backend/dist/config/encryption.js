"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeEncryption = initializeEncryption;
const logger_1 = require("../utils/logger");
/**
 * Initialize encryption services
 *
 * Note: ValueDesign encryption is handled directly in valuedesign.service.ts
 * We don't need a separate AESEncryptionService since the service handles its own encryption
 */
function initializeEncryption() {
    try {
        logger_1.logger.info('✓ Encryption services initialized (ValueDesign encryption handled internally)');
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize encryption services', {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
exports.default = initializeEncryption;
//# sourceMappingURL=encryption.js.map