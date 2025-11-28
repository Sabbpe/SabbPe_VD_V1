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
export declare function getCoordinatesFromPincode(pincode: string): Promise<Coordinates | null>;
/**
 * Batch geocode multiple pincodes with rate limiting
 */
export declare function batchGeocodeDelayed(pincodes: string[], delayMs?: number): Promise<Map<string, Coordinates>>;
//# sourceMappingURL=geocoding.d.ts.map