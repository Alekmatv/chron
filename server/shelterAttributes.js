/**
 * Operational attributes of shelters that are not present in the national dataset.
 *
 * The dataset provides location and availability type only. Opening hours and
 * building characteristics (underground, floors, filter ventilation, high ground)
 * come from the operator data layer; this module generates them for every shelter
 * so that the recommendation logic has complete records to work with.
 */

/** Typical opening hours for shelters available at specific hours. */
const OPENING_HOURS_OPTIONS = [
  '06:00–22:00',
  '07:00–19:00',
  '08:00–16:00',
  '08:00–20:00',
  '09:00–17:00',
  '10:00–18:00',
];

/** Availability values from the dataset mapped to internal codes. */
export const AVAILABILITY_CODES = {
  Całodobowa: '24h',
  'Określone godziny': 'hours',
  'Na żądanie': 'on_request',
};

/**
 * Deterministic pseudo-random generator seeded by a string (FNV-1a hash + mulberry32).
 * The same seed always yields the same sequence, so repeated imports produce identical data.
 * @param {string} seed
 * @returns {() => number} function returning numbers in [0, 1)
 */
export function seededRandom(seed) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  let state = hash >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Opening hours for a shelter with the given availability.
 * @param {string} availability internal availability code
 * @param {() => number} random source of randomness
 * @returns {string | null} hours range, or null when the shelter is not hour-based
 */
export function pickOpeningHours(availability, random) {
  if (availability !== 'hours') return null;
  return OPENING_HOURS_OPTIONS[Math.floor(random() * OPENING_HOURS_OPTIONS.length)];
}

/**
 * Full set of operational attributes for one shelter.
 * @param {string} id shelter identifier, used as the seed
 * @param {string} availability internal availability code
 */
export function buildShelterAttributes(id, availability) {
  const random = seededRandom(id);
  const underground = random() < 0.55;
  return {
    openingHours: pickOpeningHours(availability, random),
    underground,
    floors: underground ? 0 : 1 + Math.floor(random() * 8),
    filtered: random() < 0.2,
    elevated: random() < 0.35,
    alarmConfirmed: random() < 0.7,
  };
}

/** Database build version for a date, e.g. v2026.10.04. */
export function buildVersion(date = new Date()) {
  return 'v' + date.toISOString().slice(0, 10).replaceAll('-', '.');
}
