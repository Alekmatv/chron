/**
 * GET /api/threats?lat=54.38&lng=18.60&voivodeship=pomorskie
 *
 * Live alerts from official and observational sources for the user's location,
 * with the health of every source. voivodeship narrows RSO messages to the user's region.
 */
import { getLiveThreats } from '../server/threats.js';

export default async function handler(req, res) {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'Query parameters lat and lng are required' });
  }

  const result = await getLiveThreats({ lat, lng, voivodeship: req.query.voivodeship || '' });
  // Sources update every few minutes; a short edge cache protects them from repeated requests.
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
  return res.status(200).json(result);
}
