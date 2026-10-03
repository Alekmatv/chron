/**
 * Safety Pack: everything needed in a zone without a connection — nearby shelters,
 * map tiles around the zone and walking routes to the nearest shelters.
 *
 * Map tiles are written into the same Cache Storage bucket that the service worker
 * reads map tiles from, so the offline map shows the downloaded area.
 */
import { fetchNearbyShelters } from '@/services/sheltersService.js';
import { fetchWalkingRoute } from '@/services/routing.js';
import { savePack } from '@/services/offlineStore.js';

/** Must match the map tiles cache name in the service worker config (vite.config.js). */
const MAP_TILES_CACHE = 'chron-map-tiles';

/** Shelter search radius around the zone center, in kilometers. */
const PACK_RADIUS_KM = 5;
const PACK_SHELTER_LIMIT = 300;

/** Map area downloaded around the zone center and the zoom levels included. */
const TILE_RADIUS_KM = 1.5;
const TILE_ZOOMS = [13, 14, 15, 16];

/** Walking routes are prepared to this many nearest shelters. */
const ROUTES_PER_PACK = 5;

/** Tile x/y indices containing a point at a zoom level (Web Mercator). */
function tileIndex(lat, lng, zoom) {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

/** URLs of all map tiles covering the area around a point. */
function tileUrls({ lat, lng }) {
  const latDelta = TILE_RADIUS_KM / 111.32;
  const lngDelta = TILE_RADIUS_KM / (111.32 * Math.cos((lat * Math.PI) / 180));
  return TILE_ZOOMS.flatMap((zoom) => {
    const topLeft = tileIndex(lat + latDelta, lng - lngDelta, zoom);
    const bottomRight = tileIndex(lat - latDelta, lng + lngDelta, zoom);
    const urls = [];
    for (let x = topLeft.x; x <= bottomRight.x; x++) {
      for (let y = topLeft.y; y <= bottomRight.y; y++)
        urls.push(`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`);
    }
    return urls;
  });
}

/** Human-readable size, e.g. "2,4 MB". */
function formatSize(bytes) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} kB`;
}

/** Downloads map tiles into Cache Storage; returns the number of tiles and their total size. */
async function downloadTiles(urls, onTile) {
  if (!('caches' in window)) return { count: 0, bytes: 0 };
  const cache = await caches.open(MAP_TILES_CACHE);
  let bytes = 0;
  let count = 0;
  for (const url of urls) {
    try {
      const cached = await cache.match(url);
      const response = cached || (await fetch(url));
      if (response.ok) {
        if (!cached) await cache.put(url, response.clone());
        bytes += (await response.blob()).size;
        count++;
      }
    } catch {
      // A missing tile only leaves a gap on the offline map.
    }
    onTile();
  }
  return { count, bytes };
}

/**
 * Downloads the Safety Pack for a zone and stores it on the device.
 * @param {{ id: string, name: string }} zone
 * @param {{ lat: number, lng: number }} center zone center
 * @param {(progress: number) => void} onProgress progress in percent
 * @returns {Promise<object>} saved pack metadata (status, date, size, version, contents)
 */
export async function downloadSafetyPack(zone, center, onProgress) {
  const { build, shelters } = await fetchNearbyShelters(center, {
    radiusKm: PACK_RADIUS_KM,
    limit: PACK_SHELTER_LIMIT,
  });
  const urls = tileUrls(center);
  const nearest = shelters.slice(0, ROUTES_PER_PACK);
  const totalSteps = 1 + urls.length + nearest.length;
  let done = 1;
  const step = () => onProgress(Math.round((++done / totalSteps) * 100));
  onProgress(Math.round((done / totalSteps) * 100));

  const tiles = await downloadTiles(urls, step);
  for (const shelter of nearest) {
    await fetchWalkingRoute(center, shelter);
    step();
  }

  const sheltersBytes = JSON.stringify(shelters).length;
  const pack = {
    zoneId: zone.id,
    status: 'ready',
    progress: 100,
    center,
    shelters,
    date: new Date().toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    size: formatSize(tiles.bytes + sheltersBytes),
    version: build?.version || '',
    contents: `${shelters.length} schronień · ${tiles.count} fragmentów mapy · ${nearest.length} tras · instrukcje`,
  };
  savePack(pack);
  return pack;
}
