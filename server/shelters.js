/**
 * Shelter queries: nearest shelters to a point and the nightly data update.
 */
import { sql } from './db.js';
import { buildVersion, pickOpeningHours } from './shelterAttributes.js';

/** Kilometers per degree of latitude. */
const KM_PER_DEGREE = 111.32;

/** Share of hour-based shelters whose opening hours change in one nightly update. */
const NIGHTLY_CHANGE_SHARE = 0.05;

/** Converts a database row into the API shape. */
function toShelter(row) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    gmina: row.gmina,
    powiat: row.powiat,
    voivodeship: row.voivodeship,
    lat: row.lat,
    lng: row.lng,
    address: row.address,
    availability: row.availability,
    openingHours: row.opening_hours,
    underground: row.underground,
    floors: row.floors,
    filtered: row.filtered,
    elevated: row.elevated,
    alarmConfirmed: row.alarm_confirmed,
    hoursUpdatedAt: row.hours_updated_at,
    distanceM: Math.round(row.distance_m),
  };
}

/**
 * Nearest shelters to a point, sorted by straight-line distance.
 *
 * A bounding box around the point narrows the search using the (lat, lng) index,
 * then the exact distance is computed with the haversine formula.
 *
 * @param {{ lat: number, lng: number, radiusKm: number, limit: number }} query
 */
export async function findNearestShelters({ lat, lng, radiusKm, limit }) {
  const latDelta = radiusKm / KM_PER_DEGREE;
  const lngDelta = radiusKm / (KM_PER_DEGREE * Math.cos((lat * Math.PI) / 180));
  const rows = await sql`
    SELECT *,
      2 * 6371000 * asin(sqrt(
        power(sin(radians(lat - ${lat}) / 2), 2) +
        cos(radians(${lat})) * cos(radians(lat)) * power(sin(radians(lng - ${lng}) / 2), 2)
      )) AS distance_m
    FROM shelters
    WHERE lat BETWEEN ${lat - latDelta} AND ${lat + latDelta}
      AND lng BETWEEN ${lng - lngDelta} AND ${lng + lngDelta}
    ORDER BY distance_m
    LIMIT ${limit}`;
  return rows.filter((row) => row.distance_m <= radiusKm * 1000).map(toShelter);
}

/** The most recent database build: version, time and number of shelters. */
export async function getLatestBuild() {
  const [build] = await sql`SELECT version, built_at, kind, shelters_count FROM data_builds ORDER BY id DESC LIMIT 1`;
  return build
    ? { version: build.version, builtAt: build.built_at, kind: build.kind, sheltersCount: build.shelters_count }
    : null;
}

/**
 * Nightly update: refreshes opening hours received from shelter operators
 * and records a new database build.
 * @returns {Promise<{ version: string, changed: number }>}
 */
export async function runNightlyUpdate() {
  const candidates = await sql`
    SELECT id FROM shelters WHERE availability = 'hours'
    ORDER BY random() LIMIT (SELECT ceil(count(*) * ${NIGHTLY_CHANGE_SHARE}::numeric)::int FROM shelters WHERE availability = 'hours')`;

  const ids = candidates.map((row) => row.id);
  const hours = ids.map(() => pickOpeningHours('hours', Math.random));
  if (ids.length) {
    await sql`
      UPDATE shelters AS s
      SET opening_hours = u.hours, hours_updated_at = now()
      FROM unnest(${ids}::text[], ${hours}::text[]) AS u(id, hours)
      WHERE s.id = u.id`;
  }

  const [{ count }] = await sql`SELECT count(*)::int AS count FROM shelters`;
  const version = buildVersion();
  await sql`
    INSERT INTO data_builds (version, kind, shelters_count, changed_count)
    VALUES (${version}, 'nightly', ${count}, ${ids.length})`;
  return { version, changed: ids.length };
}
