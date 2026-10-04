/**
 * CHROŃ data access layer.
 *
 * This is the only module that reads src/data. Screens receive
 * ready-to-render objects from its functions, so any function can be
 * replaced with a server request without changing the UI.
 *
 * Most functions take a context object ctx with the current app state:
 * {
 *   level: 'green' | 'yellow' | 'red',  — threat level
 *   threatId: 'air' | 'chem' | 'flood', — threat type
 *   closedIds: string[],                 — shelters marked as closed
 *   system: 'online' | 'degraded' | 'offline' | 'recovering' — connectivity state
 * }
 */
import * as D from '@/data/chronData.js';
import { POLAND_MAP } from '@/data/polandMap.js';

/** Numeric threat level used to compare levels. */
const LEVEL_NUM = { green: 0, yellow: 1, red: 2 };

/** Threat definition by id; falls back to the first threat for unknown ids. */
function threatDef(id) {
  return (
    D.THREATS.find((t) => {
      return t.id === id;
    }) || D.THREATS[0]
  );
}
/** Data is stale while offline or while syncing after reconnection. */
function isStale(ctx) {
  return ctx.system === 'offline' || ctx.system === 'recovering';
}

/** Time of the last fresh data: the real moment the connection was lost, or the demo scenario time. */
function offlineSince(ctx) {
  return (ctx && ctx.offlineSince) || D.TIMES.offlineSince;
}

/** Data freshness label for the current connectivity state. */
function freshness(ctx) {
  if (ctx.system === 'offline')
    return { key: 'stale', label: 'NIEAKTUALNE · dane z ' + offlineSince(ctx), live: false };
  if (ctx.system === 'recovering')
    return { key: 'stale', label: 'SYNCHRONIZACJA · dane z ' + offlineSince(ctx), live: false };
  if (ctx.system === 'degraded') return { key: 'delayed', label: 'OPÓŹNIONE · część źródeł niedostępna', live: false };
  return { key: 'live', label: 'AKTUALNE · na żywo', live: true };
}

/** Overall status for the home screen: level, title, reason, source and time. */
function getStatus(ctx) {
  const lvl = ctx.level;
  const f = freshness(ctx);
  if (lvl === 'green') {
    return {
      level: 'green',
      title: 'Brak aktywnych zagrożeń w Twojej okolicy',
      reason: 'Żadne oficjalne źródło nie zgłasza zagrożenia dla Twojej strefy.',
      source: 'RCB · RSO · IMGW',
      time: D.TIMES.green.source,
      updated: D.TIMES.green.updated,
      freshness: f,
    };
  }
  const t = threatDef(ctx.threatId),
    L = t[lvl];
  return {
    level: lvl,
    title: L.headline,
    kind: t.kind,
    threatTitle: t.title,
    reason: L.reason,
    source: t.source,
    time: D.TIMES[lvl].source,
    updated: D.TIMES[lvl].updated,
    ttr: L.ttr,
    freshness: f,
  };
}

/**
 * Full threat details: texts for the requested level, times, confidence,
 * time to relevance (TTR) and affected voivodeships.
 */
function getThreat(id, ctx, levelOverride) {
  const lvl = levelOverride || (ctx.level === 'green' ? 'yellow' : ctx.level);
  const t = threatDef(id),
    L = t[lvl];
  const regions = D.REGIONS.filter((r) => {
    return r[t.id] > 0;
  }).map((r) => {
    return { name: r.name, level: r[t.id] === 2 ? 'red' : 'yellow' };
  });
  return Object.assign({}, t, {
    level: lvl,
    headline: L.headline,
    reason: L.reason,
    confidence: L.confidence,
    ttr: L.ttr,
    ttrMin: L.ttrMin,
    text: L.text,
    todo: L.todo,
    sourceTime: D.TIMES[lvl].source,
    updated: D.TIMES[lvl].updated,
    regions,
    freshness: freshness(ctx),
  });
}

/** Active threats; empty at the green level. */
function getActiveThreats(ctx) {
  if (ctx.level === 'green') return [];
  return [getThreat(ctx.threatId, ctx)];
}

