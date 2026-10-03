/**
 * Device location through the browser Geolocation API.
 */

/** Location used when the device position is unavailable or permission is denied (Gdańsk-Wrzeszcz). */
export const DEFAULT_LOCATION = { lat: 54.3812, lng: 18.6066, accuracy: null, source: 'default' };

/**
 * Starts watching the device position.
 * @param {(location: {lat: number, lng: number, accuracy: number, source: 'gps'}) => void} onChange
 *   called on every position update
 * @param {(error: GeolocationPositionError | Error) => void} onError called when the position cannot be obtained
 * @returns {() => void} function that stops watching
 */
export function watchLocation(onChange, onError) {
  if (!navigator.geolocation) {
    onError(new Error('Geolocation is not supported'));
    return () => {};
  }
  const watchId = navigator.geolocation.watchPosition(
    (position) =>
      onChange({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: Math.round(position.coords.accuracy),
        source: 'gps',
      }),
    onError,
    { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 },
  );
  return () => navigator.geolocation.clearWatch(watchId);
}

/**
 * Distance between two points in meters (haversine formula).
 * @param {{lat: number, lng: number}} a
 * @param {{lat: number, lng: number}} b
 */
export function distanceMeters(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/**
 * Compass bearing from one point to another, in degrees (0 = north, clockwise).
 * @param {{lat: number, lng: number}} from
 * @param {{lat: number, lng: number}} to
 */
export function bearingDegrees(from, to) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const y = Math.sin(toRad(to.lng - from.lng)) * Math.cos(toRad(to.lat));
  const x =
    Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
    Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(toRad(to.lng - from.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
