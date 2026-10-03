/**
 * Data kept on the device so the app keeps working without a connection:
 * the last loaded shelters, downloaded Safety Packs and walking routes.
 *
 * Stored in localStorage (a few hundred kilobytes at most). Every access is
 * wrapped in try/catch: storage can be unavailable in private mode or full.
 */

const KEYS = {
  lastShelters: 'chron_last_shelters',
  packs: 'chron_safety_packs',
  routes: 'chron_routes',
};

/** Maximum number of walking routes kept on the device. */
const MAX_ROUTES = 60;

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Without storage the app still works online; offline data is simply not kept.
  }
}

/** Saves the most recently loaded shelters together with the search location. */
export function saveLastShelters(location, shelters, build) {
  write(KEYS.lastShelters, { location, shelters, build, savedAt: new Date().toISOString() });
}

/** The most recently loaded shelters, or null. */
export function loadLastShelters() {
  return read(KEYS.lastShelters, null);
}

/** Saves a downloaded Safety Pack (zone metadata and its shelters). */
export function savePack(pack) {
  const packs = read(KEYS.packs, {});
  packs[pack.zoneId] = pack;
  write(KEYS.packs, packs);
}

/** All downloaded Safety Packs keyed by zone id. */
export function loadPacks() {
  return read(KEYS.packs, {});
}

/** Rounds coordinates so that nearby positions share a route cache key (~100 m for the origin). */
function routeKey(from, to) {
  return `${from.lat.toFixed(3)},${from.lng.toFixed(3)}>${to.lat.toFixed(5)},${to.lng.toFixed(5)}`;
}

/** Saves a walking route; the oldest routes are dropped above the limit. */
export function saveRoute(from, to, route) {
  const routes = read(KEYS.routes, {});
  routes[routeKey(from, to)] = route;
  const keys = Object.keys(routes);
  keys.slice(0, Math.max(0, keys.length - MAX_ROUTES)).forEach((key) => delete routes[key]);
  write(KEYS.routes, routes);
}

/** A saved walking route between two points, or null. */
export function loadRoute(from, to) {
  return read(KEYS.routes, {})[routeKey(from, to)] || null;
}