// ---------- Shelters ----------
/** Whether a shelter suits the given threat type, with an explanation. */
function suitability(s, threatId) {
  if (threatId === 'air')
    return s.underground
      ? { ok: true, note: 'Obiekt podziemny — chroni przed odłamkami' }
      : { ok: false, note: 'Obiekt naziemny — nie chroni przed atakiem z powietrza' };
  if (threatId === 'chem') {
    if (s.filtered) return { ok: true, note: 'Filtrowentylacja — chroni przed skażeniem' };
    if (!s.underground && s.floors >= 3) return { ok: true, note: 'Wyższe piętra — chlor gromadzi się nisko' };
    return {
      ok: false,
      note: s.underground ? 'Obiekt podziemny — chlor gromadzi się nisko' : 'Za nisko — wybierz 3. piętro lub wyżej',
    };
  }
  if (s.underground) return { ok: false, note: 'Obiekt podziemny — przy powodzi niezalecany, ryzyko zalania' };
  return s.elevated
    ? { ok: true, note: 'Teren wyniesiony — poza zasięgiem wody' }
    : { ok: false, note: 'Teren nisko położony' };
}

/**
 * Current shelter status: OTWARTE, ZAMKNIĘTE or BRAK POTWIERDZENIA.
 * Takes into account manual closures, opening hours and confirmed opening after an alarm.
 */
function shelterStatus(s, ctx) {
  if ((ctx.closedIds || []).indexOf(s.id) >= 0)
    return {
      status: 'closed',
      label: 'ZAMKNIĘTE',
      reason: 'Zgłoszenie administratora: wejście zablokowane (' + D.TIMES.closure + ')',
    };
  if (s.forcedClosed) return { status: 'closed', label: 'ZAMKNIĘTE', reason: s.forcedClosed };
  if (s.hours === '24/7') return { status: 'open', label: 'OTWARTE', reason: s.openedBy };
  if (s.hours === 'hours' && isWithinOpeningHours(s.openingHours)) {
    return { status: 'open', label: 'OTWARTE', reason: 'Otwarte w godzinach ' + s.openingHours };
  }
  if (ctx.level !== 'red')
    return { status: 'closed', label: 'ZAMKNIĘTE', reason: 'Otwierany dopiero po ogłoszeniu alarmu' };
  if (!s.alarmConfirmed)
    return {
      status: 'unconfirmed',
      label: 'BRAK POTWIERDZENIA',
      reason: 'Nikt nie potwierdził otwarcia po ogłoszeniu alarmu',
    };
  return { status: 'open', label: 'OTWARTE', reason: s.openedBy };
}

/** Opening mode label shown on shelter cards. */
function hoursLabel(s) {
  if (s.hours === '24/7') return 'Otwarte 24/7';
  if (s.hours === 'hours') return 'Godziny ' + s.openingHours;
  return 'Otwierany przy alarmie';
}

/** Adds computed fields to a shelter: status, suitability and whether the user can reach it in time. */
function decorate(s, ctx) {
  const t = threatDef(ctx.threatId);
  const ttrMin = ctx.level === 'green' ? null : t[ctx.level].ttrMin;
  const st = shelterStatus(s, ctx);
  const suit = suitability(s, ctx.threatId);
  const canReach = ttrMin == null ? null : s.walk <= ttrMin;
  return Object.assign({}, s, {
    status: st.status,
    statusLabel: st.label,
    statusReason: st.reason,
    statusNote: isStale(ctx) ? 'status z ' + offlineSince(ctx) : 'aktualizacja ' + s.updated,
    typeLabel: s.category === 'schron' ? s.kind : 'Miejsce przystosowane · ' + s.kind,
    hoursLabel: hoursLabel(s),
    // Real addresses already include the city; demo addresses do not.
    fullAddress: s.address.indexOf(',') >= 0 ? s.address : s.address + ', ' + D.USER.city,
    hoursColor: s.hours === '24/7' ? '#7FE0BE' : '#F2CC3D',
    suitable: suit.ok,
    suitNote: suit.note,
    canReach,
    ttr: ttrMin == null ? '' : t[ctx.level].ttr,
    reachText: canReach == null ? '' : canReach ? 'Zdążysz' : 'Nie zdążysz',
  });
}

