/**
 * Walking routes from the public OSRM foot-routing service (routing.openstreetmap.de).
 *
 * Every built route is saved on the device. Without a connection the saved route
 * is reused; if there is none, a straight line is returned and marked as approximate.
 */
import { loadRoute, saveRoute } from '@/services/offlineStore.js';

const OSRM_FOOT_URL = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot';

/** Requests slower than this fall back to a straight line, so the map never waits long. */
const ROUTE_TIMEOUT_MS = 5000;

/**
 * Walking route between two points.
 * @param {{lat: number, lng: number}} from
 * @param {{lat: number, lng: number}} to
 * @returns {Promise<{ coords: [number, number][], distanceM: number | null, exact: boolean }>}
 *   coords as [lat, lng] pairs; exact = false means a straight-line approximation
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
  const fallback = () => loadRoute(from, to) || straightLine;
  try {
    // Coordinates are rounded (~10 m) so repeated requests hit the service worker cache.
    const point = ({ lat, lng }) => `${lng.toFixed(4)},${lat.toFixed(4)}`;
    const url = `${OSRM_FOOT_URL}/${point(from)};${point(to)}?overview=full&geometries=geojson`;
    const response = await fetch(url, { signal: AbortSignal.timeout(ROUTE_TIMEOUT_MS) });
    if (!response.ok) return fallback();
    const data = await response.json();
    const route = data.routes?.[0];
    if (!route) return fallback();
    const result = {
      // GeoJSON uses [lng, lat]; Leaflet expects [lat, lng].
      coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distanceM: Math.round(route.distance),
      exact: true,
    };
    saveRoute(from, to, result);
    return result;
  } catch {
    return fallback();
  }
}
