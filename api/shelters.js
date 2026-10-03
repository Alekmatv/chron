/**
 * GET /api/shelters?lat=54.38&lng=18.60&radius=3&limit=50
 *
 * Nearest civil protection shelters to a point, with the current database build.
 * radius is in kilometers (default 3, max 25), limit defaults to 50 (max 500).
 */
import { findNearestShelters, getLatestBuild } from '../server/shelters.js';

const DEFAULT_RADIUS_KM = 3;
const MAX_RADIUS_KM = 25;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

/** Parses a numeric query parameter, falling back to a default and clamping to a maximum. */
function numberParam(value, fallback, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.min(number, max);
}

export default async function handler(req, res) {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ error: 'Query parameters lat and lng are required' });
  }

  try {
    const [shelters, build] = await Promise.all([
      findNearestShelters({
        lat,
        lng,
        radiusKm: numberParam(req.query.radius, DEFAULT_RADIUS_KM, MAX_RADIUS_KM),
        limit: numberParam(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT),
      }),
      getLatestBuild(),
    ]);
    // Shelter data changes at most once a night, so responses can be cached briefly at the edge.
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    return res.status(200).json({ build, shelters });
  } catch (error) {
    console.error('Failed to load shelters', error);
    return res.status(500).json({ error: 'Failed to load shelters' });
  }
}
