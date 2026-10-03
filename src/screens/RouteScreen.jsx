/**
 * Route to a shelter: turn hint, map with the path and shelter card. Shows a reassessment if the shelter has closed.
 */
import { Fragment } from 'react';
import StatusBadge from '@/components/StatusBadge.jsx';
import StreetMap from '@/components/StreetMap.jsx';
import chronApi from '@/api/chronApi.js';

/** Builds view data (texts, colors, handlers) from props. */
function buildViewModel(props) {
  const api = chronApi;
  const s = props.store || {},
    a = props.actions || {},
    params = props.params || {};
  const rec = api.getRecommendation(s);
  const stale = s.system === 'offline' || s.system === 'recovering';
  const requested = api.getShelter(params.id || (rec.primary && rec.primary.id) || 's12', s);
  // If the shelter can no longer be recommended, never keep routing to it silently; show the reassessment.
  const rerouted = requested.status === 'closed' && rec.primary && rec.primary.id !== requested.id;
  const sel = rerouted ? rec.primary : requested;
  const route = api.getRoute(sel.id, s);
  const emergency = s.level !== 'green';
  const threat = emergency ? api.getThreat(s.threatId, s) : null;
  const pool = emergency
    ? rec.options
    : api
        .getShelters(s)
        .filter((x) => {
          return x.status === 'open';
        })
        .slice(0, 4);
  const others = pool
    .filter((o) => {
      return o.id !== sel.id;
    })
    .slice(0, 2)
    .map((o) => {
      return Object.assign({}, o, {
        open: function () {
          a.openRoute(o.id);
        },
      });
    });
  const isRec = emergency && rec.primary && rec.primary.id === sel.id;
  return {
    sel,
    route,
    rec,
    pins: (emergency
      ? rec.options.concat(sel.id === (rec.primary || {}).id ? [] : [sel])
      : [sel].concat(others)
    ).concat(rerouted ? [requested] : []),
    level: s.level,
    zone: threat ? threat.zone : '',
    stale,
    offlineLabel: stale ? 'Trasa zapisana offline' : '',
    routeSub: stale
      ? route.cachedLabel
      : threat
        ? threat.title + ' · ' + (s.level === 'red' ? 'RED' : 'YELLOW')
        : 'Trasa piesza',
    hasReassess: !!rec.reassessment && (rerouted || sel.id === rec.reassessment.newId),
    reassess: rec.reassessment || {},
    navigating: !!s.navigating,
    isRec,
    showReason: isRec,
    thirdLabel: emergency ? 'Zagrożenie za' : 'Status',
    thirdValue: emergency ? sel.ttr : sel.statusLabel,
    canReach: emergency && sel.canReach === true && sel.status !== 'closed',
    cantReach: emergency && sel.canReach === false,
    others,
    hasOthers: others.length > 0,
    othersTitle: threat ? threat.othersTitle : 'Inne schrony',
    navBtnText: s.navigating ? 'Zakończ nawigację' : 'Rozpocznij nawigację',
    navBtnBg: s.navigating ? '#4A1A22' : '#E3203A',
    toggleNav: function () {
      a.toggleNavigating();
    },
    pick: function (id) {
      a.openShelter(id);
    },
    goLate: function () {
      a.openLate();
    },
    back: function () {
      a.back();
    },
  };
}

/**
 * Route to a shelter.
 *
 * @param {object} props
 * @param {AppStore} props.store — global app state
 * @param {AppActions} props.actions — controller actions (navigation, settings)
 * @param {{id?: string}} props.params — params of the open screen from the navigation stack
 */
