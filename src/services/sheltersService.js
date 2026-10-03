/**
 * Loads real shelters near the user from the backend and converts them
 * into the shape used by the data layer (src/api/chronApi.js).
 */
import { bearingDegrees } from '@/services/geolocation.js';

/** Search radius around the user, in kilometers. */
const SEARCH_RADIUS_KM = 3;

/** Number of nearest shelters kept on the device. */
const SHELTER_LIMIT = 30;

/** Average walking speed, meters per minute. */
const WALK_SPEED_M_PER_MIN = 80;

/** Real walking paths are longer than the straight line; this factor estimates the difference. */
const DETOUR_FACTOR = 1.25;

/** Compass directions in Polish, starting from north and going clockwise. */
const DIRECTIONS = [
  'na północ',
  'na północny wschód',
  'na wschód',
  'na południowy wschód',
  'na południe',
  'na południowy zachód',
  'na zachód',
  'na północny zachód',
];

/** Availability codes from the backend mapped to the opening modes used by the UI. */
const HOURS_MODE = { '24h': '24/7', hours: 'hours', on_request: 'alarm' };

/** Short, stable shelter number derived from its identifier (used in labels like "Schron nr 42"). */
function shelterNumber(id) {
  return String((parseInt(id.slice(-4), 16) % 900) + 10);
}

/** Formats an ISO timestamp as HH:MM in local time. */
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

/** Building description shown under the shelter name. */
function describeBuilding(shelter) {
  if (shelter.underground) return shelter.filtered ? 'Obiekt podziemny z filtrowentylacją' : 'Obiekt podziemny';
  return `Budynek naziemny · ${shelter.floors} kondygn.`;
}

/**
 * Converts a shelter from the API into the data layer shape.
 * @param {object} shelter shelter returned by GET /api/shelters
 * @param {{lat: number, lng: number}} origin user location used for the walking hint
 */
export function toAppShelter(shelter, origin) {
  const walkMeters = shelter.distanceM * DETOUR_FACTOR;
  const direction = DIRECTIONS[Math.round(bearingDegrees(origin, shelter) / 45) % 8];
  const updated = formatTime(shelter.hoursUpdatedAt);
  return {
    id: shelter.id,
    num: shelterNumber(shelter.id),
    name: `Schron nr ${shelterNumber(shelter.id)}`,
    category: shelter.underground ? 'schron' : 'przystosowane',
    kind: describeBuilding(shelter),
    address: shelter.address || `${shelter.gmina}, ${shelter.voivodeship}`,
    gmina: shelter.gmina,
    voivodeship: shelter.voivodeship,
    hours: HOURS_MODE[shelter.availability] || 'alarm',
    openingHours: shelter.openingHours,
    alarmConfirmed: shelter.alarmConfirmed,
    underground: shelter.underground,
    floors: shelter.floors,
    filtered: shelter.filtered,
    elevated: shelter.elevated,
    lat: shelter.lat,
    lng: shelter.lng,
    dist: Math.round(shelter.distanceM / 10) * 10,
    walk: Math.max(1, Math.ceil(walkMeters / WALK_SPEED_M_PER_MIN)),
    nav: `Idź ${Math.round(shelter.distanceM / 10) * 10} m ${direction}`,
    source: 'KG PSP · dane.gov.pl',
    updated,
    confidence: shelter.alarmConfirmed ? 'WYSOKA' : 'ŚREDNIA',
    openedBy:
      shelter.availability === '24h'
        ? 'Obiekt dostępny całodobowo'
        : `Godziny potwierdzone przez operatora o ${updated}`,
    community: { count: 0, time: updated, text: 'potwierdzeń od mieszkańców' },
  };
}

/**
 * Nearest shelters to a location, converted for the data layer.
 * @param {{lat: number, lng: number}} location
 * @returns {Promise<{ build: object | null, shelters: object[] }>}
 */
export async function fetchNearbyShelters(location) {
  const params = new URLSearchParams({
    lat: location.lat.toFixed(5),
    lng: location.lng.toFixed(5),
    radius: String(SEARCH_RADIUS_KM),
    limit: String(SHELTER_LIMIT),
  });
  const response = await fetch(`/api/shelters?${params}`);
  if (!response.ok) throw new Error(`Shelters request failed: ${response.status}`);
  const data = await response.json();
  return { build: data.build, shelters: data.shelters.map((shelter) => toAppShelter(shelter, location)) };
}
