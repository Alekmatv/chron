/**
 * Live threat picture: polls all threat sources in parallel and merges the results.
 *
 * Every source is isolated: a failure or timeout of one source is reported in
 * its status and does not affect the others.
 */
import { collectNeptun } from './threatSources/neptun.js';
import { collectPansa } from './threatSources/pansa.js';
import { collectRso } from './threatSources/rso.js';
import { labelsFor } from './threatSources/labels.js';

/** Source registry: id, display name, authority level and collector. */
const SOURCES = [
  { id: 'rso', name: 'RSO / Alert RCB', authority: 'official', collect: collectRso },
  { id: 'neptun', name: 'NEPTUN', authority: 'observation', collect: collectNeptun },
  { id: 'pansa', name: 'PAŻP', authority: 'official', collect: collectPansa },
];

/** Order of alert levels, most severe first. */
const LEVEL_ORDER = { red: 0, yellow: 1, info: 2 };

/** Runs one collector and measures it; never throws. */
async function runSource(source, context) {
  const startedAt = Date.now();
  try {
    const result = await source.collect(context);
    const alerts = Array.isArray(result) ? result : result.alerts;
    return {
      status: {
        id: source.id,
        name: source.name,
        authority: source.authority,
        ok: true,
        latencyMs: Date.now() - startedAt,
        count: alerts.length,
        ...(Array.isArray(result) ? {} : { tracked: result.tracked }),
      },
      alerts,
    };
  } catch (error) {
    return {
      status: {
        id: source.id,
        name: source.name,
        authority: source.authority,
        ok: false,
        latencyMs: Date.now() - startedAt,
        count: 0,
        error: error.name === 'TimeoutError' ? labelsFor(context.lang).timeout : labelsFor(context.lang).unavailable,
      },
      alerts: [],
    };
  }
}

/**
 * Current alerts for a location from all sources.
 * @param {{ lat: number, lng: number, voivodeship?: string, lang?: string }} context
 */
export async function getLiveThreats(context) {
  const results = await Promise.all(SOURCES.map((source) => runSource(source, context)));
  const alerts = results
    .flatMap((result) => result.alerts)
    .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || String(b.time).localeCompare(String(a.time)));
  return {
    fetchedAt: new Date().toISOString(),
    sources: results.map((result) => result.status),
    alerts,
  };
}
