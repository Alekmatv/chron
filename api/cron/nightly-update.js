/**
 * GET /api/cron/nightly-update
 *
 * Nightly database build, triggered by Vercel Cron (see vercel.json).
 * When CRON_SECRET is configured, Vercel sends it as a bearer token and
 * requests without it are rejected.
 */
import { runNightlyUpdate } from '../../server/shelters.js';

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await runNightlyUpdate();
    return res.status(200).json(result);
  } catch (error) {
    console.error('Nightly update failed', error);
    return res.status(500).json({ error: 'Nightly update failed' });
  }
}