/**
 * Source list of shelters: real shelters near the user once they are loaded (possibly
 * an empty list in remote areas), otherwise the built-in demo set, so the app keeps
 * working before the first response and without the backend.
 */
function shelterList(ctx) {
  return ctx.shelters ? ctx.shelters : D.SHELTERS;
}

/** Whether the current local time falls within an opening hours range like '08:00–20:00'. */
function isWithinOpeningHours(range, now = new Date()) {
  const [start, end] = range.split('–').map((time) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  });
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= start && minutes < end;
}

/** All shelters with computed fields, sorted by walking time. */
function getShelters(ctx) {
  return shelterList(ctx)
    .map((s) => {
      return decorate(s, ctx);
    })
    .sort((a, b) => {
      return a.walk - b.walk;
    });
}
/** A single shelter by id with computed fields, or null. */
function getShelter(id, ctx) {
  const s = shelterList(ctx).find((x) => {
    return x.id === id;
  });
  return s ? decorate(s, ctx) : null;
}

/** Shelters that can be recommended: open and suitable for the threat. */
function candidates(ctx) {
  return getShelters(ctx).filter((s) => {
    return s.suitable && s.status === 'open';
  });
}

/**
 * Decision engine: picks the nearest open shelters suitable for the current threat type.
 * Returns up to three options, the primary option and the reason for the choice.
 * If the primary shelter has closed, it adds an explanation of the reassessment.
 */
function getRecommendation(ctx) {
  const list = candidates(ctx);
  const t = threatDef(ctx.threatId);
  if (!list.length) {
    return {
      none: true,
      options: [],
      primary: null,
      reason:
        'Brak potwierdzonego, otwartego schronienia w pobliżu. Postępuj według instrukcji: ' +
        t.rule.toLowerCase() +
        '.',
    };
  }
  const primary = list[0];
  const base = candidates(Object.assign({}, ctx, { closedIds: [] }))[0];
  let reassessment = null;
  let reason;
  if (base && base.id !== primary.id) {
    reassessment = {
      closedId: base.id,
      closedName: base.name,
      newId: primary.id,
      newName: primary.name,
      title: base.name + ' zamknięty — proponujemy ' + primary.name,
      text:
        base.name +
        ': ' +
        shelterStatus(base, ctx).reason.toLowerCase() +
        '. ' +
        primary.name +
        ' jest otwarty (' +
        primary.hoursLabel.toLowerCase() +
        '), ' +
        primary.walk +
        ' min pieszo' +
        (primary.canReach ? ', zdążysz przed zagrożeniem.' : '.'),
    };
    reason = reassessment.title + '.';
  } else if (ctx.threatId === 'flood') {
    reason =
      'Schrony podziemne nie są zalecane przy powodzi — wybraliśmy najbliższy otwarty obiekt na wyższym terenie.';
  } else if (ctx.threatId === 'chem') {
    reason =
      'Piwnice i przejścia podziemne są niezalecane — chlor gromadzi się nisko. Wybraliśmy najbliższy otwarty budynek z wyższymi piętrami.';
  } else {
    reason = 'Najbliższy otwarty obiekt podziemny' + (primary.canReach ? ' — zdążysz przed zagrożeniem.' : '.');
  }
  const options = list.slice(0, 3).map((s, i) => {
    return Object.assign({}, s, { isRec: i === 0 });
  });
  return { none: false, primary: options[0], options, reason, reassessment };
}

/** Walking route to a shelter: SVG path, distance, time and offline label. */
function getRoute(shelterId, ctx) {
  const s = getShelter(shelterId, ctx);
  if (!s) return null;
  return {
    shelter: s,
    path: s.path,
    dist: s.dist,
    walk: s.walk,
    nav: s.nav,
    // Demo shelters carry a schematic path; real shelters are routed on the map itself.
    pathD: s.path
      ? s.path
          .map((p, i) => {
            return (i ? 'L' : 'M') + p[0] + ' ' + p[1];
          })
          .join(' ')
      : '',
    canReach: s.canReach,
    ttr: s.ttr,
    offline: isStale(ctx),
    cachedLabel: 'Trasa zapisana offline · Safety Pack „Dom”, ' + D.SAFETY_PACKS[0].date,
  };
}

