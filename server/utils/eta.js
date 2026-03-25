// Simple Haversine distance calculation (km)
export function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// Estimate arrival time in minutes (assuming avg speed of 30 km/h in city)
export function estimateETA(driverLat, driverLng, destLat, destLng, avgSpeedKmh = 30) {
  const distance = getDistance(driverLat, driverLng, destLat, destLng);
  return Math.round((distance / avgSpeedKmh) * 60);
}
