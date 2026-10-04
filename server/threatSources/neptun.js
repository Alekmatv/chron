/**
 * NEPTUN (neptun.in.ua): aggregator of air targets over Ukraine — drones and missiles
 * with coordinates and heading. Used to detect objects approaching the user.
 */
import { bearing, distanceKm, fetchJson } from './http.js';
import { labelsFor } from './labels.js';

const NEPTUN_URL = 'https://neptun.in.ua/api/v1/threats';

/** Targets farther than this from the user are not reported. */
const MAX_DISTANCE_KM = 250;

/** A target is "heading towards" the user when its course differs from the bearing by at most this many degrees. */
const HEADING_TOLERANCE_DEG = 50;

/**
 * Air targets near the user, plus the total number of targets over Ukraine.
 * @param {{ lat: number, lng: number, lang?: string }} context user location and interface language
 * @returns {Promise<{ alerts: object[], tracked: number }>}
 */
export async function collectNeptun({ lat, lng, lang }) {
  const L = labelsFor(lang);
  const data = await fetchJson(NEPTUN_URL);
  const targets = Array.isArray(data?.threats) ? data.threats : [];

  const alerts = targets
    .filter((target) => Number.isFinite(target.lat) && Number.isFinite(target.lon))
    .map((target) => ({ target, distance: distanceKm(lat, lng, target.lat, target.lon) }))
    .filter(({ distance }) => distance <= MAX_DISTANCE_KM)
    .sort((a, b) => a.distance - b.distance)
    .map(({ target, distance }) => {
      const towardsUser =
        Number.isFinite(target.heading) &&
        Math.abs(((target.heading - bearing(target.lat, target.lon, lat, lng) + 540) % 360) - 180) <=
          HEADING_TOLERANCE_DEG;
      const place = [target.locality, target.region].filter(Boolean).join(', ');
      return {
        id: `neptun-${target.id}`,
        source: 'NEPTUN',
        category: 'air',
        level: towardsUser ? 'red' : 'yellow',
        title: L.targetTypes[String(target.type).toLowerCase()] || L.airObject,
        text:
          L.kmFromYou(Math.round(distance)) +
          (place ? ` · ${place}` : '') +
          (towardsUser ? ` · ${L.towardsYou}` : '') +
          ` · ${L.confidenceLabel(L.confidence[target.confidenceLevel] || L.unknownConfidence)}`,
        region: target.region || L.ukraine,
        time: target.updatedAt || data.serverTime || null,
        distanceKm: Math.round(distance),
      };
    });

  return { alerts, tracked: targets.length };
}
