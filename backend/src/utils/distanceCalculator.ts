/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Earth's radius in kilometers

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
}

function toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Find all items within radius of a center point
 */
export function findWithinRadius<T extends { latitude: number; longitude: number }>(
    centerLat: number,
    centerLon: number,
    items: T[],
    radiusKm: number
): Array<T & { distance_km: number }> {
    return items
        .map(item => {
            const distance = calculateDistance(
                centerLat,
                centerLon,
                item.latitude,
                item.longitude
            );
            return {
                ...item,
                distance_km: Math.round(distance * 100) / 100 // Round to 2 decimals
            };
        })
        .filter(item => item.distance_km <= radiusKm)
        .sort((a, b) => a.distance_km - b.distance_km); // Nearest first
}
