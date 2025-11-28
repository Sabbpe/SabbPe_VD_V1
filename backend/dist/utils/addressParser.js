"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPincode = extractPincode;
exports.extractPhones = extractPhones;
/**
 * Extract 6-digit Indian pincode from address string
 */
function extractPincode(address) {
    if (!address)
        return null;
    // Match 6-digit numbers (Indian pincodes)
    const pincodeMatch = address.match(/\b(\d{6})\b/);
    return pincodeMatch ? pincodeMatch[1] : null;
}
/**
 * Extract phone numbers from address
 */
function extractPhones(address) {
    if (!address)
        return [];
    const phones = [];
    // Pattern 1: Phone: 12345678 or Ph- 12345678
    const pattern1 = address.match(/(?:Phone|Ph|Tel|Contact)[:\-\s]+(\d{8,10})/gi);
    if (pattern1) {
        pattern1.forEach(match => {
            const phone = match.match(/\d{8,10}/);
            if (phone)
                phones.push(phone[0]);
        });
    }
    // Pattern 2: Standalone 10-digit numbers
    const pattern2 = address.match(/\b\d{10}\b/g);
    if (pattern2) {
        phones.push(...pattern2);
    }
    return [...new Set(phones)]; // Remove duplicates
}
//# sourceMappingURL=addressParser.js.map