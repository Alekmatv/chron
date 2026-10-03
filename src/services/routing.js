/**
 * Walking routes from the public OSRM foot-routing service (routing.openstreetmap.de).
 */

const OSRM_FOOT_URL = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot';

/** Requests slower than this fall back to a straight line, so the map never waits long. */
const ROUTE_TIMEOUT_MS = 5000;

/**
 * Walking route between two points.
 * @param {{lat: number, lng: number}} from
 * @param {{lat: number, lng: number}} to
 * @returns {Promise<{ coords: [number, number][], distanceM: number | null, exact: boolean }>}
 *   coords as [lat, lng] pairs; exact = false means a straight-line fallback
 */
export async function fetchWalkingRoute(from, to) {
  const straightLine = {
    coords: [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ],
    distanceM: null,
    exact: false,
  };
  try {
    const url = `${OSRM_FOOT_URL}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url, { signal: AbortSignal.timeout(ROUTE_TIMEOUT_MS) });
    if (!response.ok) return straightLine;
    const data = await response.json();
    const route = data.routes?.[0];
    if (!route) return straightLine;
    return {
      // GeoJSON uses [lng, lat]; Leaflet expects [lat, lng].
      coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distanceM: Math.round(route.distance),
      exact: true,
    };
  } catch {
    return straightLine;
  }
}
