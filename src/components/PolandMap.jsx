/**
 * Map of Poland by voivodeship with threat levels and shelter points. Opens full screen with zoom and filters.
 */
import { Fragment, useContext } from 'react';
import { LocationContext } from '@/app/LocationContext.js';
import useMergedState from '@/hooks/useMergedState.js';
import chronApi from '@/api/chronApi.js';
import { t } from '@/i18n/index.js';
const LEVELS = [
  {
    short: 'Zielony',
    label: 'Bezpiecznie',
    bg: '#24493D',
    fg: '#CFEFE2',
    map: '#2A4F43',
    glow: 'none',
  },
  {
    short: 'Żółty',
    label: 'Podwyższone zagrożenie',
    bg: '#C9A43A',
    fg: '#1A1405',
    map: '#C9A43A',
    glow: 'drop-shadow(0 0 4px rgba(230,198,94,.35))',
  },
  {
    short: 'Czerwony',
    label: 'Wysokie zagrożenie',
    bg: '#C8323F',
    fg: '#FFFFFF',
    map: '#C8323F',
    glow: 'drop-shadow(0 0 5px rgba(255,60,75,.4))',
  },
];
const ZOOMS = [1, 1.6, 2.2];
const SUBS = ['parking podziemny', 'piwnica', 'przejście podziemne'];
const C247 = '#7CC4FF',
  CALARM = '#C9B8FF';
function isAdapted(p) {
  return p[3] !== 0;
}
function subOf(p, i) {
  return p[3] === 1 ? 0 : i % 2 ? 1 : 2;
}
function pct(v, total) {
  return ((v / total) * 100).toFixed(2);
}
const DEFAULT_PROPS = {
  threatTitle: 'Alarm powietrzny',
  offline: false,
  offlineLabel: 'Mapa offline · pobrana 14:32',
};

/** Builds view data (texts, colors, handlers) from props and local state. */
/** Geographic bounds of Poland used for the linear projection onto the map image. */
const POLAND_BOUNDS = {
  west: 14.12,
  east: 24.15,
  south: 49.0,
  north: 54.92,
};

/**
 * Position of a point on the map image, in percent of its width and height.
 * A linear projection is accurate enough for a country-scale overview.
 */
function projectToMap({ lat, lng }) {
  const clamp = (value) => Math.min(100, Math.max(0, value));
  const x = ((lng - POLAND_BOUNDS.west) / (POLAND_BOUNDS.east - POLAND_BOUNDS.west)) * 100;
  const y = ((POLAND_BOUNDS.north - lat) / (POLAND_BOUNDS.north - POLAND_BOUNDS.south)) * 100;
  return {
    left: clamp(x).toFixed(2) + '%',
    top: clamp(y).toFixed(2) + '%',
  };
}
function buildViewModel(props, state, setState) {
  const st = state,
    p = props;
  const api = chronApi;
  const regions = api.getRegions();
  const DOTS = api.getPolandMap().dots;
  const levels = p.regionLevels || {};
  const offline = !!p.offline;
  const full = st.full,
    zoom = full ? ZOOMS[st.zoom] : 1;
  const visible = DOTS.map((d, i) => {
    return d.concat([subOf(d, i)]);
  }).filter((d) => {
    return (d[4] ? st.f247 : st.fAlarm) && (st.fAdapted || !isAdapted(d));
  });
  const dots =
    full && zoom > 1
      ? visible.map((d) => {
          const a = isAdapted(d);
          return {
            l: pct(d[1], 358),
            t: pct(d[2], 340),
            radius: a ? '1px' : '50%',
            rot: a ? 'rotate(45deg)' : 'none',
            c: d[4] ? C247 : CALARM,
          };
        })
      : [];
  const counts =
    full && zoom === 1
      ? regions
          .map((r, i) => {
            return {
              n: visible.filter((d) => {
                return d[0] === i;
              }).length,
              l: pct(r.x, 358),
              t: pct(r.y, 340),
            };
          })
          .filter((c) => {
            return c.n > 0;
          })
      : [];
  function chip(on, label, swatch, radius, rot, key) {
    return {
      label,
      swatch,
      radius,
      rot,
      pressed: on ? 'true' : 'false',
      bg: on ? '#2C2930' : 'transparent',
      border: on ? '#F2EFF3' : '#3A3540',
      fg: on ? '#FFFFFF' : '#9C95A0',
      toggle: function () {
        const o = {};
        o[key] = !state[key];
        setState(o);
      },
    };
  }
  const iw = Math.round(390 * zoom);
  const mv = full
    ? {
        pos: 'absolute',
        z: 30,
        w: '100%',
        h: '100%',
        radius: '0',
        border: '0',
        bg: '#0B0A0D',
        vh: '360px',
        ov: 'auto',
        iw: iw + 'px',
        ih: Math.round((iw * 340) / 358) + 'px',
        svgH: '100%',
        margin: zoom === 1 ? '14px 0 0' : '0',
      }
    : {
        pos: 'relative',
        z: 1,
        w: '100%',
        h: 'auto',
        radius: '16px',
        border: '1px solid #222026',
        bg: '#100E13',
        vh: 'auto',
        ov: 'hidden',
        iw: '100%',
        ih: 'auto',
        svgH: 'auto',
        margin: '0',
      };
  const m = {},
    marks = [];
  regions.forEach((r) => {
    const rn = offline ? 0 : levels[r.code] || 0;
    const rl = LEVELS[rn];
    const sel = full && r.code === st.region;
    const pick = function () {
      setState({
        region: r.code,
      });
    };
    m[r.code] = {
      fill: offline ? '#24212A' : rl.map,
      stroke: sel ? '#FFFFFF' : rn ? '#0B0A0D' : '#3A3540',
      sw: sel ? 2.4 : 1,
      glow: rl.glow,
      pick,
    };
    if (rn)
      marks.push({
        name: r.name,
        color: rl.map,
        chipBorder: sel ? '#FFFFFF' : '#2C2830',
        l: pct(r.x, 358),
        t: pct(r.y, 340),
        pick,
        aria: r.name + ': ' + t(rl.short) + ', ' + t(rl.label),
      });
  });
  const sr = regions.find((r) => {
    return r.code === st.region;
  });
  const srn = offline ? 0 : levels[sr.code] || 0;
  const srIdx = regions.indexOf(sr);
  const srAll = visible.filter((d) => {
    return d[0] === srIdx;
  });
  const srAd = srAll.filter(isAdapted);
  const reg = {
    name: sr.name,
    bg: LEVELS[srn].bg,
    fg: LEVELS[srn].fg,
    badge: t(LEVELS[srn].short) + ' · ' + t(LEVELS[srn].label),
    where: sr.code === 'PM' ? t('Tu jesteś') : t('Wybrane województwo'),
    shelters:
      t('Schrony (wg filtrów): ') +
      srAll.length +
      t(', w tym 24/7: ') +
      srAll.filter((d) => {
        return d[4];
      }).length +
      (srAd.length
        ? t('. Przystosowane: ') +
          SUBS.map((n, j) => {
            return (
              t(n) +
              ': ' +
              srAd.filter((d) => {
                return d[5] === j;
              }).length
            );
          }).join(', ')
        : ''),
  };
  return {
    mv,
    m,
    marks,
    dots,
    counts,
    labels: full && zoom > 1 ? marks : [],
    reg,
    mapFull: full,
    mapSmall: !full,
    offline,
    offlineLabel: p.offlineLabel || t('Mapa offline'),
    threatTitle: t(p.threatTitle) || t('Sytuacja w kraju'),
    filters: [
      chip(st.f247, t('Całodobowe 24/7'), C247, '50%', 'none', 'f247'),
      chip(st.fAlarm, t('Przy alarmie'), CALARM, '50%', 'none', 'fAlarm'),
      chip(st.fAdapted, t('Miejsca przystosowane'), '#9C95A0', '1px', 'rotate(45deg)', 'fAdapted'),
    ],
    shelterSummary:
      t('Na mapie: ') +
      visible.length +
      t(' schronów · całodobowych: ') +
      visible.filter((d) => {
        return d[4];
      }).length +
      t(' (dane demo)'),
    zoomHint:
      zoom === 1
        ? t('Liczby pokazują schrony w województwie. Przybliż (+), aby zobaczyć każdy schron.')
        : t(
            'Kolor — godziny otwarcia. Kształt — schron lub miejsce przystosowane. Pokazujemy tylko sprawdzone, bezpieczne miejsca.',
          ),
    openMap: function () {
      setState({
        full: true,
        zoom: 0,
      });
    },
    closeMap: function () {
      setState({
        full: false,
      });
    },
    zoomIn: function () {
      setState({
        zoom: Math.min(ZOOMS.length - 1, state.zoom + 1),
      });
    },
    zoomOut: function () {
      setState({
        zoom: Math.max(0, state.zoom - 1),
      });
    },
  };
}

