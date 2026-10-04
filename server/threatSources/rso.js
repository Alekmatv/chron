/**
 * RSO / Alert RCB: official Polish regional warning system, published through TVP.
 * This is the channel behind the "Alert RCB" text messages.
 */
import { fetchJson, foldText } from './http.js';
import { labelsFor } from './labels.js';

const RSO_URL = 'https://komunikaty.tvp.pl/komunikatyxml/wszystkie/wszystkie/1?_format=json';

/** Phrases that identify messages issued by RCB (the Government Centre for Security). */
const RCB_MARKERS = ['alert rcb', 'uwaga! uwaga! uwaga', 'spo-', 'rcb'];

/** Phrases that identify air threats (drones, missiles, airspace violations). */
const AIR_MARKERS = [
  'powietrzn',
  'dron',
  'bezzalogow',
  'rakiet',
  'pocisk',
  'nalot',
  'obiekt lataj',
  'naruszenie przestrzeni',
  'mysliwc',
  'lotnictw',
];

/** Phrases for weather and water warnings. */
const WEATHER_MARKERS = ['burz', 'wiatr', 'upal', 'mroz', 'snieg', 'opady', 'deszcz', 'imgw', 'meteo'];
const WATER_MARKERS = ['powodz', 'stan wody', 'hydrolog', 'zalan', 'wezbran'];

/** Message category by keywords. */
function categorize(text) {
  if (AIR_MARKERS.some((word) => text.includes(word))) return 'air';
  if (WATER_MARKERS.some((word) => text.includes(word))) return 'water';
  if (WEATHER_MARKERS.some((word) => text.includes(word))) return 'weather';
  return 'other';
}

/** Voivodeship names a message applies to; an empty list means the whole country. */
function provinces(item) {
  return Object.values(item.provinces || {})
    .filter((province) => province && typeof province === 'object')
    .map((province) => province.name);
}

/**
 * Current RSO messages relevant to the user's voivodeship.
 * Message texts are official and stay in Polish; only generated labels are translated.
 * @param {{ voivodeship?: string, lang?: string }} context
 */
export async function collectRso({ voivodeship, lang }) {
  const L = labelsFor(lang);
  const data = await fetchJson(RSO_URL);
  const items = Array.isArray(data?.newses) ? data.newses : [];
  const userRegion = foldText(voivodeship);

  return items
    .map((item) => {
      const text = foldText([item.title, item.shortcut, item.content].join(' '));
      const regions = provinces(item);
      const isRcb = RCB_MARKERS.some((marker) => text.includes(marker));
      const category = categorize(text);
      const official = isRcb || item.rso_alarm === '1';
      return {
        id: `rso-${item.id}`,
        source: 'RSO',
        category,
        // Red is reserved for official air threats; other official warnings are yellow.
        level: official && category === 'air' ? 'red' : official ? 'yellow' : 'info',
        title: item.title || L.rsoMessage,
        text: item.shortcut || item.content || '',
        region: regions.length ? regions.join(', ') : L.wholeCountry,
        time: item.valid_from ? item.valid_from.replace(' ', 'T') : null,
        appliesToUser: !regions.length || !userRegion || regions.some((name) => foldText(name).includes(userRegion)),
      };
    })
    .filter((alert) => alert.appliesToUser);
}
