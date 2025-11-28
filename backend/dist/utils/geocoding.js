"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCoordinatesFromPincode = getCoordinatesFromPincode;
exports.batchGeocodeDelayed = batchGeocodeDelayed;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("./logger");
/**
 * Get coordinates from pincode using India Post API (FREE)
 */
async function getCoordinatesFromPincode(pincode) {
    try {
        if (!pincode || pincode.length !== 6) {
            return null;
        }
        logger_1.logger.info(`Fetching coordinates for pincode: ${pincode}`);
        const response = await axios_1.default.get(`https://api.postalpincode.in/pincode/${pincode}`, {
            timeout: 5000
        });
        const data = response.data;
        if (data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
            const postOffice = data[0].PostOffice[0];
            // Some pincodes don't have lat/lng in this API
            const lat = parseFloat(postOffice.Latitude || '0');
            const lng = parseFloat(postOffice.Longitude || '0');
            if (lat === 0 && lng === 0) {
                logger_1.logger.warn(`No coordinates found for pincode: ${pincode}`);
                return null;
            }
            logger_1.logger.info(`✓ Found coordinates for ${pincode}: ${lat}, ${lng}`);
            return {
                latitude: lat,
                longitude: lng,
                pincode: pincode,
                city: postOffice.District,
                state: postOffice.State
            };
        }
        logger_1.logger.warn(`Pincode not found: ${pincode}`);
        return null;
    }
    catch (error) {
        logger_1.logger.error(`Failed to fetch coordinates for pincode ${pincode}:`, {
            error: error instanceof Error ? error.message : String(error)
        });
        return null;
    }
}
/**
 * Batch geocode multiple pincodes with rate limiting
 */
async function batchGeocodeDelayed(pincodes, delayMs = 500) {
    const results = new Map();
    for (const pincode of pincodes) {
        const coords = await getCoordinatesFromPincode(pincode);
        if (coords) {
            results.set(pincode, coords);
        }
        // Rate limiting: wait between requests
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return results;
}
//# sourceMappingURL=geocoding.js.map