"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDistance = calculateDistance;
exports.findWithinRadius = findWithinRadius;
/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
}
function toRad(degrees) {
    return degrees * (Math.PI / 180);
}
/**
 * Find all items within radius of a center point
 */
function findWithinRadius(centerLat, centerLon, items, radiusKm) {
    return items
        .map(item => {
        const distance = calculateDistance(centerLat, centerLon, item.latitude, item.longitude);
        return {
            ...item,
            distance_km: Math.round(distance * 100) / 100 // Round to 2 decimals
        };
    })
        .filter(item => item.distance_km <= radiusKm)
        .sort((a, b) => a.distance_km - b.distance_km); // Nearest first
}
//# sourceMappingURL=distanceCalculator.js.map