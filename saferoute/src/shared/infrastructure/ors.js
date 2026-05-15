/**
 * OpenRouteService wrapper.
 * Returns road-following geometry + the index inside that geometry
 * that corresponds to each input waypoint.
 *
 * ORS coordinate order: [longitude, latitude]  — opposite of Leaflet's [lat, lng].
 * This module always returns Leaflet-friendly [lat, lng] pairs.
 */

const ORS_BASE = import.meta.env.VITE_ORS_BASE_URL || 'https://api.openrouteservice.org';
const ORS_KEY  = import.meta.env.VITE_ORS_API_KEY  || '';

/** Simple in-memory cache keyed by serialised waypoints */
const _cache = new Map();

/**
 * Fetch a driving fleet-and-route-planning through the given waypoints from ORS.
 *
 * @param {{ lat: number, lng: number }[]} waypoints  At least 2 points.
 * @returns {{ path: [number,number][], wayPointIndices: number[] }}
 *   path              – full road geometry as [lat,lng] pairs (many points).
 *   wayPointIndices   – index in `path` for each input waypoint.
 *
 * Throws on network / API errors so callers can fall back to straight lines.
 */
export async function fetchRoadRoute(waypoints) {
  if (!waypoints || waypoints.length < 2) {
    return {
      path: waypoints.map(w => [w.lat, w.lng]),
      wayPointIndices: waypoints.map((_, i) => i),
    };
  }

  const cacheKey = waypoints.map(w => `${w.lat.toFixed(5)},${w.lng.toFixed(5)}`).join('|');
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);

  // ORS expects [lng, lat]
  const coordinates = waypoints.map(w => [w.lng, w.lat]);

  const res = await fetch(`${ORS_BASE}/v2/directions/driving-car/geojson`, {
    method: 'POST',
    headers: {
      Authorization:  ORS_KEY,
      'Content-Type': 'application/json',
      Accept:         'application/json, application/geo+json',
    },
    body: JSON.stringify({ coordinates }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`ORS ${res.status}: ${text}`);
  }

  const data    = await res.json();
  const feature = data.features?.[0];
  if (!feature) throw new Error('ORS returned no features');

  // Convert [lng, lat] → [lat, lng] for Leaflet
  const path = feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

  // way_points is an array like [0, 45, 120] — one index per input waypoint
  const wayPointIndices = feature.properties.way_points ?? waypoints.map((_, i) => i);

  const result = { path, wayPointIndices };
  _cache.set(cacheKey, result);
  return result;
}
