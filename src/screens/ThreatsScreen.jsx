/**
 * List of active threats; at the green level shows that there are none.
 */
import { Fragment } from 'react';
import StatusBadge from '@/components/StatusBadge.jsx';
import chronApi from '@/api/chronApi.js';
import LiveSourcesPanel from '@/components/LiveSourcesPanel.jsx';

const TINT = { yellow: ['rgba(201,164,58,.14)', '#4A3E1A'], red: ['rgba(200,50,63,.16)', '#5A1A22'] };
const DOT = { air: '#C8323F', chem: '#C9A43A', flood: '#7CC4FF' };

/** Builds view data (texts, colors, handlers) from props. */
function buildViewModel(props) {
  const api = chronApi;
  const s = props.store || {},
    a = props.actions || {};
  const active = api.getActiveThreats(s);
  const threats = active.map((t) => {
    return Object.assign({}, t, {
      tint: TINT[t.level][0],
      border: TINT[t.level][1],
      open: function () {
        a.openThreat(t.id);
      },
    });
  });
  const types = api.getThreatTypes().map((ty, i) => {
    const on = s.level !== 'green' && ty.id === s.threatId;
    return {
      title: ty.title,
      dot: DOT[ty.id],
      divider: i ? '1px solid #24212A' : '0',
      sub: on ? (s.level === 'red' ? 'Aktywne · RED' : 'Aktywne · YELLOW') : 'Brak ostrzeżeń · instrukcje w poradniku',
      open: function () {
        if (on) a.openThreat(ty.id);
        else a.openGuide(ty.id);
      },
    };
  });
  return {
    place: chronApi.getPlace(s),
    status: api.getStatus(s),
    isEmpty: !threats.length,
    threats,
    types,
    liveFeed: s.liveThreats || null,
    liveStale: s.system === 'offline',
    goGuide: function () {
      a.openGuide();
    },
  };
}

/**
 * List of active threats; at the green level shows that there are none.
 *
 * @param {object} props
 * @param {AppStore} props.store — global app state
 * @param {AppActions} props.actions — controller actions (navigation, settings)
 */
export default function ThreatsScreen(inputProps) {
  const props = inputProps;
  const { place, goGuide, liveFeed, liveStale, isEmpty, status, threats, types } = buildViewModel(props);
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
      <header style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '20px 16px 12px' }}>
        <span style={{ fontFamily: "'Unbounded', 'Arial Black', sans-serif", fontWeight: '500', fontSize: '18px' }}>
          Zagrożenia
        </span>
        <span style={{ fontSize: '12px', color: '#A49DA6' }}>{place.city} · źródła: RSO / RCB, NEPTUN, PAŻP</span>
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
          gap: '14px',
        }}
      >
        {isEmpty && (
          <>
            <section style={{ flex: 'none', borderRadius: '20px', background: '#17151A', overflow: 'hidden' }}>
              <div
                style={{
                  padding: '18px',
                  background: 'rgba(42,79,67,.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <StatusBadge kind="green" size="sm" />
                <span
                  style={{
                    fontFamily: "'Unbounded', 'Arial Black', sans-serif",
                    fontWeight: '500',
                    fontSize: '18px',
                    lineHeight: '1.3',
                    color: '#FFFFFF',
                  }}
                >
                  {status.title}
                </span>
              </div>
              <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '14px', lineHeight: '1.5', color: '#D9D4DB' }}>{status.reason}</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#9C95A0' }}>
                  OSTATNIA AKTUALIZACJA {status.updated} · {status.source}
                </span>
              </div>
            </section>
          </>
        )}
        {(threats || []).map((t, tIndex) => (
          <Fragment key={tIndex}>
            <button
              type="button"
              onClick={t.open}
              style={{
                flex: 'none',
                width: '100%',
                textAlign: 'left',
                borderRadius: '20px',
                background: '#17151A',
                border: `1px solid ${t.border}`,
                padding: '0',
                overflow: 'hidden',
                color: '#F4F1F2',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                animation: 'chronIn .4s ease both',
              }}
            >
              <span
                style={{
                  padding: '16px 18px',
                  background: t.tint,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <StatusBadge kind={t.level} size="sm" />
                <span
                  style={{
                    fontFamily: "'Unbounded', 'Arial Black', sans-serif",
                    fontWeight: '500',
                    fontSize: '18px',
                    lineHeight: '1.25',
                    color: '#FFFFFF',
                  }}
                >
                  {t.title} · {t.kind}
                </span>
                <span style={{ fontSize: '14px', lineHeight: '1.45', color: '#D9D4DB' }}>{t.reason}</span>
              </span>
              <span
                style={{
                  padding: '12px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#9C95A0' }}>
                    {t.source} · {t.sourceTime}
                  </span>
                  <span style={{ fontSize: '13px', color: '#A49DA6' }}>{t.area}</span>
                </span>
                <span
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flex: 'none' }}
                >
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#9C95A0' }}>TTR</span>
                  <span
                    style={{
                      fontFamily: "'Unbounded', 'Arial Black', sans-serif",
                      fontWeight: '700',
                      fontSize: '16px',
                    }}
                  >
                    {t.ttr}
                  </span>
                </span>
              </span>
              <span style={{ padding: '0 18px 14px' }}>
                <StatusBadge kind={t.freshness.key} label={t.freshness.label} size="sm" />
              </span>
            </button>
          </Fragment>
        ))}
        <LiveSourcesPanel feed={liveFeed} stale={liveStale} />
        <span
          style={{
            fontSize: '12px',
            fontWeight: '800',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#9C95A0',
            marginTop: '4px',
          }}
        >
          Monitorowane typy zagrożeń
        </span>
        <section
          style={{
            flex: 'none',
            borderRadius: '18px',
            background: '#17151A',
            border: '1px solid #222026',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {(types || []).map((ty, tyIndex) => (
            <Fragment key={tyIndex}>
              <button
                type="button"
                onClick={ty.open}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  minHeight: '56px',
                  padding: '10px 18px',
                  border: '0',
                  borderTop: ty.divider,
                  background: 'transparent',
                  color: '#F4F1F2',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <span
                  style={{ width: '10px', height: '10px', flex: 'none', borderRadius: '5px', background: ty.dot }}
                ></span>
                <span style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '800' }}>{ty.title}</span>
                  <span style={{ fontSize: '12px', color: '#A49DA6' }}>{ty.sub}</span>
                </span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9C95A0"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            </Fragment>
          ))}
        </section>
        <button
          type="button"
          onClick={goGuide}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '16px 18px',
            borderRadius: '18px',
            background: '#17151A',
            border: '1px solid #222026',
            color: '#F2EFF3',
            textAlign: 'left',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <span
            style={{
              width: '44px',
              height: '44px',
              flex: 'none',
              borderRadius: '12px',
              background: '#211F25',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F2EFF3',
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"></path>
              <path d="M4 5.5v16M9 8h7M9 12h5"></path>
            </svg>
          </span>
          <span style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '0' }}>
            <span style={{ fontSize: '16px', fontWeight: '800' }}>Poradnik</span>
            <span style={{ fontSize: '13px', color: '#9C95A0' }}>Jak zachować się w sytuacji zagrożenia</span>
          </span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9C95A0"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 5l7 7-7 7"></path>
          </svg>
        </button>
        <p style={{ margin: '0 4px', fontSize: '12px', lineHeight: '1.5', color: '#9C95A0' }}>
          CHROŃ nie zastępuje RCB, RSO ani numeru 112. W sytuacji zagrożenia życia dzwoń pod 112.
        </p>
      </div>
    </div>
  );
}
