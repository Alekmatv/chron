/**
 * Emergency screen at the red level: what is happening, what to do, where to go and how to get there. The primary action is to build a route.
 */
import { Fragment } from 'react';
import StatusBadge from '@/components/StatusBadge.jsx';
import StreetMap from '@/components/StreetMap.jsx';
import chronApi from '@/api/chronApi.js';

/** Builds view data (texts, colors, handlers) from props. */
function buildViewModel(props) {
  const api = chronApi;
  const s = props.store || {},
    a = props.actions || {};
  const threat = api.getThreat(s.threatId, s, 'red');
  const rec = api.getRecommendation(s);
  const stale = s.system === 'offline' || s.system === 'recovering';
  const selId = rec.options.some((o) => {
    return o.id === s.selectedShelterId;
  })
    ? s.selectedShelterId
    : rec.primary
      ? rec.primary.id
      : null;
  const sel =
    rec.options.find((o) => {
      return o.id === selId;
    }) || {};
  const route = selId ? api.getRoute(selId, s) : { pathD: '', nav: '' };
  const options = rec.options.map((o) => {
    const on = o.id === selId;
    return Object.assign({}, o, {
      pressed: on ? 'true' : 'false',
      bg: on ? '#1C1A20' : '#16141A',
      border: on ? '#F2EFF3' : '#222026',
      reachBg: o.canReach ? 'rgba(79,209,165,.13)' : 'rgba(255,122,133,.13)',
      reachColor: o.canReach ? '#86CDB2' : '#FF8A95',
      pick: function () {
        a.selectShelter(o.id);
      },
    });
  });
  return {
    threat,
    rec,
    options,
    sel,
    route,
    stale,
    freshLabel: stale ? threat.freshness.label : '',
    hasOptions: !rec.none,
    noOptions: rec.none,
    hasReassess: !!rec.reassessment,
    reassess: rec.reassessment || {},
    offlineLabel: stale ? 'Trasa zapisana offline' : '',
    pickPin: function (id) {
      a.selectShelter(id);
    },
    goRoute: function () {
      if (selId) a.openRoute(selId);
      else a.openLate();
    },
    goLate: function () {
      a.openLate();
    },
    minimize: function () {
      a.minimizeEmergency();
    },
  };
}

/**
 * Emergency screen at the red level.
 *
 * @param {object} props
 * @param {AppStore} props.store — global app state
 * @param {AppActions} props.actions — controller actions (navigation, settings)
 */
