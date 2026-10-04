/**
 * PAŻP (Polish Air Navigation Services Agency): airspace reservations over Poland.
 * Newly activated military and danger zones are an auxiliary signal, not a threat by themselves.
 */
import { distanceKm, fetchJson } from './http.js';
import { labelsFor } from './labels.js';

const PANSA_UUP_URL = 'https://airspace.pansa.pl/map-configuration/uup';

/** Zones farther than this from the user are ignored. */
const RADIUS_KM = 100;

/** Zone types that restrict or prohibit flights: reported with a higher level. */
const RESTRICTIVE_TYPES = new Set(['D', 'R', 'P']);

/** Whether one of the zone reservations is active right now. */
function isActiveNow(properties, now) {
  return (properties.airspaceReservations || []).some((reservation) => {
    const start = Date.parse(reservation.startDate);
    const end = Date.parse(reservation.endDate);
    return start <= now && now <= end;
  });
}

/**
 * Airspace zones active right now within the radius around the user.
 * @param {{ lat: number, lng: number, lang?: string }} context user location and interface language
 */
export async function collectPansa({ lat, lng, lang }) {
  const L = labelsFor(lang);
  const data = await fetchJson(PANSA_UUP_URL);
  const features = Array.isArray(data) ? data : data?.features || [];
  const now = Date.now();

  return features
    .map((feature) => feature.properties || {})
    .filter((properties) => properties.centroid?.[0] && isActiveNow(properties, now))
    .map((properties) => {
      const { x: zoneLng, y: zoneLat } = properties.centroid[0];
      return { properties, distance: distanceKm(lat, lng, zoneLat, zoneLng) };
    })
    .filter(({ distance }) => distance <= RADIUS_KM)
    .sort((a, b) => a.distance - b.distance)
    .map(({ properties, distance }) => {
      const type = properties.airspaceElementType;
      return {
        id: `pansa-${properties.designator}`,
        source: 'PAŻP',
        category: 'airspace',
        level: RESTRICTIVE_TYPES.has(type) ? 'yellow' : 'info',
        title: L.activeZone(L.zones[type] || L.airspaceZone, properties.designator),
        text: `${L.kmFromYou(Math.round(distance))} · ${L.reservation}`,
        region: L.poland,
        time: new Date(now).toISOString(),
        distanceKm: Math.round(distance),
      };
    });
}
