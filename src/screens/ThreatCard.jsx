/**
 * Threat details: level, reason, source, time, confidence, TTR interval and what to do now.
 */
import { Fragment } from 'react';
import StatusBadge from '@/components/StatusBadge.jsx';
import chronApi from '@/api/chronApi.js';

const LVL = {
  yellow: { tint: 'rgba(201,164,58,.14)', text: '#E6C65E' },
  red: { tint: 'rgba(200,50,63,.16)', text: '#FF7A85' },
};
const REG = { red: ['#C8323F', 'czerwony'], yellow: ['#C9A43A', 'żółty'] };

/** Builds view data (texts, colors, handlers) from props. */
function buildViewModel(props) {
  const api = chronApi;
  const s = props.store || {},
    a = props.actions || {},
    params = props.params || {};
  const threatId = params.threatId || s.threatId;
  const t = api.getThreat(threatId, s, params.level);
  const ctx = Object.assign({}, s, { threatId, level: t.level });
  const rec = api.getRecommendation(ctx);
  const r = rec.primary || {};
  return {
    place: chronApi.getPlace(s),
    t,
    lvl: LVL[t.level] || LVL.yellow,
    todo: t.todo.map((x, i) => {
      return { n: i + 1, text: x };
    }),
    regions: t.regions.map((g) => {
      return { name: g.name, color: REG[g.level][0], label: REG[g.level][1] };
    }),
    rec: r,
    hasRec: !!rec.primary,
    reach: {
      bg: r.canReach ? 'rgba(79,209,165,.13)' : 'rgba(255,122,133,.13)',
      fg: r.canReach ? '#86CDB2' : '#FF8A95',
    },
    cta: t.level === 'red' ? 'WYZNACZ TRASĘ' : t.cta,
    back: function () {
      a.back();
    },
    goRoute: function () {
      if (r.id) a.openRoute(r.id);
    },
    goLate: function () {
      a.openLate(threatId);
    },
  };
}

/**
 * Threat details.
 *
 * @param {object} props
 * @param {AppStore} props.store — global app state
 * @param {AppActions} props.actions — controller actions (navigation, settings)
 * @param {{threatId?, level?}} props.params — params of the open screen from the navigation stack
 */
