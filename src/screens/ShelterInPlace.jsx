/**
 * "Nie zdążę" screen: how to shelter in place when there is no time to reach a shelter.
 */
import { Fragment } from 'react';
import chronApi from '@/api/chronApi.js';

/** Builds view data (texts, colors, handlers) from props. */
function buildViewModel(props) {
  const api = chronApi;
  const s = props.store || {},
    a = props.actions || {},
    params = props.params || {};
  const t = api.getThreat(params.threatId || s.threatId, s, 'red');
  return {
    t,
    steps: t.steps.map((x, i) => {
      return { n: i + 1, title: x[0], text: x[1] };
    }),
    back: function () {
      a.back();
    },
  };
}

/**
 * "Nie zdążę" screen.
 *
 * @param {object} props
 * @param {AppStore} props.store — global app state
 * @param {AppActions} props.actions — controller actions (navigation, settings)
 * @param {{threatId?: string}} props.params — params of the open screen from the navigation stack
 */
export default function ShelterInPlace(inputProps) {
  const props = inputProps;
  const { back, steps, t } = buildViewModel(props);
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
            Nie zdążysz? Zrób to teraz
          </span>
          <span style={{ fontSize: '12px', color: '#A49DA6' }}>{t.title} · porady na miejscu</span>
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
        <section
          style={{
            borderRadius: '18px',
            padding: '18px',
            background: 'rgba(200,50,63,.16)',
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
              color: '#FF7A85',
            }}
          >
            {t.lateTitle}
          </span>
          <span
            style={{
              fontFamily: "'Unbounded', 'Arial Black', sans-serif",
              fontWeight: '700',
              fontSize: '22px',
              color: '#FFFFFF',
            }}
          >
            {t.rule}
          </span>
          <p style={{ margin: '0', fontSize: '15px', lineHeight: '1.45', color: '#F4E4E6' }}>{t.ruleText}</p>
        </section>
        {(steps || []).map((st, stIndex) => (
          <Fragment key={stIndex}>
            <div
              style={{
                display: 'flex',
                gap: '14px',
                padding: '14px',
                borderRadius: '14px',
                background: '#17151A',
                border: '1px solid #222026',
              }}
            >
              <span
                style={{
                  minWidth: '32px',
                  height: '32px',
                  borderRadius: '16px',
                  background: '#26232A',
                  color: '#F2EFF3',
                  fontWeight: '800',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {st.n}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '15px', fontWeight: '800' }}>{st.title}</span>
                <span style={{ fontSize: '14px', lineHeight: '1.45', color: '#C9C1CB' }}>{st.text}</span>
              </div>
            </div>
          </Fragment>
        ))}
        <p style={{ margin: '0 4px', fontSize: '12px', lineHeight: '1.5', color: '#9C95A0' }}>
          Instrukcje działają offline. W sytuacji zagrożenia życia dzwoń pod 112.
        </p>
      </div>
      <div
        style={{
          padding: '12px 16px 24px',
          borderTop: '1px solid #1F1C24',
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '10px',
        }}
      >
        <a
          href="tel:112"
          style={{
            minHeight: '56px',
            borderRadius: '16px',
            border: '1px solid #5A1A22',
            background: '#1A0E11',
            color: '#FF8A95',
            fontWeight: '800',
            fontSize: '15px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <svg
            width="18"
            height="18"
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
          Zadzwoń 112
        </a>
      </div>
    </div>
  );
}
