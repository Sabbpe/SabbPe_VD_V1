/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export declare function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
/**
 * Find all items within radius of a center point
 */
export declare function findWithinRadius<T extends {
    latitude: number;
    longitude: number;
}>(centerLat: number, centerLon: number, items: T[], radiusKm: number): Array<T & {
    distance_km: number;
}>;
//# sourceMappingURL=distanceCalculator.d.ts.map