export default function RouteScreen(inputProps) {
  const props = inputProps;
  const {
    back,
    canReach,
    cantReach,
    goLate,
    hasOthers,
    hasReassess,
    isRec,
    level,
    navBtnBg,
    navBtnText,
    navigating,
    offlineLabel,
    others,
    othersTitle,
    pick,
    pins,
    reassess,
    rec,
    route,
    routeSub,
    sel,
    showReason,
    stale,
    thirdLabel,
    thirdValue,
    toggleNav,
    zone,
  } = buildViewModel(props);
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
      <header style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px 16px 12px' }}>
        <button
          type="button"
          onClick={back}
          aria-label="Wstecz"
          style={{
            width: '44px',
            height: '44px',
            flex: 'none',
            borderRadius: '22px',
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
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 5l-7 7 7 7"></path>
          </svg>
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontFamily: "'Unbounded', 'Arial Black', sans-serif", fontWeight: '500', fontSize: '18px' }}>
            Trasa
          </span>
          <span style={{ fontSize: '12px', color: '#A49DA6' }}>{routeSub}</span>
        </div>
      </header>
      <div
        style={{
          flex: '1',
          minHeight: '0',
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
          padding: '4px 16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {hasReassess && (
          <>
            <section
              role="alert"
              style={{
                flex: 'none',
                padding: '14px 16px',
                borderRadius: '16px',
                background: 'rgba(227,32,58,.12)',
                border: '1px solid #E3203A',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                animation: 'chronIn .45s ease both, chronAttention 1.2s ease 2',
              }}
            >
              <span
                style={{
                  width: '32px',
                  height: '32px',
                  flex: 'none',
                  borderRadius: '16px',
                  background: '#E3203A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4"></path>
                </svg>
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '15px', fontWeight: '800', lineHeight: '1.35' }}>{reassess.title}</span>
                <span style={{ fontSize: '13px', lineHeight: '1.45', color: '#DCD5DD' }}>
                  Trasa przeliczona. {reassess.text}
                </span>
              </span>
            </section>
          </>
        )}
        {navigating && (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                borderRadius: '14px',
                background: '#E3203A',
                color: '#FFFFFF',
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 20V6M6 12l6-6 6 6"></path>
              </svg>
              <span style={{ fontSize: '15px', fontWeight: '800', lineHeight: '1.35' }}>{sel.nav}</span>
            </div>
          </>
        )}
        <StreetMap
          pins={pins}
          highlightId={sel.id}
          routeD={route.pathD}
          routeDashed={false}
          zone={zone}
          zoneLevel={level}
          offlineLabel={offlineLabel}
          stale={stale}
          onPin={pick}
        />
        <section
          style={{
            borderRadius: '18px',
            padding: '18px',
            background: '#17151A',
            border: '1px solid #222026',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '0' }}>
              <span
                style={{ fontFamily: "'Unbounded', 'Arial Black', sans-serif", fontWeight: '500', fontSize: '18px' }}
              >
                {sel.name}
              </span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#DCD5DD' }}>{sel.typeLabel}</span>
              <span style={{ fontSize: '13px', color: '#A49DA6' }}>{sel.address}</span>
            </div>
            {isRec && (
              <>
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: '8px',
                    background: '#1F3B31',
                    color: '#9FE0C6',
                    fontSize: '11px',
                    fontWeight: '800',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Polecamy
                </span>
              </>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
            <div
              style={{
                background: '#1F1C24',
                borderRadius: '12px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <span style={{ fontSize: '12px', color: '#A49DA6' }}>Pieszo</span>
              <span style={{ fontSize: '18px', fontWeight: '800' }}>{sel.walk} min</span>
            </div>
            <div
              style={{
                background: '#1F1C24',
                borderRadius: '12px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <span style={{ fontSize: '12px', color: '#A49DA6' }}>Dystans</span>
              <span style={{ fontSize: '18px', fontWeight: '800' }}>{sel.dist} m</span>
            </div>
            <div
              style={{
                background: '#1F1C24',
                borderRadius: '12px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <span style={{ fontSize: '12px', color: '#A49DA6' }}>{thirdLabel}</span>
              <span style={{ fontSize: '15px', fontWeight: '800' }}>{thirdValue}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
            <StatusBadge kind={sel.status} size="sm" />
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '8px',
                background: '#24212A',
                fontSize: '12px',
                fontWeight: '700',
                color: sel.hoursColor,
              }}
            >
              {sel.hoursLabel}
            </span>
            <span style={{ fontSize: '12px', color: '#A49DA6' }}>{sel.statusNote}</span>
          </div>
          {showReason && (
            <>
              <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.45', color: '#DCD5DD' }}>{rec.reason}</p>
            </>
          )}
          {canReach && (
            <>
              <span
                style={{
                  alignSelf: 'flex-start',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  background: 'rgba(79,209,165,.13)',
                  color: '#86CDB2',
                  fontSize: '13px',
                  fontWeight: '800',
                }}
              >
                Zdążysz przed zagrożeniem
              </span>
            </>
          )}
          {cantReach && (
            <>
              <button
                type="button"
                onClick={goLate}
                style={{
                  minHeight: '48px',
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #3A3540',
                  background: '#17151A',
                  color: '#F2EFF3',
                  fontSize: '14px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Nie zdążysz przed zagrożeniem — schroń się na miejscu →
              </button>
            </>
          )}
        </section>
        {hasOthers && (
          <>
            <span style={{ fontSize: '15px', fontWeight: '800' }}>{othersTitle}</span>
          </>
        )}
        {(others || []).map((o, oIndex) => (
          <Fragment key={oIndex}>
            <button
              type="button"
              onClick={o.open}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                boxSizing: 'border-box',
                borderRadius: '14px',
                background: '#17151A',
                border: '1px solid #222026',
                color: '#F4F1F2',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <span
                style={{
                  minWidth: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: '#4FD1A5',
                  color: '#04170F',
                  fontWeight: '800',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {o.num}
              </span>
              <span style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '0' }}>
                <span style={{ fontSize: '14px', fontWeight: '800' }}>
                  {o.name} · {o.kind}
                </span>
                <span
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '10px',
                    fontSize: '12px',
                    color: '#A49DA6',
                  }}
                >
                  <span>
                    {o.walk} min · {o.statusLabel}
                  </span>
                  <span>{o.hoursLabel}</span>
                </span>
              </span>
            </button>
          </Fragment>
        ))}
      </div>
      <div
        style={{
          padding: '12px 16px 24px',
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr',
          gap: '10px',
          borderTop: '1px solid #1F1C24',
        }}
      >
        <button
          type="button"
          onClick={toggleNav}
          style={{
            minHeight: '56px',
            border: '0',
            borderRadius: '16px',
            background: navBtnBg,
            color: '#FFFFFF',
            fontWeight: '800',
            fontSize: '15px',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {navBtnText}
        </button>
        <button
          type="button"
          onClick={goLate}
          style={{
            minHeight: '56px',
            borderRadius: '16px',
            border: '1px solid #3A3540',
            background: '#17151A',
            color: '#F2EFF3',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Nie zdążę
        </button>
      </div>
    </div>
  );
}
