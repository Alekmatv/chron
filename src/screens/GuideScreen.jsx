/**
 * Poradnik: safety guides for each threat type in collapsible sections.
 */
import { Fragment } from 'react';
import useMergedState from '@/hooks/useMergedState.js';
import chronApi from '@/api/chronApi.js';
import { t } from '@/i18n/index.js';

/** Builds view data (texts, colors, handlers) from props and local state. */
function buildViewModel(props, state, setState) {
  const api = chronApi,
    a = props.actions || {};
  const guide = api.getGuide().map((g) => {
    const open = state.open === g.id;
    return {
      title: g.title,
      sub: g.sub,
      dot: g.dot,
      open,
      expanded: open ? 'true' : 'false',
      rot: open ? 'rotate(180deg)' : 'none',
      hasRule: !!g.rule,
      rule: g.rule || '',
      ruleText: g.ruleText || '',
      items: g.items.map((it, i) => {
        return {
          n: i + 1,
          title: it[0],
          text: it[1],
          pt: i === 0 && !g.rule ? 14 : 0,
        };
      }),
      toggle: function () {
        setState({
          open: state.open === g.id ? null : g.id,
        });
      },
    };
  });
  return {
    guide,
    back: function () {
      a.back();
    },
  };
}

/**
 * Poradnik.
 *
 * @param {object} props
 * @param {AppActions} props.actions — controller actions (navigation, settings)
 * @param {{threatId?: string}} props.params — params of the open screen from the navigation stack
 */
export default function GuideScreen(inputProps) {
  const props = inputProps;
  const [state, setState] = useMergedState(() => ({
    open: props.params?.threatId ? 'g-' + props.params.threatId : null,
  }));
  const { back, guide } = buildViewModel(props, state, setState);
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
          alignItems: 'center',
          gap: '12px',
          padding: '20px 16px 12px',
        }}
      >
        <button
          type="button"
          onClick={back}
          aria-label={t('Wstecz')}
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
              fontSize: '18px',
            }}
          >
            {t('Poradnik')}
          </span>
          <span
            style={{
              fontSize: '12px',
              color: '#9C95A0',
            }}
          >
            {t('Przeczytaj spokojnie, zanim coś się wydarzy')}
          </span>
        </div>
      </header>
      <div
        style={{
          flex: '1',
          minHeight: '0',
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
          padding: '4px 16px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {(guide || []).map((g, gIndex) => (
          <Fragment key={gIndex}>
            <section
              style={{
                flex: 'none',
                borderRadius: '18px',
                background: '#17151A',
                border: '1px solid #222026',
                overflow: 'hidden',
              }}
            >
              <button
                type="button"
                onClick={g.toggle}
                aria-expanded={g.expanded}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px 18px',
                  border: '0',
                  background: 'transparent',
                  color: '#F2EFF3',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    flex: 'none',
                    borderRadius: '5px',
                    background: g.dot,
                  }}
                ></span>
                <span
                  style={{
                    flex: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    minWidth: '0',
                  }}
                >
                  <span
                    style={{
                      fontSize: '16px',
                      fontWeight: '800',
                    }}
                  >
                    {g.title}
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      color: '#9C95A0',
                    }}
                  >
                    {g.sub}
                  </span>
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
                  style={{
                    transform: g.rot,
                    flex: 'none',
                    transition: 'transform .25s',
                  }}
                >
                  <path d="M6 9l6 6 6-6"></path>
                </svg>
              </button>
              {g.open && (
                <>
                  <div
                    style={{
                      padding: '0 18px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      borderTop: '1px solid #26232A',
                    }}
                  >
                    {g.hasRule && (
                      <>
                        <div
                          style={{
                            marginTop: '14px',
                            padding: '12px 14px',
                            borderRadius: '12px',
                            background: '#211F25',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: '800',
                            }}
                          >
                            {g.rule}
                          </span>
                          <span
                            style={{
                              fontSize: '14px',
                              lineHeight: '1.5',
                              color: '#C9C1CB',
                            }}
                          >
                            {g.ruleText}
                          </span>
                        </div>
                      </>
                    )}
                    {(g.items || []).map((it, itIndex) => (
                      <Fragment key={itIndex}>
                        <div
                          style={{
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start',
                            paddingTop: `${it.pt}px`,
                          }}
                        >
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
                            {it.n}
                          </span>
                          <span
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '15px',
                                fontWeight: '700',
                              }}
                            >
                              {it.title}
                            </span>
                            <span
                              style={{
                                fontSize: '14px',
                                lineHeight: '1.5',
                                color: '#C9C1CB',
                              }}
                            >
                              {it.text}
                            </span>
                          </span>
                        </div>
                      </Fragment>
                    ))}
                  </div>
                </>
              )}
            </section>
          </Fragment>
        ))}
        <p
          style={{
            margin: '6px 4px 0',
            fontSize: '12px',
            lineHeight: '1.5',
            color: '#9C95A0',
          }}
        >
          {t('W sytuacji zagrożenia życia dzwoń pod 112.')}
        </p>
      </div>
    </div>
  );
}
