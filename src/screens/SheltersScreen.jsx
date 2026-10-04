/**
 * Shelter list with type filters and a recommendation for the current threat.
 */
import { Fragment } from 'react';
import useMergedState from '@/hooks/useMergedState.js';
import ShelterRow from '@/components/ShelterRow.jsx';
import StreetMap from '@/components/StreetMap.jsx';
import chronApi from '@/api/chronApi.js';
import { t } from '@/i18n/index.js';
const FILTERS = [
  [
    'all',
    'Wszystkie',
    function () {
      return true;
    },
  ],
  [
    'open',
    'Otwarte teraz',
    function (s) {
      return s.status === 'open';
    },
  ],
  [
    'h247',
    'Całodobowe 24/7',
    function (s) {
      return s.hours === '24/7';
    },
  ],
  [
    'alarm',
    'Przy alarmie',
    function (s) {
      return s.hours === 'alarm';
    },
  ],
  [
    'adapted',
    'Przystosowane',
    function (s) {
      return s.category === 'przystosowane';
    },
  ],
];

/** Builds view data (texts, colors, handlers) from props and local state. */
function buildViewModel(props, state, setState) {
  const api = chronApi;
  const s = props.store || {},
    a = props.actions || {};
  const rec = api.getRecommendation(s);
  const recId = s.level !== 'green' && rec.primary ? rec.primary.id : '';
  const stale = s.system === 'offline' || s.system === 'recovering';
  const test = FILTERS.find((f) => {
    return f[0] === state.filter;
  })[2];
  const threat = s.level !== 'green' ? api.getThreat(s.threatId, s) : null;
  const list = api
    .getShelters(s)
    .filter(test)
    .map((x) => {
      return Object.assign({}, x, {
        isRec: x.id === recId,
      });
    });
  return {
    sub: chronApi.getPlace(s).city + t(' · najbliższe schronienia'),
    filters: FILTERS.map((f) => {
      const on = f[0] === state.filter;
      return {
        label: t(f[1]),
        pressed: on ? 'true' : 'false',
        bg: on ? '#2C2930' : 'transparent',
        border: on ? '#F2EFF3' : '#3A3540',
        fg: on ? '#FFFFFF' : '#9C95A0',
        pick: function () {
          setState({
            filter: f[0],
          });
        },
      };
    }),
    list,
    isEmpty: !list.length,
    recId,
    level: s.level,
    zone: threat ? threat.zone : '',
    count: list.length + t(' obiektów'),
    note: stale ? t('statusy z ') + api.getOfflineSince(s) : t('posortowane wg odległości'),
    stale,
    offlineLabel: stale ? t('Mapa offline · Safety Pack') : '',
    showReach: s.level !== 'green',
    showSuit: s.level !== 'green',
    open: function (id) {
      a.openShelter(id);
    },
  };
}

/**
 * Shelter list with type filters and a recommendation for the current threat.
 *
 * @param {object} props
 * @param {AppStore} props.store — global app state
 * @param {AppActions} props.actions — controller actions (navigation, settings)
 */
export default function SheltersScreen(inputProps) {
  const props = inputProps;
  const [state, setState] = useMergedState({
    filter: 'all',
  });
  const {
    count,
    filters,
    isEmpty,
    level,
    list,
    note,
    offlineLabel,
    open,
    recId,
    showReach,
    showSuit,
    stale,
    sub,
    zone,
  } = buildViewModel(props, state, setState);
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#0B0A0D',
        color: '#F4F1F2',
        fontFamily: "'Manrope', system-ui, sans-serif",
        animation: 'chronIn .35s ease both',
      }}
    >
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          padding: '20px 16px 12px',
        }}
      >
        <span
          style={{
            fontFamily: "'Unbounded', 'Arial Black', sans-serif",
            fontWeight: '500',
            fontSize: '18px',
          }}
        >
          {t('Schrony')}
        </span>
        <span
          style={{
            fontSize: '12px',
            color: '#A49DA6',
          }}
        >
          {sub}
        </span>
      </header>
      <div
        style={{
          flex: '1',
          minHeight: '0',
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
          padding: '4px 16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
          }}
        >
          {(filters || []).map((f, fIndex) => (
            <Fragment key={fIndex}>
              <button
                type="button"
                onClick={f.pick}
                aria-pressed={f.pressed}
                style={{
                  minHeight: '36px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: `1px solid ${f.border}`,
                  background: f.bg,
                  color: f.fg,
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {f.label}
              </button>
            </Fragment>
          ))}
        </div>
        <StreetMap
          pins={list}
          highlightId={recId}
          showRoute={false}
          zone={zone}
          zoneLevel={level}
          offlineLabel={offlineLabel}
          stale={stale}
          onPin={open}
        />
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
              color: '#B9B1BB',
            }}
          >
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '4px',
                background: '#4FD1A5',
              }}
            ></span>
            {t('OTWARTE')}
          </span>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#B9B1BB',
            }}
          >
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '4px',
                background: '#F2A33A',
              }}
            ></span>
            {t('BRAK POTWIERDZENIA')}
          </span>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#B9B1BB',
            }}
          >
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '4px',
                background: '#4A4550',
              }}
            ></span>
            {t('ZAMKNIĘTE')}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <span
            style={{
              fontSize: '16px',
              fontWeight: '800',
            }}
          >
            {count}
          </span>
          <span
            style={{
              fontSize: '12px',
              color: '#A49DA6',
            }}
          >
            {note}
          </span>
        </div>
        {(list || []).map((s, sIndex) => (
          <Fragment key={sIndex}>
            <ShelterRow
              shelter={s}
              isRec={s.isRec}
              showReach={showReach}
              showSuit={showSuit}
              stale={stale}
              onOpen={open}
            />
          </Fragment>
        ))}
        {isEmpty && (
          <>
            <p
              style={{
                margin: '0',
                padding: '16px',
                borderRadius: '14px',
                background: '#17151A',
                fontSize: '14px',
                color: '#C9C1CB',
              }}
            >
              {t('Brak obiektów dla wybranego filtra.')}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
