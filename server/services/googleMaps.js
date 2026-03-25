// Server-side Google Maps API integration for ETA and route calculations
// Uses the Distance Matrix and Directions APIs

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const BASE_URL = 'https://maps.googleapis.com/maps/api';

// Simple in-memory cache (60s TTL)
const cache = new Map();
const CACHE_TTL = 60000;

function getCacheKey(type, ...args) {
  return `${type}:${args.map(a => typeof a === 'number' ? a.toFixed(4) : a).join(',')}`;
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, time: Date.now() });
  // Cleanup old entries periodically
  if (cache.size > 500) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now - v.time > CACHE_TTL) cache.delete(k);
    }
  }
}

/**
 * Calculate ETA and distance between two points
 * @returns {{ duration: number (minutes), distance: number (km), durationText: string, distanceText: string }}
 */
export async function calculateETA(originLat, originLng, destLat, destLng) {
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    // Fallback: rough Haversine estimate
    return haversineEstimate(originLat, originLng, destLat, destLng);
  }

  const key = getCacheKey('eta', originLat, originLng, destLat, destLng);
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const url = `${BASE_URL}/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&key=${GOOGLE_MAPS_API_KEY}&departure_time=now`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
      const element = data.rows[0].elements[0];
      const result = {
        duration: Math.ceil(element.duration_in_traffic?.value || element.duration.value) / 60,
        distance: element.distance.value / 1000,
        durationText: element.duration_in_traffic?.text || element.duration.text,
        distanceText: element.distance.text
      };
      setCache(key, result);
      return result;
    }
    return haversineEstimate(originLat, originLng, destLat, destLng);
  } catch (err) {
    console.error('Google Maps API error:', err.message);
    return haversineEstimate(originLat, originLng, destLat, destLng);
  }
}

/**
 * Calculate full route with polyline and steps
 * @returns {{ polyline: string, steps: Array, duration: number, distance: number }}
 */
export async function calculateRoute(origin, destination, waypoints = []) {
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    return null;
  }

  const key = getCacheKey('route', origin, destination, waypoints.join('|'));
  const cached = getCached(key);
  if (cached) return cached;

  try {
    let url = `${BASE_URL}/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}`;
    if (waypoints.length > 0) {
      url += `&waypoints=${waypoints.map(w => encodeURIComponent(w)).join('|')}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.routes[0]) {
      const route = data.routes[0];
      const leg = route.legs[0];
      const result = {
        polyline: route.overview_polyline.points,
        steps: leg.steps.map(s => ({
          instruction: s.html_instructions?.replace(/<[^>]*>/g, '') || '',
          distance: s.distance.text,
          duration: s.duration.text,
          startLat: s.start_location.lat,
          startLng: s.start_location.lng
        })),
        duration: route.legs.reduce((sum, l) => sum + l.duration.value, 0) / 60,
        distance: route.legs.reduce((sum, l) => sum + l.distance.value, 0) / 1000,
        bounds: route.bounds
      };
      setCache(key, result);
      return result;
    }
    return null;
  } catch (err) {
    console.error('Google Directions API error:', err.message);
    return null;
  }
}

/**
 * Haversine distance estimate (fallback when no API key)
 */
function haversineEstimate(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  // Rough estimate: 30 km/h average city speed
  const duration = (distance / 30) * 60;
  return {
    duration: Math.ceil(duration),
    distance: Math.round(distance * 10) / 10,
    durationText: `~${Math.ceil(duration)} min`,
    distanceText: `${Math.round(distance * 10) / 10} km`
  };
}

/**
 * Check if a point is inside a circle geofence
 */
export function isInsideCircle(lat, lng, centerLat, centerLng, radiusMeters) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat - centerLat) * Math.PI / 180;
  const dLng = (lng - centerLng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(centerLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const distance = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return distance <= radiusMeters;
}

/**
 * Check if a point is inside a polygon geofence (ray casting)
 */
export function isInsidePolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const yi = polygon[i].lat, xi = polygon[i].lng;
    const yj = polygon[j].lat, xj = polygon[j].lng;
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}