export default function EmergencyScreen(inputProps) {
  const props = inputProps;
  const {
    freshLabel,
    goLate,
    goRoute,
    hasOptions,
    hasReassess,
    minimize,
    noOptions,
    offlineLabel,
    options,
    pickPin,
    reassess,
    rec,
    route,
    sel,
    stale,
    threat,
  } = buildViewModel(props);
  return (
    <div
      role="alert"
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
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '18px 16px 10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg
            width="30"
            height="27"
            viewBox="0 0 72 64"
            fill="none"
            aria-hidden="true"
            style={{ animation: 'schronGlow 2.8s ease-in-out infinite', overflow: 'visible' }}
          >
            <path
              d="M10 56V28L36 8L62 28V56"
              stroke="#FF2D3D"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            ></path>
            <path d="M24 56V42a12 12 0 0 1 24 0V56" stroke="#FF2D3D" strokeWidth="5" strokeLinecap="round"></path>
            <circle cx="36" cy="27" r="3.4" fill="#FF2D3D"></circle>
          </svg>
          <StatusBadge kind="red" label="RED · ALARM" size="md" />
        </div>
        <button
          type="button"
          onClick={minimize}
          style={{
            minHeight: '40px',
            padding: '0 12px',
            borderRadius: '12px',
            background: '#17151A',
            border: '1px solid #222026',
            color: '#DCD5DD',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Mapa i ustawienia
        </button>
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
        <section
          aria-labelledby="q1"
          style={{
            flex: 'none',
            borderRadius: '20px',
            background: '#17151A',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '16px 18px',
              background: 'rgba(200,50,63,.16)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <span id="q1" style={{ fontSize: '12px', fontWeight: '800', letterSpacing: '0.1em', color: '#FF7A85' }}>
              1 · CO SIĘ DZIEJE?
            </span>
            <span
              style={{
                fontFamily: "'Unbounded', 'Arial Black', sans-serif",
                fontWeight: '700',
                fontSize: '24px',
                lineHeight: '1.15',
                color: '#FFFFFF',
                textTransform: 'uppercase',
              }}
            >
              {threat.title}
            </span>
            <span
              style={{
                fontSize: '15px',
                fontWeight: '800',
                color: '#FF7A85',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
              }}
            >
              Zagrożenie: {threat.kind}
            </span>
            <span style={{ fontSize: '15px', lineHeight: '1.45', color: '#F4E4E6' }}>Powód: {threat.reason}</span>
            <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#C9C1CB' }}>
                Źródło: {threat.source} · {threat.sourceTime} · aktualizacja {threat.updated}
              </span>
              <StatusBadge kind={threat.freshness.key} label={freshLabel} size="sm" />
            </span>
          </div>
          <div
            style={{
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#9C95A0' }}>Do zagrożenia (szacunek)</span>
            <span
              style={{
                fontFamily: "'Unbounded', 'Arial Black', sans-serif",
                fontWeight: '700',
                fontSize: '24px',
                color: '#FFFFFF',
              }}
            >
              {threat.ttr}
            </span>
          </div>
        </section>
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
                <span style={{ fontSize: '13px', lineHeight: '1.45', color: '#DCD5DD' }}>{reassess.text}</span>
              </span>
            </section>
          </>
        )}
        <section
          aria-labelledby="q2"
          style={{
            flex: 'none',
            borderRadius: '20px',
            background: '#17151A',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <span id="q2" style={{ fontSize: '12px', fontWeight: '800', letterSpacing: '0.1em', color: '#9C95A0' }}>
            2 · CO MAM ZROBIĆ?
          </span>
          <span
            style={{
              fontFamily: "'Unbounded', 'Arial Black', sans-serif",
              fontWeight: '700',
              fontSize: '20px',
              lineHeight: '1.2',
              color: '#FFFFFF',
            }}
          >
            {threat.action}
          </span>
          <span style={{ fontSize: '15px', lineHeight: '1.5', color: '#D9D4DB' }}>{threat.actionText}</span>
        </section>
        <section aria-labelledby="q3" style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span
            id="q3"
            style={{ fontSize: '12px', fontWeight: '800', letterSpacing: '0.1em', color: '#9C95A0', padding: '0 2px' }}
          >
            3 · GDZIE MAM IŚĆ?
          </span>
          {hasOptions && (
            <>
              {(options || []).map((o, oIndex) => (
                <Fragment key={oIndex}>
                  <button
                    type="button"
                    onClick={o.pick}
                    aria-pressed={o.pressed}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center',
                      padding: '14px',
                      boxSizing: 'border-box',
                      borderRadius: '14px',
                      background: o.bg,
                      border: `2px solid ${o.border}`,
                      color: '#F4F1F2',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'border-color .3s, background .3s',
                      animation: 'chronIn .4s ease both',
                    }}
                  >
                    <span
                      style={{
                        minWidth: '36px',
                        height: '36px',
                        flex: 'none',
                        borderRadius: '10px',
                        background: '#4FD1A5',
                        color: '#04170F',
                        fontWeight: '800',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {o.num}
                    </span>
                    <span style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <span
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
                      >
                        <span style={{ fontSize: '16px', fontWeight: '800' }}>{o.name}</span>
                        {o.isRec && (
                          <>
                            <span
                              style={{
                                padding: '3px 8px',
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
                      </span>
                      <span style={{ fontSize: '13px', color: '#A49DA6' }}>
                        {o.kind} · {o.address}
                      </span>
                      <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                        <StatusBadge kind={o.status} size="sm" />
                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#F4F1F2' }}>
                          {o.walk} min · {o.dist} m
                        </span>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '999px',
                            background: o.reachBg,
                            color: o.reachColor,
                            fontSize: '12px',
                            fontWeight: '800',
                          }}
                        >
                          {o.reachText}
                        </span>
                      </span>
                    </span>
                  </button>
                </Fragment>
              ))}
              <p style={{ margin: '0', padding: '0 2px', fontSize: '13px', lineHeight: '1.5', color: '#B9B1BB' }}>
                {rec.reason}
              </p>
            </>
          )}
          {noOptions && (
            <>
              <div
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  background: '#211F25',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <span style={{ fontSize: '15px', fontWeight: '800' }}>Brak potwierdzonego schronienia</span>
                <span style={{ fontSize: '14px', lineHeight: '1.5', color: '#C9C1CB' }}>{rec.reason}</span>
              </div>
            </>
          )}
        </section>
        {hasOptions && (
          <>
            <section
              aria-labelledby="q4"
              style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              <span
                id="q4"
                style={{
                  fontSize: '12px',
                  fontWeight: '800',
                  letterSpacing: '0.1em',
                  color: '#9C95A0',
                  padding: '0 2px',
                }}
              >
                4 · JAK TAM DOTRZEĆ?
              </span>
              <StreetMap
                pins={options}
                highlightId={sel.id}
                showRoute
                routeDashed={false}
                zone={threat.zone}
                zoneLevel="red"
                offlineLabel={offlineLabel}
                stale={stale}
                onPin={pickPin}
              />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  background: '#17151A',
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#F4F1F2"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 20V6M6 12l6-6 6 6"></path>
                </svg>
                <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '800' }}>
                    {sel.walk} min pieszo · {sel.dist} m do: {sel.name}
                  </span>
                  <span style={{ fontSize: '13px', color: '#A49DA6' }}>{route.nav}</span>
                </span>
              </div>
            </section>
          </>
        )}
      </div>
      <div
        style={{
          padding: '12px 16px 24px',
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr 64px',
          gap: '8px',
          background: '#0B0A0D',
          borderTop: '1px solid #1F1C24',
        }}
      >
        <button
          type="button"
          onClick={goRoute}
          style={{
            minHeight: '56px',
            border: '0',
            borderRadius: '16px',
            background: '#E3203A',
            color: '#FFFFFF',
            fontWeight: '800',
            fontSize: '15px',
            letterSpacing: '0.02em',
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 0 24px rgba(255,45,61,.35)',
          }}
        >
          WYZNACZ TRASĘ
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
        <a
          href="tel:112"
          aria-label="Zadzwoń pod numer alarmowy 112"
          style={{
            minHeight: '56px',
            borderRadius: '16px',
            border: '1px solid #5A1A22',
            background: '#1A0E11',
            color: '#FF8A95',
            fontWeight: '800',
            fontSize: '14px',
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"></path>
          </svg>
          112
        </a>
      </div>
    </div>
  );
}