/**
 * Map of Poland by voivodeship with threat levels and shelter points.
 *
 * @param {object} props
 * @param {Record<string, 0|1|2>} props.regionLevels
 * @param {string} props.threatTitle
 * @param {boolean} props.offline
 * @param {string} props.offlineLabel
 */
export default function PolandMap(inputProps) {
  const props = {
    ...DEFAULT_PROPS,
    ...inputProps,
  };
  const [state, setState] = useMergedState({
    full: false,
    zoom: 0,
    region: 'PM',
    f247: true,
    fAlarm: true,
    fAdapted: true,
  });
  const {
    closeMap,
    counts,
    dots,
    filters,
    labels,
    m,
    mapFull,
    mapSmall,
    marks,
    mv,
    offline,
    offlineLabel,
    openMap,
    reg,
    shelterSummary,
    threatTitle,
    zoomHint,
    zoomIn,
    zoomOut,
  } = buildViewModel(props, state, setState);
  const location = useContext(LocationContext);
  const { left: userLeft, top: userTop } = projectToMap(location);
  return (
    <div
      style={{
        flex: 'none',
        position: mv.pos,
        left: '0',
        top: '0',
        zIndex: mv.z,
        width: mv.w,
        height: mv.h,
        boxSizing: 'border-box',
        borderRadius: mv.radius,
        border: mv.border,
        background: mv.bg,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'Manrope', system-ui, sans-serif",
        color: '#F4F1F2',
      }}
    >
      {mapFull && (
        <>
          <div
            style={{
              height: '72px',
              flex: 'none',
              boxSizing: 'border-box',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              borderBottom: '1px solid #1F1C24',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <span
                style={{
                  fontFamily: "'Unbounded', 'Arial Black', sans-serif",
                  fontWeight: '500',
                  fontSize: '17px',
                }}
              >
                {t('Mapa zagrożeń')}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: '#A49DA6',
                }}
              >
                {threatTitle}
                {t(' · dotknij województwa')}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '6px',
              }}
            >
              <button
                type="button"
                onClick={zoomOut}
                aria-label={t('Oddal')}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#17151A',
                  border: '1px solid #222026',
                  color: '#F4F1F2',
                  fontSize: '22px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                −
              </button>
              <button
                type="button"
                onClick={zoomIn}
                aria-label={t('Przybliż')}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#17151A',
                  border: '1px solid #222026',
                  color: '#F4F1F2',
                  fontSize: '22px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                +
              </button>
              <button
                type="button"
                onClick={closeMap}
                aria-label={t('Zamknij mapę')}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#17151A',
                  border: '1px solid #222026',
                  color: '#F4F1F2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18"></path>
                </svg>
              </button>
            </div>
          </div>
          <div
            style={{
              flex: 'none',
              padding: '10px 16px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              borderBottom: '1px solid #1F1C24',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: '700',
                color: '#9C95A0',
              }}
            >
              {t('Filtruj schrony na mapie')}
            </span>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
              }}
            >
              {(filters || []).map((fl, flIndex) => (
                <Fragment key={flIndex}>
                  <button
                    type="button"
                    onClick={fl.toggle}
                    aria-pressed={fl.pressed}
                    style={{
                      minHeight: '36px',
                      padding: '0 10px',
                      borderRadius: '10px',
                      border: `1px solid ${fl.border}`,
                      background: fl.bg,
                      color: fl.fg,
                      fontSize: '12px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: '9px',
                        height: '9px',
                        borderRadius: fl.radius,
                        background: fl.swatch,
                        transform: fl.rot,
                      }}
                    ></span>
                    {fl.label}
                  </button>
                </Fragment>
              ))}
            </div>
          </div>
        </>
      )}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: mv.vh,
          overflow: mv.ov,
          flex: 'none',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: mv.iw,
            height: mv.ih,
            margin: mv.margin,
          }}
        >
          <svg
            viewBox="0 0 358 340"
            role="img"
            aria-label={t('Mapa Polski z podziałem na województwa')}
            style={{
              display: 'block',
              width: '100%',
              height: mv.svgH,
              overflow: 'visible',
            }}
          >
            <path
              d="M84 28L89 23L95 21L96 23L97 26L98 26L99 27L100 28L99 30L100 31L99 32L99 34L99 35L100 36L101 38L95 41L96 42L96 43L98 44L98 46L99 46L98 49L99 49L98 52L98 53L100 53L101 54L101 56L105 58L104 60L101 60L101 61L101 62L102 63L102 64L103 64L103 65L100 67L102 72L100 74L99 73L99 74L97 74L96 80L93 82L88 83L86 82L86 83L87 87L89 88L89 88L90 89L92 90L95 92L93 94L92 96L93 97L92 97L91 96L90 96L89 97L88 100L87 99L85 101L85 100L84 102L83 103L83 104L82 107L80 106L76 108L74 108L70 107L71 104L70 103L68 102L66 102L66 104L64 104L65 105L64 106L64 106L64 107L63 109L62 110L60 109L58 110L57 110L55 108L51 110L49 112L46 111L46 113L48 115L39 118L38 117L36 118L36 116L33 115L32 117L34 118L33 118L32 118L32 121L29 123L29 126L27 130L24 129L24 128L21 130L19 129L17 127L14 123L11 122L9 119L6 119L6 118L7 115L7 111L11 109L14 106L15 101L14 99L15 98L16 97L17 94L16 92L14 83L12 78L13 74L12 73L11 70L12 66L9 60L9 58L10 57L11 57L11 56L14 58L16 57L19 55L27 52L46 45L53 44L66 39L74 38L80 33L84 28Z"
              onClick={m.ZP.pick}
              style={{
                fill: m.ZP.fill,
                stroke: m.ZP.stroke,
                strokeWidth: m.ZP.sw,
                filter: m.ZP.glow,
                cursor: 'pointer',
                transition: 'fill .6s',
              }}
            ></path>
            <path
              d="M35 201L35 198L35 196L34 195L27 191L26 190L28 187L28 184L25 180L24 177L22 175L23 173L26 171L26 168L26 165L28 161L25 158L25 157L26 155L25 154L26 152L26 151L22 150L22 149L22 148L20 143L21 141L24 138L23 136L24 133L21 130L24 128L26 130L27 130L28 129L29 126L29 123L32 121L32 118L33 118L34 118L32 117L33 115L36 116L36 118L38 117L39 118L48 115L46 113L46 111L49 112L51 110L55 108L57 110L58 110L60 109L62 110L63 109L64 107L64 106L64 106L65 105L64 104L66 104L66 102L66 102L70 103L71 104L69 107L69 111L70 113L70 117L68 118L68 118L67 118L67 120L68 120L69 122L69 124L68 125L64 125L64 128L63 128L63 129L64 129L63 130L66 135L65 135L67 138L67 140L66 141L65 140L64 140L65 142L67 143L67 144L67 145L67 148L66 150L66 156L67 156L66 158L65 159L66 160L68 161L69 160L70 161L71 162L71 163L70 163L70 164L71 166L73 166L75 166L76 169L74 171L77 172L78 172L80 171L83 172L82 172L85 174L84 177L85 177L84 178L83 181L80 183L78 181L76 181L77 178L74 178L71 176L70 177L70 178L70 178L70 179L69 180L67 180L65 183L66 184L64 187L65 189L61 190L61 192L60 192L59 195L58 194L57 196L56 196L57 195L53 192L53 192L50 191L49 193L49 195L48 195L48 198L45 196L43 196L43 195L39 197L39 199L37 199L37 201L35 201Z"
              onClick={m.LB.pick}
              style={{
                fill: m.LB.fill,
                stroke: m.LB.stroke,
                strokeWidth: m.LB.sw,
                filter: m.LB.glow,
                cursor: 'pointer',
                transition: 'fill .6s',
              }}
            ></path>
            <path
              d="M100 74L102 72L102 74L103 76L104 78L105 78L105 79L106 80L108 80L108 78L111 79L114 79L116 80L116 80L117 81L119 81L118 83L114 88L115 89L117 89L120 94L120 96L117 97L117 98L117 100L119 101L118 102L118 104L116 105L117 108L116 108L116 109L116 110L119 110L123 113L124 117L123 120L121 121L121 120L119 122L120 123L122 124L121 127L123 127L123 127L125 126L127 125L127 128L129 129L129 131L131 130L130 129L131 129L132 129L132 128L136 130L137 131L136 132L139 134L140 133L139 135L140 134L142 135L143 134L144 135L143 136L147 137L147 138L147 138L149 138L152 136L152 135L153 135L153 138L156 138L156 138L157 137L159 138L160 139L162 140L163 143L164 143L166 145L166 146L171 144L171 144L172 144L172 143L172 143L174 146L176 146L176 150L178 150L177 154L175 153L172 154L172 155L171 158L173 158L172 161L170 160L168 162L167 162L166 161L165 161L165 167L164 167L166 169L164 173L164 175L160 174L158 174L157 173L156 173L156 175L155 175L155 176L154 177L155 178L154 182L152 183L152 184L153 185L152 186L152 186L152 188L153 188L152 191L153 194L151 198L148 196L146 196L147 197L146 200L145 199L144 201L142 202L144 204L144 206L146 206L146 212L144 212L143 212L142 213L141 214L138 215L136 215L134 214L133 214L135 212L134 210L132 210L131 209L131 207L132 203L130 201L131 198L130 198L130 199L126 197L126 198L125 198L124 198L124 197L123 195L123 193L125 191L125 190L124 188L123 188L123 187L122 186L117 185L113 186L113 189L110 189L109 189L108 189L107 190L104 191L101 189L99 189L97 187L98 185L94 185L94 184L93 184L94 181L93 181L93 179L91 179L91 178L90 178L90 177L84 177L85 174L82 172L83 172L80 171L78 172L77 172L74 171L76 169L75 166L73 166L71 166L70 164L70 163L71 163L71 162L70 161L69 160L68 161L66 160L65 159L66 158L67 156L66 156L66 150L67 148L67 145L67 144L67 143L65 142L64 140L65 140L66 141L67 140L67 138L65 135L66 135L63 130L64 129L63 129L63 128L64 128L64 125L68 125L69 124L68 120L67 120L67 118L68 118L68 118L70 117L70 113L69 111L69 107L75 108L80 106L82 107L83 104L83 103L84 102L85 100L85 101L87 99L88 100L89 97L90 96L91 96L92 97L93 97L92 96L93 94L95 92L92 90L90 89L89 88L89 88L87 87L86 83L86 82L88 83L93 82L96 80L97 74L99 74L99 73L100 74Z"
              onClick={m.WP.pick}
              style={{
                fill: m.WP.fill,
                stroke: m.WP.stroke,
                strokeWidth: m.WP.sw,
                filter: m.WP.glow,
                cursor: 'pointer',
                transition: 'fill .6s',
              }}
            ></path>
            <path
              d="M85 177L90 177L90 178L91 178L91 179L93 179L93 181L94 181L93 183L93 184L98 185L97 187L99 189L101 189L104 191L107 190L108 189L109 189L110 189L113 189L113 186L114 185L117 185L122 186L125 189L125 191L123 193L124 198L127 198L130 199L130 198L131 198L130 201L132 203L131 208L133 210L128 212L126 210L126 212L124 212L125 214L125 216L125 217L124 217L123 220L124 222L120 223L120 226L119 226L118 225L118 227L119 227L119 228L119 229L117 230L117 231L117 231L118 233L117 233L115 233L114 234L116 235L114 237L113 237L113 238L114 238L113 239L114 242L110 243L107 247L108 248L107 251L104 250L103 251L101 252L100 254L102 255L103 259L105 260L106 262L105 263L106 264L105 265L104 264L104 265L101 265L101 266L100 266L95 272L91 269L90 264L86 259L84 259L83 256L81 256L81 257L79 254L78 254L78 253L78 252L80 250L81 250L82 249L83 249L85 248L84 247L85 246L85 246L86 245L83 240L80 240L79 240L78 242L77 242L77 241L74 240L73 243L71 243L70 243L71 242L70 239L70 238L66 239L64 235L61 236L57 234L54 234L51 232L49 234L49 230L46 227L46 225L46 224L46 222L44 221L43 222L42 220L41 220L41 222L40 222L40 221L38 220L38 220L37 220L36 220L35 222L36 222L37 223L36 226L36 228L31 228L30 228L33 224L36 214L36 212L38 207L37 205L36 203L35 201L37 201L37 199L39 199L39 197L43 195L43 196L45 196L48 198L48 195L49 195L49 193L50 191L53 192L53 192L57 195L56 196L57 196L58 194L59 195L60 192L61 192L61 190L65 189L64 187L66 184L65 183L67 180L69 180L70 179L70 178L70 178L70 177L71 176L74 178L77 178L76 181L78 181L80 183L83 181L84 178L85 177Z"
              onClick={m.DS.pick}
              style={{
                fill: m.DS.fill,
                stroke: m.DS.stroke,
                strokeWidth: m.DS.sw,
                filter: m.DS.glow,
                cursor: 'pointer',
                transition: 'fill .6s',
              }}
            ></path>
            <path
              d="M133 214L134 214L136 215L138 215L141 214L142 213L143 212L144 212L146 212L146 212L149 212L150 214L152 213L154 215L156 214L156 215L157 216L158 215L158 213L159 213L160 216L163 218L164 220L162 221L163 223L161 224L162 226L161 229L159 230L159 232L158 233L159 235L160 235L159 235L159 236L156 238L158 242L160 243L161 243L160 245L161 245L161 246L159 247L156 246L155 247L156 252L155 251L155 250L153 250L153 253L152 253L153 255L152 257L154 259L153 260L154 263L152 263L152 263L148 265L148 265L148 266L144 267L144 268L142 268L142 270L142 271L140 274L140 276L141 275L141 277L140 276L137 278L135 279L134 278L134 277L132 276L131 273L130 271L129 271L129 271L126 269L126 268L127 268L130 267L130 266L132 266L132 264L130 263L131 260L130 259L129 259L129 260L127 262L126 262L122 262L121 262L120 263L120 262L119 261L118 261L117 262L117 259L115 259L114 259L112 257L112 256L110 256L109 254L107 254L105 253L104 254L102 252L104 250L107 251L108 248L107 247L110 243L114 242L113 239L114 238L113 238L113 237L114 237L116 235L114 234L115 233L117 233L118 233L117 231L117 231L117 230L119 229L119 228L119 227L118 227L118 225L119 226L120 226L120 223L124 222L123 220L124 217L125 217L125 216L125 214L124 212L126 212L126 210L128 212L131 211L134 210L135 212L133 214Z"
              onClick={m.OP.pick}
              style={{
                fill: m.OP.fill,
                stroke: m.OP.stroke,
                strokeWidth: m.OP.sw,
                filter: m.OP.glow,
                cursor: 'pointer',
                transition: 'fill .6s',
              }}
            ></path>
            <path
              d="M191 226L190 227L191 228L194 226L196 228L197 228L198 230L200 230L200 229L203 230L203 232L201 231L201 232L202 233L200 235L199 234L199 234L199 236L200 237L202 236L202 238L204 238L203 241L206 241L205 243L204 242L202 246L206 247L206 248L207 249L208 250L205 251L206 252L204 252L204 253L199 252L198 254L196 254L192 254L191 255L191 257L190 256L191 258L191 259L190 259L189 259L188 262L186 263L190 264L188 266L186 267L187 269L184 269L184 270L183 271L183 270L182 274L180 274L178 277L179 279L178 280L178 280L180 281L181 280L181 284L180 285L180 286L181 284L184 285L185 290L187 290L188 291L189 290L190 292L187 294L189 296L190 295L191 298L187 302L187 303L184 303L182 305L182 307L181 309L181 310L179 311L177 310L175 311L174 311L173 310L174 309L173 308L173 305L172 304L169 304L170 302L169 302L168 295L165 295L164 294L163 294L161 293L162 291L160 286L161 285L159 284L160 282L159 281L158 283L157 283L155 281L152 280L151 282L150 281L149 279L147 279L147 277L146 277L145 278L144 278L143 275L141 274L142 271L142 270L142 268L143 267L144 268L144 267L148 266L148 265L148 265L152 263L152 263L154 263L153 260L154 259L152 257L153 255L152 253L153 253L153 250L155 250L155 251L156 252L155 247L156 246L159 247L161 246L161 245L160 245L161 243L160 243L158 242L156 238L159 236L159 235L160 235L159 235L158 233L159 232L159 230L161 229L162 226L161 224L163 223L162 221L164 220L163 218L170 217L170 218L172 216L174 217L176 219L178 219L179 221L180 221L179 221L182 222L183 221L183 219L186 218L185 220L187 221L187 222L188 222L191 226Z"
              onClick={m.SL.pick}
              style={{
                fill: m.SL.fill,
                stroke: m.SL.stroke,
                strokeWidth: m.SL.sw,
                filter: m.SL.glow,
                cursor: 'pointer',
                transition: 'fill .6s',
              }}
            ></path>
            <path
              d="M163 70L164 70L165 71L167 70L165 73L166 75L171 75L171 76L172 76L178 76L181 76L181 77L181 78L182 79L181 80L182 82L183 87L184 87L185 86L188 86L189 88L190 88L189 89L192 88L192 90L196 90L198 90L198 92L199 92L199 93L198 94L198 96L200 96L201 100L199 101L199 102L196 103L197 107L198 108L198 112L194 110L194 111L193 112L190 112L190 114L192 116L191 116L191 117L189 118L191 121L192 123L192 123L192 125L192 126L190 124L189 127L187 130L189 131L189 131L187 133L186 133L186 135L186 135L188 136L185 140L183 140L185 141L184 143L182 145L182 145L175 146L172 143L172 144L171 144L171 144L166 146L166 145L164 143L163 143L162 140L160 139L158 137L157 137L156 138L156 138L153 138L153 135L152 135L152 136L149 138L147 138L147 137L143 136L144 135L143 134L142 135L140 134L139 135L140 133L139 134L136 132L137 131L136 130L132 128L132 129L131 129L130 129L131 130L129 131L129 129L127 128L127 125L125 126L123 127L123 127L121 127L122 124L120 123L119 122L121 120L121 121L123 120L124 117L123 113L119 110L116 110L116 109L116 108L117 108L116 105L118 104L118 102L119 101L117 100L117 98L117 97L120 96L120 94L117 89L115 89L114 88L118 83L120 79L120 76L123 75L124 76L125 76L126 76L129 77L128 76L128 75L130 76L130 73L131 71L132 70L133 71L136 69L135 66L138 67L140 68L141 68L142 65L144 66L145 66L146 67L146 67L147 68L149 67L149 68L149 70L154 70L158 70L158 71L159 72L160 72L160 71L162 71L162 70L163 70Z"
              onClick={m.KP.pick}
              style={{
                fill: m.KP.fill,
                stroke: m.KP.stroke,
                strokeWidth: m.KP.sw,
                filter: m.KP.glow,
                cursor: 'pointer',
                transition: 'fill .6s',
              }}
            ></path>
            <path
              d="M209 214L208 217L210 217L211 218L210 223L210 223L207 222L207 220L205 220L205 218L203 223L204 225L200 230L198 230L197 228L196 228L194 226L192 228L191 228L189 223L188 222L187 222L187 221L185 220L186 218L183 219L183 221L182 222L179 221L180 221L179 221L178 219L176 219L174 217L172 216L170 218L170 217L163 218L161 217L160 216L159 213L158 213L158 215L156 216L156 214L154 215L152 213L150 214L149 212L146 212L146 206L144 206L144 204L142 202L144 201L145 199L146 200L147 197L146 196L148 196L151 198L152 197L153 194L152 191L153 188L152 188L152 186L152 186L153 185L152 184L152 183L154 182L155 178L154 177L155 176L155 175L156 175L156 173L157 173L158 174L160 174L164 175L164 173L166 169L164 167L165 167L165 165L165 165L165 163L165 161L166 161L167 162L168 162L170 160L172 161L173 158L171 158L172 154L175 153L178 154L177 152L178 152L178 150L176 150L176 146L178 146L180 146L182 145L182 145L182 145L184 143L185 143L185 144L185 144L186 146L189 146L190 145L192 146L191 147L192 148L196 149L197 151L198 149L200 150L202 149L204 150L205 148L207 148L208 150L210 151L210 151L212 152L211 154L212 156L214 157L216 159L218 158L218 161L217 161L218 162L216 164L219 167L217 168L217 169L219 168L220 169L220 170L221 170L222 168L223 169L224 168L225 169L226 171L228 171L230 175L230 175L228 175L229 176L229 179L231 180L232 182L230 184L227 184L227 183L225 182L222 184L222 185L223 186L224 189L225 189L225 190L224 193L226 193L227 192L227 195L226 196L226 198L224 198L223 203L222 204L222 206L222 208L220 207L218 207L218 207L217 207L218 209L217 210L215 210L215 210L213 210L210 210L209 211L210 212L209 214Z"
              onClick={m.LD.pick}
              style={{
                fill: m.LD.fill,
                stroke: m.LD.stroke,
                strokeWidth: m.LD.sw,
                filter: m.LD.glow,
                cursor: 'pointer',
                transition: 'fill .6s',
              }}
            ></path>
            <path
              d="M197 28L196 31L183 37L183 38L185 39L186 41L185 42L183 44L183 44L182 46L183 48L182 49L184 50L184 52L185 51L187 53L188 53L187 54L187 56L189 57L190 56L194 56L194 56L194 57L194 57L193 59L191 63L192 64L191 65L187 63L186 63L185 67L182 70L182 72L182 73L180 73L179 75L179 76L174 76L172 76L171 76L171 75L166 75L165 73L167 70L165 71L164 70L162 70L162 71L160 71L160 72L159 72L158 71L158 70L154 70L149 70L149 68L149 67L147 68L146 67L146 67L145 66L144 66L142 65L141 68L140 68L138 67L135 66L136 69L133 71L132 70L130 73L130 76L128 75L128 76L129 77L126 76L125 76L124 76L123 75L121 75L120 76L120 79L119 81L117 81L116 80L116 80L114 79L111 79L108 78L108 80L106 80L105 79L105 78L104 78L103 76L102 74L100 67L103 65L103 64L102 64L102 63L101 62L101 61L101 60L104 60L105 58L101 56L101 54L100 53L98 53L98 52L99 49L98 49L99 46L98 46L98 44L96 43L96 42L95 41L101 38L100 36L99 35L99 34L99 32L100 31L99 30L100 28L99 27L98 26L97 26L97 23L95 21L102 20L107 15L114 12L118 11L127 9L139 6L151 6L165 15L168 18L168 20L164 14L155 9L154 9L154 11L153 12L156 14L156 17L158 17L158 20L160 28L162 30L165 30L164 31L165 32L172 34L173 33L176 34L183 33L191 31L196 27L197 28Z"
              onClick={m.PM.pick}
              style={{
                fill: m.PM.fill,
                stroke: m.PM.stroke,
                strokeWidth: m.PM.sw,
                filter: m.PM.glow,
                cursor: 'pointer',
                transition: 'fill .6s',
              }}
            ></path>
            <path
              d="M305 32L306 33L305 34L305 36L302 38L300 37L299 38L298 38L296 39L295 42L297 45L299 45L300 47L300 48L299 48L299 50L301 51L302 54L305 58L305 60L303 62L302 66L300 67L299 69L298 68L295 70L294 72L292 71L288 74L285 77L280 80L279 81L278 80L275 80L274 83L267 81L258 83L259 84L258 84L258 84L258 85L252 86L245 90L243 89L242 89L240 90L240 91L239 91L238 93L235 91L233 92L232 95L230 95L230 96L229 96L228 96L227 96L227 96L225 95L222 99L220 100L221 100L221 101L219 101L215 100L214 101L212 100L208 101L206 99L206 97L205 97L203 99L203 101L201 100L200 96L198 96L198 94L199 93L199 92L198 92L198 90L196 90L192 90L192 88L189 89L190 88L189 88L188 86L185 86L184 87L183 87L182 82L181 80L182 79L181 78L181 77L179 76L179 75L180 73L182 73L182 72L182 70L185 67L186 63L187 63L191 65L192 64L191 63L193 59L194 57L194 57L194 56L194 56L190 56L189 57L187 56L187 54L188 53L187 53L185 51L184 52L184 50L182 49L183 48L182 46L183 44L183 44L185 42L186 41L185 39L183 38L183 37L196 31L197 28L220 30L231 32L234 32L259 35L305 32Z"
              onClick={m.WN.pick}
              style={{
                fill: m.WN.fill,
                stroke: m.WN.stroke,
                strokeWidth: m.WN.sw,
                filter: m.WN.glow,
                cursor: 'pointer',
                transition: 'fill .6s',
              }}
            ></path>
            <path
              d="M275 105L274 106L271 103L269 103L267 101L268 100L265 94L266 94L266 93L266 92L269 91L266 89L267 88L266 88L266 87L265 86L264 82L267 81L273 83L274 83L274 81L276 80L278 80L279 81L280 80L285 77L288 74L292 71L294 72L294 72L294 70L298 68L299 69L300 67L302 66L303 62L305 60L305 58L302 54L301 51L299 50L299 48L300 48L300 47L299 45L297 45L295 42L296 39L298 38L299 38L300 37L302 38L305 36L305 34L306 33L305 32L307 30L309 30L309 30L313 31L312 33L315 34L314 35L316 36L317 35L320 38L324 39L326 40L327 43L329 44L331 49L331 51L329 53L329 54L330 55L330 61L331 61L331 66L333 67L335 80L341 95L342 96L342 98L344 100L343 104L344 107L345 111L344 112L345 125L343 127L339 131L335 131L329 134L325 139L319 149L318 149L316 148L314 149L314 147L312 146L311 144L310 144L307 145L304 144L303 144L302 143L299 143L298 142L297 141L297 139L296 139L296 138L296 136L294 132L292 131L294 130L294 129L293 128L293 126L294 121L291 120L291 121L290 121L290 123L288 123L288 121L288 121L287 119L288 118L288 117L288 117L288 116L287 115L285 116L285 117L284 117L282 118L281 117L281 118L279 117L279 115L278 116L278 114L279 113L278 110L274 109L274 106L276 107L275 106L276 105L275 105Z"
              onClick={m.PD.pick}
              style={{
                fill: m.PD.fill,
                stroke: m.PD.stroke,
                strokeWidth: m.PD.sw,
                filter: m.PD.glow,
                cursor: 'pointer',
                transition: 'fill .6s',
              }}
            ></path>
            <path
              d="M278 114L278 116L279 115L279 117L281 118L281 117L282 118L284 117L285 117L285 116L288 116L288 118L287 119L288 121L288 121L288 123L290 123L290 121L291 121L291 120L294 121L293 126L293 128L294 129L294 130L292 131L294 132L296 136L296 138L296 139L297 139L297 141L298 142L299 143L302 143L303 144L304 144L307 145L310 144L311 144L312 146L314 147L314 149L316 148L317 149L315 152L314 153L313 155L312 155L312 156L310 157L311 159L311 159L309 159L309 162L307 161L305 161L302 158L300 160L301 162L299 164L299 163L297 163L296 161L295 161L294 163L290 165L289 164L289 163L288 163L287 165L283 164L283 165L282 165L279 164L277 166L274 167L273 168L275 171L273 174L275 174L276 176L274 178L273 178L272 179L274 180L274 182L272 185L270 185L269 187L268 186L268 185L266 184L265 184L266 186L265 186L266 187L266 188L267 189L272 190L273 192L273 194L274 195L272 198L271 197L270 199L273 201L272 204L270 205L273 206L271 207L272 208L271 210L271 217L270 218L269 219L268 219L267 217L266 217L262 218L261 218L260 219L261 219L259 220L257 219L256 216L249 217L249 214L247 212L248 211L246 209L245 212L244 212L243 213L243 212L241 210L239 212L237 211L237 213L236 213L234 212L233 213L232 211L233 210L230 208L228 208L227 206L227 206L226 204L227 203L226 203L224 202L223 201L224 198L226 198L226 196L227 195L227 192L226 193L224 193L225 190L225 189L224 189L223 186L222 185L222 185L223 183L225 182L227 183L227 184L230 184L231 183L232 180L229 179L229 176L228 175L230 175L230 175L228 171L226 171L225 169L224 168L223 169L222 168L221 170L220 170L220 169L219 168L217 169L217 168L219 167L216 164L218 162L217 161L218 161L218 158L216 159L214 157L212 156L211 154L212 152L210 151L210 151L208 150L207 148L205 148L204 150L202 149L200 150L198 149L198 151L196 151L196 149L192 148L191 147L192 146L190 145L189 146L186 146L186 145L184 144L185 144L184 143L185 141L183 141L184 140L185 140L188 136L186 135L186 135L186 133L187 133L189 131L189 131L187 130L189 127L190 124L192 126L192 125L192 123L192 123L191 121L189 118L191 117L191 116L192 116L190 114L190 112L193 112L194 111L194 110L198 112L198 111L198 108L197 107L196 103L197 103L201 100L203 101L203 99L205 97L206 97L206 99L208 101L212 100L214 101L215 100L219 101L221 101L221 100L220 100L222 99L225 95L227 96L227 96L228 96L229 96L230 96L230 95L232 95L234 92L235 91L238 93L239 91L240 91L240 90L243 89L245 90L252 86L258 85L258 84L258 84L259 84L258 83L265 82L264 84L266 87L266 88L267 88L266 89L269 91L266 92L266 93L266 94L265 94L268 100L267 101L269 103L271 103L274 106L275 105L276 105L275 106L276 107L274 106L274 108L276 110L278 110L279 113L278 114L278 114Z"
              onClick={m.MZ.pick}
              style={{
                fill: m.MZ.fill,
                stroke: m.MZ.stroke,
                strokeWidth: m.MZ.sw,
                filter: m.MZ.glow,
                cursor: 'pointer',
                transition: 'fill .6s',
              }}
            ></path>
            <path
              d="M200 229L204 225L203 223L205 218L205 220L207 220L207 222L210 223L210 223L211 218L210 217L208 217L208 213L210 212L209 211L211 210L213 210L215 210L215 210L217 210L218 209L217 207L218 207L218 207L220 207L222 208L222 206L222 204L223 203L224 202L226 203L227 203L226 204L227 206L227 206L228 208L230 208L233 210L232 211L233 213L234 212L236 213L237 213L237 211L239 212L241 210L243 212L243 213L244 212L245 212L246 209L248 211L247 212L249 214L249 217L256 216L257 219L259 220L262 218L262 218L267 217L268 219L269 219L271 217L272 218L271 220L272 221L272 225L273 232L272 238L271 239L270 241L269 240L267 243L264 248L262 248L259 250L259 252L253 254L253 255L250 258L250 259L248 257L246 259L242 260L241 260L240 260L238 262L236 261L232 266L231 265L229 267L228 266L223 266L223 265L222 265L223 264L220 262L221 262L221 261L221 260L219 259L219 258L220 257L218 253L218 251L216 249L213 250L212 249L210 249L208 248L207 249L206 248L206 247L202 246L204 242L205 243L206 241L203 241L204 238L202 238L202 236L200 237L199 236L199 234L199 234L200 235L202 233L201 232L201 231L202 232L203 231L200 229Z"
              onClick={m.SK.pick}
              style={{
                fill: m.SK.fill,
                stroke: m.SK.stroke,
                strokeWidth: m.SK.sw,
                filter: m.SK.glow,
                cursor: 'pointer',
                transition: 'fill .6s',
              }}
            ></path>
            <path
              d="M228 266L229 267L231 265L232 266L236 261L238 262L240 260L241 260L242 260L246 259L248 258L248 257L250 259L251 257L251 260L250 260L248 263L250 264L248 264L249 266L249 269L250 269L248 270L250 270L250 271L250 272L249 272L250 273L248 274L250 276L249 277L249 279L250 281L253 282L253 283L251 284L252 286L254 286L256 288L254 289L253 288L252 290L252 291L254 291L255 293L254 294L255 295L255 296L256 298L255 300L256 301L256 303L257 303L258 306L257 306L258 307L257 308L257 309L253 307L250 311L248 309L247 310L245 310L245 311L247 312L247 313L245 313L243 315L243 316L241 316L240 315L239 315L239 314L237 314L236 312L235 312L235 311L234 310L231 311L230 310L229 312L225 310L224 310L223 311L222 311L222 310L220 311L220 314L216 314L215 315L214 316L214 316L212 323L208 320L206 320L204 322L202 322L200 321L202 318L203 318L202 316L202 310L200 310L200 311L196 310L196 308L196 308L194 308L193 303L193 301L190 300L191 296L190 295L189 296L187 294L190 292L189 291L189 290L188 291L187 290L185 290L184 285L181 284L180 286L180 285L181 284L181 280L178 281L178 280L179 279L178 277L179 275L182 274L183 270L183 271L184 270L184 269L187 269L186 267L188 266L190 264L186 263L188 262L189 259L190 259L191 259L191 258L190 256L191 257L191 255L192 254L196 254L198 254L199 252L204 253L204 252L206 252L205 251L208 250L207 249L208 248L210 249L212 249L213 250L216 249L218 251L218 253L220 257L219 258L219 259L220 259L221 261L221 261L220 262L223 264L222 265L223 265L223 266L228 266Z"
              onClick={m.MA.pick}
              style={{
                fill: m.MA.fill,
                stroke: m.MA.stroke,
                strokeWidth: m.MA.sw,
                filter: m.MA.glow,
                cursor: 'pointer',
                transition: 'fill .6s',
              }}
            ></path>
            <path
              d="M274 169L273 168L274 167L277 166L279 164L282 165L283 165L283 164L287 165L288 163L289 163L289 164L290 165L291 164L293 164L295 161L296 161L297 163L299 163L299 164L301 162L300 160L302 158L305 161L307 161L309 162L309 159L311 159L311 159L310 157L312 156L312 155L313 155L314 153L315 152L317 149L319 150L319 152L325 153L327 155L328 155L330 155L329 156L331 158L333 158L335 160L336 166L334 168L335 169L334 170L334 171L333 172L333 174L335 176L334 177L333 178L332 178L331 180L332 182L332 184L331 184L331 188L332 190L332 191L333 191L334 192L334 193L336 194L335 196L336 196L337 198L334 203L335 205L337 205L338 209L342 212L342 216L343 217L344 217L345 220L344 220L346 222L346 224L349 227L352 228L350 230L347 230L346 233L346 234L348 234L348 237L350 237L349 239L350 240L350 246L348 252L347 253L347 254L340 254L338 256L337 256L336 259L334 259L334 260L331 263L330 263L330 261L330 260L326 260L328 258L326 257L325 255L326 254L325 254L321 257L319 255L313 261L306 260L302 261L299 260L299 258L302 258L302 257L298 258L298 257L296 258L294 256L293 255L292 255L292 254L293 254L294 253L293 251L295 252L296 251L296 252L298 250L296 250L298 249L297 249L296 247L296 247L296 246L296 244L292 244L290 243L287 242L286 240L283 240L285 235L283 234L284 232L280 231L276 234L274 234L272 225L272 221L271 220L272 218L271 216L270 211L272 208L271 207L273 206L270 205L272 204L273 201L270 199L271 197L272 198L274 195L273 194L273 192L272 190L267 189L266 188L266 187L265 186L266 186L265 184L266 184L268 185L268 186L269 187L270 185L272 185L273 183L274 183L274 182L272 179L273 179L276 176L275 174L273 174L275 171L274 169Z"
              onClick={m.LU.pick}
              style={{
                fill: m.LU.fill,
                stroke: m.LU.stroke,
                strokeWidth: m.LU.sw,
                filter: m.LU.glow,
                cursor: 'pointer',
                transition: 'fill .6s',
              }}
            ></path>
            <path
              d="M297 257L302 257L302 258L299 258L299 260L302 261L306 260L313 261L319 255L321 257L325 254L326 254L325 255L326 257L328 258L326 260L330 260L330 261L330 263L331 263L322 272L312 286L311 286L309 291L306 294L300 304L300 305L302 306L304 313L304 319L303 321L304 321L302 324L304 323L303 324L305 325L305 326L309 328L308 330L309 333L307 333L307 332L304 330L304 331L303 330L302 331L298 328L295 328L294 328L293 328L291 325L289 326L286 325L286 323L285 324L283 322L279 321L279 318L277 316L277 314L273 313L272 311L271 312L270 313L268 310L266 310L265 308L264 309L263 309L261 310L260 309L260 310L258 310L257 309L257 308L258 307L257 306L258 306L257 303L256 303L256 301L255 300L256 298L255 296L255 295L254 294L255 293L254 291L252 291L252 290L253 288L254 289L256 288L254 286L252 286L251 284L253 283L253 282L250 281L249 280L249 278L250 276L248 274L250 273L249 272L250 272L250 271L250 270L248 270L250 269L249 269L249 266L248 264L250 264L248 263L250 260L251 260L251 257L254 254L259 252L259 250L262 248L264 248L268 241L269 240L270 241L271 239L272 238L273 232L274 234L276 234L280 231L284 232L283 234L285 234L283 240L286 240L287 242L290 243L292 244L294 244L296 245L296 247L296 247L297 249L298 249L296 250L298 250L296 252L296 251L295 252L293 251L294 253L293 254L292 254L292 255L293 255L295 257L296 258L297 257Z"
              onClick={m.PK.pick}
              style={{
                fill: m.PK.fill,
                stroke: m.PK.stroke,
                strokeWidth: m.PK.sw,
                filter: m.PK.glow,
                cursor: 'pointer',
                transition: 'fill .6s',
              }}
            ></path>
          </svg>
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: userLeft,
              top: userTop,
              width: '14px',
              height: '14px',
              margin: '-7px 0 0 -7px',
              borderRadius: '7px',
              background: '#5AAAFF',
              border: '2px solid #0B0A0D',
              boxSizing: 'border-box',
              animation: 'schronPulse 1.8s infinite',
            }}
          ></span>
          {(dots || []).map((d, dIndex) => (
            <Fragment key={dIndex}>
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: `${d.l}%`,
                  top: `${d.t}%`,
                  width: '8px',
                  height: '8px',
                  margin: '-4px 0 0 -4px',
                  boxSizing: 'border-box',
                  borderRadius: d.radius,
                  background: d.c,
                  border: '1.5px solid #0B0A0D',
                  transform: d.rot,
                  pointerEvents: 'none',
                }}
              ></span>
            </Fragment>
          ))}
          {(counts || []).map((ct, ctIndex) => (
            <Fragment key={ctIndex}>
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: `${ct.l}%`,
                  top: `${ct.t}%`,
                  transform: 'translate(-50%, -50%)',
                  padding: '3px 8px',
                  borderRadius: '10px',
                  background: 'rgba(14,12,17,.85)',
                  border: '1px solid rgba(255,255,255,.16)',
                  color: '#F2EFF3',
                  fontSize: '11px',
                  fontWeight: '800',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <svg width="10" height="10" viewBox="0 0 72 64" fill="none" aria-hidden="true">
                  <path d="M10 56V28L36 8L62 28V56" stroke="#F2EFF3" strokeWidth="8" strokeLinejoin="round"></path>
                </svg>
                {ct.n}
              </span>
            </Fragment>
          ))}
          {(labels || []).map((k, kIndex) => (
            <Fragment key={kIndex}>
              <button
                type="button"
                onClick={k.pick}
                aria-label={k.aria}
                style={{
                  position: 'absolute',
                  left: `${k.l}%`,
                  top: `${k.t}%`,
                  height: '44px',
                  margin: '-22px 0 0 0',
                  transform: 'translateX(-50%)',
                  border: '0',
                  padding: '0 2px',
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 7px 3px 6px',
                    borderRadius: '9px',
                    background: 'rgba(14,12,17,.78)',
                    border: '1px solid rgba(255,255,255,.14)',
                    color: '#E9E4EA',
                    fontWeight: '700',
                    fontSize: '11px',
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '3px',
                      background: k.color,
                    }}
                  ></span>
                  {k.name}
                </span>
              </button>
            </Fragment>
          ))}
        </div>
        {mapSmall && (
          <>
            <button
              type="button"
              onClick={openMap}
              aria-label={t('Otwórz mapę na pełnym ekranie')}
              style={{
                position: 'absolute',
                left: '0',
                top: '0',
                width: '100%',
                height: '100%',
                border: '0',
                padding: '10px',
                background: 'transparent',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-end',
                cursor: 'zoom-in',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  borderRadius: '10px',
                  background: 'rgba(22,20,26,.9)',
                  border: '1px solid #2C2830',
                  color: '#DCD5DD',
                  fontSize: '12px',
                  fontWeight: '700',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"></path>
                </svg>
                {t('Powiększ')}
              </span>
              {offline && (
                <>
                  <span
                    style={{
                      position: 'absolute',
                      left: '10px',
                      bottom: '10px',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      background: 'rgba(22,20,26,.9)',
                      border: '1px solid #2C2830',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#C9C1CB',
                    }}
                  >
                    {offlineLabel}
                  </span>
                </>
              )}
            </button>
          </>
        )}
      </div>
      {mapFull && (
        <>
          <div
            style={{
              flex: '1',
              overflowY: 'auto',
              overflowX: 'hidden',
              scrollbarWidth: 'none',
              padding: '14px 16px 24px',
              borderTop: '1px solid #1F1C24',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                borderRadius: '14px',
                padding: '14px 16px',
                background: '#17151A',
                border: '1px solid #222026',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <span
                  style={{
                    fontSize: '16px',
                    fontWeight: '800',
                  }}
                >
                  {reg.name}
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    color: '#A49DA6',
                  }}
                >
                  {reg.where}
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#DCD5DD',
                  }}
                >
                  {reg.shelters}
                </span>
              </div>
              <span
                style={{
                  padding: '6px 10px',
                  borderRadius: '10px',
                  background: reg.bg,
                  color: reg.fg,
                  fontSize: '13px',
                  fontWeight: '800',
                  whiteSpace: 'nowrap',
                }}
              >
                {reg.badge}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '12px 14px',
                borderRadius: '14px',
                background: '#17151A',
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: '800',
                }}
              >
                {shelterSummary}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: '#9C95A0',
                }}
              >
                {zoomHint}
              </span>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px 14px',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: '#C9C1CB',
                  }}
                >
                  <span
                    style={{
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      background: '#7CC4FF',
                    }}
                  ></span>
                  {t('Całodobowe 24/7')}
                </span>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: '#C9C1CB',
                  }}
                >
                  <span
                    style={{
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      background: '#C9B8FF',
                    }}
                  ></span>
                  {t('Otwierane przy alarmie')}
                </span>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: '#C9C1CB',
                  }}
                >
                  <span
                    style={{
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      background: '#9C95A0',
                    }}
                  ></span>
                  {t('Schron')}
                </span>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: '#C9C1CB',
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '1px',
                      background: '#9C95A0',
                      transform: 'rotate(45deg)',
                    }}
                  ></span>
                  {t('Miejsce przystosowane (parking, piwnica, przejście)')}
                </span>
              </div>
            </div>
            <span
              style={{
                fontSize: '13px',
                fontWeight: '700',
                color: '#A49DA6',
              }}
            >
              {t('Województwa z zagrożeniem')}
            </span>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              {(marks || []).map((c, cIndex) => (
                <Fragment key={cIndex}>
                  <button
                    type="button"
                    onClick={c.pick}
                    style={{
                      minHeight: '40px',
                      padding: '0 12px',
                      borderRadius: '10px',
                      background: '#16141A',
                      border: `1px solid ${c.chipBorder}`,
                      color: '#F4F1F2',
                      fontSize: '13px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '4px',
                        background: c.color,
                      }}
                    ></span>
                    {c.name}
                  </button>
                </Fragment>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
