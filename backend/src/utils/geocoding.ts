import axios from 'axios';
import { logger } from './logger';

export interface Coordinates {
    latitude: number;
    longitude: number;
    pincode: string;
    city?: string;
    state?: string;
}

/**
 * Get coordinates from pincode using India Post API (FREE)
 */
export async function getCoordinatesFromPincode(pincode: string): Promise<Coordinates | null> {
    try {
        if (!pincode || pincode.length !== 6) {
            return null;
        }

        logger.info(`Fetching coordinates for pincode: ${pincode}`);

        const response = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`, {
            timeout: 5000
        });

        const data = response.data;

        if (data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
            const postOffice = data[0].PostOffice[0];
            
            // Some pincodes don't have lat/lng in this API
            const lat = parseFloat(postOffice.Latitude || '0');
            const lng = parseFloat(postOffice.Longitude || '0');

            if (lat === 0 && lng === 0) {
                logger.warn(`No coordinates found for pincode: ${pincode}`);
                return null;
            }

            logger.info(`✓ Found coordinates for ${pincode}: ${lat}, ${lng}`);

            return {
                latitude: lat,
                longitude: lng,
                pincode: pincode,
                city: postOffice.District,
                state: postOffice.State
            };
        }

        logger.warn(`Pincode not found: ${pincode}`);
        return null;

    } catch (error) {
        logger.error(`Failed to fetch coordinates for pincode ${pincode}:`, {
            error: error instanceof Error ? error.message : String(error)
        });
        return null;
    }
}

/**
 * Batch geocode multiple pincodes with rate limiting
 */
export async function batchGeocodeDelayed(
    pincodes: string[], 
    delayMs: number = 500
): Promise<Map<string, Coordinates>> {
    const results = new Map<string, Coordinates>();
    
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