/**
 * Connectivity banner texts: ONLINE, DEGRADED, OFFLINE or RECOVERING.
 * failedSources lists the names of unavailable live sources for the DEGRADED text;
 * lostAt is the time the connection was really lost (HH:MM), if it was.
 */
function getSystemInfo(system, progress, failedSources, lostAt) {
  switch (system) {
    case 'degraded':
      return {
        key: 'degraded',
        label: 'DEGRADED',
        title: 'Ograniczona łączność',
        text:
          'Część źródeł niedostępna (' +
          (failedSources && failedSources.length ? failedSources.join(', ') : 'IMGW') +
          '). Dane mogą być opóźnione.',
      };
    case 'offline':
      return {
        key: 'offline',
        label: 'OFFLINE',
        title: 'Brak internetu',
        text:
          'Dane o zagrożeniu z ' + (lostAt || D.TIMES.offlineSince) + '. Schrony, instrukcje i trasa działają offline.',
      };
    case 'recovering':
      return {
        key: 'recovering',
        label: 'RECOVERING',
        title: 'Synchronizacja…',
        text:
          progress < 50
            ? 'Pobieramy zagrożenia z RSO / RCB, NEPTUN, PAŻP'
            : 'Sprawdzamy statusy schronów i przeliczamy trasę',
        progress,
      };
    default:
      return { key: 'online', label: 'ONLINE', title: 'Połączono', text: 'Dane aktualne · ' + D.TIMES.synced };
  }
}

/** Threat level for each voivodeship on the map of Poland. */
function getRegionLevels(ctx) {
  const n = LEVEL_NUM[ctx.level];
  const out = {};
  D.REGIONS.forEach((r) => {
    out[r.code] = r.code === D.USER.regionCode ? n : Math.min(r[ctx.threatId], n);
  });
  return out;
}

/**
 * User profile with the current location. With a GPS fix the location is described
 * by the municipality of the nearest shelter and the coordinates; otherwise the
 * profile's home location is used.
 */
function getUser(ctx) {
  const location = ctx && ctx.location;
  if (!location || location.source !== 'gps') return D.USER;
  const nearest = ctx.shelters && ctx.shelters[0];
  return Object.assign({}, D.USER, {
    location: Object.assign({}, D.USER.location, {
      label: nearest ? nearest.gmina : 'Twoja lokalizacja',
      address: location.lat.toFixed(4) + ', ' + location.lng.toFixed(4),
      accuracy: '±' + location.accuracy + ' m',
      lat: location.lat,
      lng: location.lng,
    }),
  });
}

/**
 * Place name for headers and messages: the municipality and voivodeship of the nearest
 * real shelter, or the profile's home city when real shelters are not loaded.
 * @returns {{ city: string, region: string, label: string }}
 */
function getPlace(ctx) {
  const shelters = ctx && ctx.shelters;
  if (!shelters) return { city: D.USER.city, region: D.USER.region, label: D.USER.city + ' · ' + D.USER.region };
  const nearest = shelters[0];
  if (!nearest) return { city: 'Twoja okolica', region: 'Polska', label: 'Twoja okolica · Polska' };
  const region = nearest.voivodeship.charAt(0).toUpperCase() + nearest.voivodeship.slice(1);
  return { city: nearest.gmina, region, label: nearest.gmina + ' · ' + region };
}

/** Public interface of the data layer used by screens. */
const chronApi = {
  getUser: getUser,
  getPlace: getPlace,
  getOfflineSince: offlineSince,
  getZones: function () {
    return D.ZONES;
  },
  getSafetyPacks: function () {
    return D.SAFETY_PACKS;
  },
  getStatus,
  getActiveThreats,
  getThreat,
  getThreatTypes: function () {
    return D.THREATS.map((t) => {
      return { id: t.id, short: t.short, title: t.title };
    });
  },
  getShelters,
  getShelter,
  getRecommendation,
  getRoute,
  getSystemInfo,
  getRegions: function () {
    return D.REGIONS;
  },
  getRegionLevels,
  getPolandMap: function () {
    return POLAND_MAP;
  },
  getGuide: function () {
    return D.GUIDE;
  },
  getDemoSteps: function () {
    return D.DEMO_STEPS;
  },
  getTimes: function () {
    return D.TIMES;
  },
};

export default chronApi;