export default function ThreatCard(inputProps) {
  const props = inputProps;
  const { place, back, cta, goLate, goRoute, hasRec, lvl, reach, rec, regions, t, todo } = buildViewModel(props);
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
        <span style={{ fontFamily: "'Unbounded', 'Arial Black', sans-serif", fontWeight: '500', fontSize: '18px' }}>
          Szczegóły zagrożenia
        </span>
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
          style={{
            flex: 'none',
            borderRadius: '20px',
            background: '#17151A',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '18px', background: lvl.tint, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <StatusBadge kind={t.level} size="md" />
            <span
              style={{
                fontFamily: "'Unbounded', 'Arial Black', sans-serif",
                fontWeight: '500',
                fontSize: '22px',
                lineHeight: '1.25',
                color: '#FFFFFF',
              }}
            >
              {t.headline}
            </span>
            <span style={{ fontSize: '15px', fontWeight: '800', color: lvl.text }}>
              {t.title} · {t.kind}
            </span>
          </div>
          <div
            style={{
              padding: '12px 18px',
              borderTop: '1px solid #26232A',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span style={{ fontSize: '13px', color: '#9C95A0' }}>Powód statusu</span>
            <span style={{ fontSize: '15px', fontWeight: '700', lineHeight: '1.45' }}>{t.reason}</span>
          </div>
          <div
            style={{
              padding: '12px 18px',
              borderTop: '1px solid #26232A',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '14px', color: '#9C95A0' }}>Źródło</span>
            <span style={{ fontSize: '14px', fontWeight: '700', textAlign: 'right' }}>
              {t.source} · {t.sourceGroup}
            </span>
          </div>
          <div
            style={{
              padding: '12px 18px',
              borderTop: '1px solid #26232A',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '14px', color: '#9C95A0' }}>Godzina źródła</span>
            <span style={{ fontSize: '14px', fontWeight: '700' }}>dziś, {t.sourceTime}</span>
          </div>
          <div
            style={{
              padding: '12px 18px',
              borderTop: '1px solid #26232A',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '14px', color: '#9C95A0' }}>Ostatnia aktualizacja</span>
            <span style={{ fontSize: '14px', fontWeight: '700' }}>{t.updated}</span>
          </div>
          <div
            style={{
              padding: '12px 18px',
              borderTop: '1px solid #26232A',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '14px', color: '#9C95A0' }}>Wiarygodność</span>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                background: '#24212A',
                fontSize: '13px',
                fontWeight: '800',
                letterSpacing: '0.04em',
              }}
            >
              {t.confidence}
            </span>
          </div>
          <div
            style={{
              padding: '12px 18px',
              borderTop: '1px solid #26232A',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '14px', color: '#9C95A0' }}>Twoja lokalizacja</span>
            <span style={{ fontSize: '14px', fontWeight: '700' }}>{place.label}</span>
          </div>
          <div
            style={{
              padding: '12px 18px',
              borderTop: '1px solid #26232A',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '14px', color: '#9C95A0' }}>Do zagrożenia (szacunek)</span>
            <span style={{ fontFamily: "'Unbounded', 'Arial Black', sans-serif", fontSize: '22px', fontWeight: '700' }}>
              {t.ttr}
            </span>
          </div>
        </section>
        <section
          style={{
            flex: 'none',
            borderRadius: '20px',
            background: '#17151A',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: '800',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#9C95A0',
            }}
          >
            Co się dzieje
          </span>
          <p style={{ margin: '0', fontSize: '15px', lineHeight: '1.55', color: '#E4DFE6' }}>{t.what}</p>
        </section>
        <section
          style={{
            flex: 'none',
            borderRadius: '20px',
            background: '#17151A',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: '800',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#9C95A0',
            }}
          >
            Co robić teraz
          </span>
          {(todo || []).map((td, tdIndex) => (
            <Fragment key={tdIndex}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span
                  style={{
                    minWidth: '26px',
                    height: '26px',
                    borderRadius: '13px',
                    background: '#26232A',
                    fontSize: '13px',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {td.n}
                </span>
                <span style={{ fontSize: '15px', lineHeight: '1.5', color: '#E4DFE6' }}>{td.text}</span>
              </div>
            </Fragment>
          ))}
        </section>
        <section
          style={{
            flex: 'none',
            borderRadius: '20px',
            background: '#17151A',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: '800',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#9C95A0',
            }}
          >
            Obszar zagrożenia
          </span>
          <span style={{ fontSize: '15px', fontWeight: '700' }}>{t.area}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {(regions || []).map((c, cIndex) => (
              <Fragment key={cIndex}>
                <span
                  style={{
                    padding: '6px 10px',
                    borderRadius: '10px',
                    background: '#211F25',
                    fontSize: '13px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '4px', background: c.color }}></span>
                  {c.name} · {c.label}
                </span>
              </Fragment>
            ))}
          </div>
        </section>
        <section
          style={{
            flex: 'none',
            borderRadius: '20px',
            background: '#17151A',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '13px', color: '#9C95A0' }}>Źródło szczegółów</span>
            <span style={{ fontSize: '14px', fontWeight: '700' }}>{t.detailsSource}</span>
          </div>
          <div
            style={{
              padding: '12px 18px',
              borderTop: '1px solid #26232A',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '14px', color: '#9C95A0' }}>Aktualność danych</span>
            <StatusBadge kind={t.freshness.key} label={t.freshness.label} size="sm" />
          </div>
        </section>
        {hasRec && (
          <>
            <button
              type="button"
              onClick={goRoute}
              style={{
                flex: 'none',
                width: '100%',
                textAlign: 'left',
                background: '#17151A',
                border: '0',
                borderRadius: '20px',
                padding: '16px 18px',
                color: '#F2EFF3',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '0' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#9C95A0' }}>{t.nearestLabel}</span>
                <span style={{ fontSize: '17px', fontWeight: '800' }}>
                  {rec.walk} min pieszo · {rec.name}
                </span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#A49DA6' }}>
                  {rec.statusLabel} · {rec.hoursLabel}
                </span>
              </span>
              <span
                style={{
                  flex: 'none',
                  padding: '5px 10px',
                  borderRadius: '999px',
                  background: reach.bg,
                  color: reach.fg,
                  fontSize: '12px',
                  fontWeight: '800',
                  whiteSpace: 'nowrap',
                }}
              >
                {rec.reachText}
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
          </>
        )}
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
          onClick={goRoute}
          style={{
            minHeight: '56px',
            border: '0',
            borderRadius: '16px',
            background: '#E3203A',
            color: '#FFFFFF',
            fontWeight: '800',
            fontSize: '15px',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {cta}
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
