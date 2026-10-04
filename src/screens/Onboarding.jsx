/**
 * Onboarding: splash, product value and disclaimer, location and notification permissions, sign-in.
 */
import useMergedState from '@/hooks/useMergedState.js';
import { requestLocationPermission, requestNotificationPermission } from '@/services/notifications.js';
import { t } from '@/i18n/index.js';
const STEPS = ['splash', 'value', 'location', 'notifications', 'login'];
const DEFAULT_PROPS = {
  startStep: 'splash',
};

/** Builds view data (texts, colors, handlers) from props and local state. */
function buildViewModel(props, state, setState) {
  const st = state,
    a = props.actions || {};
  const next = function () {
    setState({
      step: STEPS[Math.min(STEPS.length - 1, STEPS.indexOf(state.step) + 1)],
    });
  };
  const finish = function (loggedIn) {
    a.finishOnboarding({
      loggedIn,
      loc: state.loc,
    });
  };
  return {
    isSplash: st.step === 'splash',
    isValue: st.step === 'value',
    isLogin: st.step === 'login',
    isPerm: st.step === 'location' || st.step === 'notifications',
    isLoc: st.step === 'location',
    isNotif: st.step === 'notifications',
    stepNo: st.step === 'location' ? 2 : 3,
    loc: st.loc,
    next,
    allowAlways: function () {
      requestLocationPermission();
      setState({
        loc: 'zawsze',
        step: 'notifications',
      });
    },
    allowOnce: function () {
      requestLocationPermission();
      setState({
        loc: t('tylko teraz'),
        step: 'notifications',
      });
    },
    allowNotifications: function () {
      requestNotificationPermission().finally(next);
    },
    login: function () {
      finish(true);
    },
    loginSubmit: function (e) {
      e.preventDefault();
      finish(true);
    },
    skip: function () {
      finish(false);
    },
  };
}

/**
 * Onboarding.
 *
 * @param {object} props
 * @param {AppActions} props.actions — controller actions (navigation, settings)
 * @param {string} props.startStep
 */
export default function Onboarding(inputProps) {
  const props = {
    ...DEFAULT_PROPS,
    ...inputProps,
  };
  const [state, setState] = useMergedState(() => ({
    step: props.startStep || 'splash',
    loc: 'zawsze',
  }));
  const {
    allowNotifications,
    allowAlways,
    allowOnce,
    isLoc,
    isLogin,
    isNotif,
    isPerm,
    isSplash,
    isValue,
    loc,
    login,
    loginSubmit,
    next,
    skip,
    stepNo,
  } = buildViewModel(props, state, setState);
  return (
    <div
      style={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: '#0B0A0D',
        color: '#F4F1F2',
        fontFamily: "'Manrope', system-ui, sans-serif",
      }}
    >
      {isSplash && (
        <>
          <button
            type="button"
            onClick={next}
            aria-label={t('Otwórz aplikację')}
            style={{
              width: '100%',
              height: '100%',
              boxSizing: 'border-box',
              border: '0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '96px 32px 56px',
              background: 'radial-gradient(circle at 50% 42%, #2A0A10 0%, #0B0A0D 58%)',
              color: '#F4F1F2',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <span
              style={{
                height: '24px',
              }}
            ></span>
            <span
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '28px',
              }}
            >
              <svg
                width="128"
                height="114"
                viewBox="0 0 72 64"
                fill="none"
                aria-hidden="true"
                style={{
                  animation: 'schronFlicker 1.4s ease-out both, schronGlow 2.8s ease-in-out 1.4s infinite',
                  overflow: 'visible',
                }}
              >
                <path
                  d="M10 56V28L36 8L62 28V56"
                  stroke="#FF2D3D"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
                <path d="M24 56V42a12 12 0 0 1 24 0V56" stroke="#FF2D3D" strokeWidth="3.2" strokeLinecap="round"></path>
                <circle cx="36" cy="27" r="2.6" fill="#FF2D3D"></circle>
              </svg>
              <span
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  animation: 'schronFade 1.8s ease-out both',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Unbounded', 'Arial Black', sans-serif",
                    fontWeight: '700',
                    fontSize: '34px',
                    letterSpacing: '0.22em',
                    paddingLeft: '0.22em',
                    color: '#FF2D3D',
                    textShadow: '0 0 12px rgba(255,45,61,.7), 0 0 32px rgba(255,45,61,.35)',
                  }}
                >
                  {t('CHROŃ')}
                </span>
                <span
                  style={{
                    fontSize: '15px',
                    letterSpacing: '0.04em',
                    color: '#B9B1BB',
                  }}
                >
                  {t('Wiedz. Zdąż. Chroń się.')}
                </span>
              </span>
            </span>
            <span
              style={{
                fontSize: '13px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#A49DA6',
                animation: 'schronBlink 2s ease-in-out infinite',
              }}
            >
              {t('Dotknij, aby kontynuować')}
            </span>
          </button>
        </>
      )}
      {isValue && (
        <>
          <div
            style={{
              height: '100%',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '20px',
              padding: '24px 24px 32px',
              overflowY: 'auto',
              overflowX: 'hidden',
              scrollbarWidth: 'none',
              animation: 'chronIn .4s ease both',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '28px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Unbounded', 'Arial Black', sans-serif",
                    fontWeight: '700',
                    fontSize: '15px',
                    letterSpacing: '0.18em',
                    color: '#FF2D3D',
                  }}
                >
                  {t('CHROŃ')}
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#A49DA6',
                  }}
                >
                  {t('Krok 1 z 4')}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <h1
                  style={{
                    margin: '0',
                    fontFamily: "'Unbounded', 'Arial Black', sans-serif",
                    fontWeight: '500',
                    fontSize: '26px',
                    lineHeight: '1.2',
                  }}
                >
                  {t('Od zagrożenia do działania')}
                </h1>
                <p
                  style={{
                    margin: '0',
                    fontSize: '15px',
                    lineHeight: '1.5',
                    color: '#B9B1BB',
                  }}
                >
                  {t('CHROŃ mówi, co się dzieje, co zrobić i gdzie się schronić — w kilka sekund.')}
                </p>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: '14px',
                    alignItems: 'flex-start',
                    padding: '14px',
                    borderRadius: '14px',
                    background: '#17151A',
                    border: '1px solid #222026',
                  }}
                >
                  <span
                    style={{
                      width: '36px',
                      height: '36px',
                      flex: 'none',
                      borderRadius: '10px',
                      background: '#1A0E11',
                      border: '1px solid #5A1A22',
                      color: '#FF6B78',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
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
                      <path d="M12 3.5l9 16H3z"></path>
                      <path d="M12 10v4.5M12 17.2v.1"></path>
                    </svg>
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '15px',
                        fontWeight: '800',
                      }}
                    >
                      {t('Wiesz, co się dzieje')}
                    </span>
                    <span
                      style={{
                        fontSize: '13px',
                        lineHeight: '1.45',
                        color: '#A49DA6',
                      }}
                    >
                      {t('Status GREEN / YELLOW / RED z oficjalnych źródeł: RCB, RSO, IMGW.')}
                    </span>
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '14px',
                    alignItems: 'flex-start',
                    padding: '14px',
                    borderRadius: '14px',
                    background: '#17151A',
                    border: '1px solid #222026',
                  }}
                >
                  <span
                    style={{
                      width: '36px',
                      height: '36px',
                      flex: 'none',
                      borderRadius: '10px',
                      background: '#10261E',
                      border: '1px solid #1F3B31',
                      color: '#7FE0BE',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="20" height="18" viewBox="0 0 72 64" fill="none" aria-hidden="true">
                      <path
                        d="M10 56V28L36 8L62 28V56"
                        stroke="currentColor"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></path>
                      <path
                        d="M24 56V42a12 12 0 0 1 24 0V56"
                        stroke="currentColor"
                        strokeWidth="6"
                        strokeLinecap="round"
                      ></path>
                    </svg>
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '15px',
                        fontWeight: '800',
                      }}
                    >
                      {t('Wiesz, gdzie iść')}
                    </span>
                    <span
                      style={{
                        fontSize: '13px',
                        lineHeight: '1.45',
                        color: '#A49DA6',
                      }}
                    >
                      {t('Najbliższe otwarte schronienie dopasowane do zagrożenia i trasa piesza.')}
                    </span>
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '14px',
                    alignItems: 'flex-start',
                    padding: '14px',
                    borderRadius: '14px',
                    background: '#17151A',
                    border: '1px solid #222026',
                  }}
                >
                  <span
                    style={{
                      width: '36px',
                      height: '36px',
                      flex: 'none',
                      borderRadius: '10px',
                      background: '#1A2A3D',
                      border: '1px solid #1F3550',
                      color: '#7CC4FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
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
                      <path d="M12 3v12M7 10l5 5 5-5M5 21h14"></path>
                    </svg>
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '15px',
                        fontWeight: '800',
                      }}
                    >
                      {t('Działa bez internetu')}
                    </span>
                    <span
                      style={{
                        fontSize: '13px',
                        lineHeight: '1.45',
                        color: '#A49DA6',
                      }}
                    >
                      {t('Safety Pack: mapa, schrony, trasy i instrukcje zapisane w telefonie.')}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div
                role="note"
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  padding: '14px',
                  borderRadius: '14px',
                  background: '#1A0E11',
                  border: '1px solid #5A1A22',
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FF8A95"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  style={{
                    flex: 'none',
                    marginTop: '1px',
                  }}
                >
                  <circle cx="12" cy="12" r="9"></circle>
                  <path d="M12 8v5M12 16.5v.1"></path>
                </svg>
                <span
                  style={{
                    fontSize: '13px',
                    lineHeight: '1.5',
                    color: '#F4E4E6',
                  }}
                >
                  <b
                    style={{
                      color: '#FFFFFF',
                    }}
                  >
                    {t('CHROŃ nie zastępuje RCB, RSO ani numeru 112.')}
                  </b>
                  {t(' W sytuacji zagrożenia życia dzwoń pod 112 i stosuj się do poleceń służb.')}
                </span>
              </div>
              <button
                type="button"
                onClick={next}
                style={{
                  height: '56px',
                  border: '0',
                  borderRadius: '16px',
                  background: '#E3203A',
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: '16px',
                  letterSpacing: '0.02em',
                  cursor: 'pointer',
                  boxShadow: '0 0 24px rgba(255,45,61,.45)',
                  fontFamily: 'inherit',
                }}
              >
                {t('Rozumiem, dalej')}
              </button>
            </div>
          </div>
        </>
      )}
      {isPerm && (
        <>
          <div
            style={{
              height: '100%',
              boxSizing: 'border-box',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              background: 'radial-gradient(circle at 50% 30%, #23090E 0%, #0B0A0D 60%)',
              animation: 'chronIn .4s ease both',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '24px 24px 0',
              }}
            >
              <span
                style={{
                  fontFamily: "'Unbounded', 'Arial Black', sans-serif",
                  fontWeight: '700',
                  fontSize: '15px',
                  letterSpacing: '0.18em',
                  color: '#FF2D3D',
                }}
              >
                {t('CHROŃ')}
              </span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#A49DA6',
                }}
              >
                {t('Krok ')}
                {stepNo} z 4
              </span>
            </div>
            <div
              style={{
                flex: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '28px',
                padding: '0 32px',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '120px',
                  height: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: '0',
                    top: '0',
                    width: '120px',
                    height: '120px',
                    boxSizing: 'border-box',
                    borderRadius: '60px',
                    border: '2px solid rgba(255,45,61,.5)',
                    animation: 'chronRing 2.2s ease-out infinite',
                  }}
                ></span>
                <span
                  style={{
                    width: '88px',
                    height: '88px',
                    borderRadius: '44px',
                    background: '#1A0E11',
                    border: '1px solid #5A1A22',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FF2D3D',
                    filter: 'drop-shadow(0 0 8px rgba(255,45,61,.6))',
                  }}
                >
                  {isLoc && (
                    <>
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"></path>
                        <circle cx="12" cy="10" r="2.6"></circle>
                      </svg>
                    </>
                  )}
                  {isNotif && (
                    <>
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z"></path>
                        <path d="M10 20a2 2 0 0 0 4 0"></path>
                      </svg>
                    </>
                  )}
                </span>
              </div>
              {isLoc && (
                <>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                      textAlign: 'center',
                    }}
                  >
                    <h1
                      style={{
                        margin: '0',
                        fontFamily: "'Unbounded', 'Arial Black', sans-serif",
                        fontWeight: '500',
                        fontSize: '22px',
                        lineHeight: '1.25',
                      }}
                    >
                      {t('Dostęp do lokalizacji')}
                    </h1>
                    <p
                      style={{
                        margin: '0',
                        fontSize: '15px',
                        lineHeight: '1.5',
                        color: '#C9C1CB',
                      }}
                    >
                      {t(
                        'Lokalizacja jest potrzebna, aby wskazać najbliższy schron i trasę do niego. Nie przechowujemy historii Twoich przemieszczeń.',
                      )}
                    </p>
                  </div>
                </>
              )}
              {isNotif && (
                <>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                      textAlign: 'center',
                    }}
                  >
                    <h1
                      style={{
                        margin: '0',
                        fontFamily: "'Unbounded', 'Arial Black', sans-serif",
                        fontWeight: '500',
                        fontSize: '22px',
                        lineHeight: '1.25',
                      }}
                    >
                      {t('Powiadomienia o zagrożeniach')}
                    </h1>
                    <p
                      style={{
                        margin: '0',
                        fontSize: '15px',
                        lineHeight: '1.5',
                        color: '#C9C1CB',
                      }}
                    >
                      {t(
                        'Wyślemy alarm, gdy w Twoim regionie pojawi się zagrożenie — także przy wyciszonym telefonie.',
                      )}
                    </p>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 12px',
                        borderRadius: '999px',
                        background: '#10261E',
                        color: '#7FE0BE',
                        fontSize: '13px',
                        fontWeight: '700',
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M5 12.5l4.5 4.5L19 7.5"></path>
                      </svg>
                      Lokalizacja: {loc}
                    </span>
                  </div>
                </>
              )}
            </div>
            <div
              style={{
                margin: '0 12px 16px',
                padding: '20px',
                borderRadius: '24px',
                background: '#1A181E',
                border: '1px solid #2C2830',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                boxShadow: '0 -12px 40px rgba(0,0,0,.5)',
              }}
            >
              {isLoc && (
                <>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '15px',
                        fontWeight: '800',
                        textAlign: 'center',
                        lineHeight: '1.4',
                      }}
                    >
                      {t('Zezwolić aplikacji „Chroń” na dostęp do lokalizacji?')}
                    </span>
                    <button
                      type="button"
                      onClick={allowAlways}
                      style={{
                        minHeight: '54px',
                        border: '0',
                        borderRadius: '14px',
                        background: '#E3203A',
                        color: '#FFFFFF',
                        fontWeight: '800',
                        fontSize: '15px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        fontFamily: 'inherit',
                      }}
                    >
                      {t('Zawsze zezwalaj')}
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          opacity: '.85',
                        }}
                      >
                        {t('zalecane — alarmy działają w tle')}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={allowOnce}
                      style={{
                        minHeight: '50px',
                        borderRadius: '14px',
                        border: '1px solid #3A3540',
                        background: '#24212A',
                        color: '#F4F1F2',
                        fontWeight: '700',
                        fontSize: '15px',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {t('Zezwól tylko teraz')}
                    </button>
                    <span
                      style={{
                        fontSize: '12px',
                        lineHeight: '1.5',
                        color: '#A49DA6',
                        textAlign: 'center',
                      }}
                    >
                      {t('Bez lokalizacji aplikacja nie wskaże schronu, dlatego jest wymagana.')}
                    </span>
                  </div>
                </>
              )}
              {isNotif && (
                <>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '15px',
                        fontWeight: '800',
                        textAlign: 'center',
                        lineHeight: '1.4',
                      }}
                    >
                      {t('Zezwolić aplikacji „Chroń” na wysyłanie powiadomień?')}
                    </span>
                    <button
                      type="button"
                      onClick={allowNotifications}
                      style={{
                        minHeight: '54px',
                        border: '0',
                        borderRadius: '14px',
                        background: '#E3203A',
                        color: '#FFFFFF',
                        fontWeight: '800',
                        fontSize: '15px',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {t('Zezwól')}
                    </button>
                    <button
                      type="button"
                      onClick={next}
                      style={{
                        minHeight: '50px',
                        borderRadius: '14px',
                        border: '1px solid #3A3540',
                        background: '#24212A',
                        color: '#F4F1F2',
                        fontWeight: '700',
                        fontSize: '15px',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {t('Nie teraz')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
      {isLogin && (
        <>
          <div
            style={{
              height: '100%',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '20px',
              padding: '24px 24px 32px',
              overflowY: 'auto',
              overflowX: 'hidden',
              scrollbarWidth: 'none',
              animation: 'chronIn .4s ease both',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '36px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <svg
                    width="40"
                    height="36"
                    viewBox="0 0 72 64"
                    fill="none"
                    aria-hidden="true"
                    style={{
                      filter: 'drop-shadow(0 0 6px rgba(255,45,61,.8))',
                      overflow: 'visible',
                    }}
                  >
                    <path
                      d="M10 56V28L36 8L62 28V56"
                      stroke="#FF2D3D"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></path>
                    <path
                      d="M24 56V42a12 12 0 0 1 24 0V56"
                      stroke="#FF2D3D"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                    ></path>
                    <circle cx="36" cy="27" r="3.2" fill="#FF2D3D"></circle>
                  </svg>
                  <span
                    style={{
                      fontFamily: "'Unbounded', 'Arial Black', sans-serif",
                      fontWeight: '700',
                      fontSize: '18px',
                      letterSpacing: '0.2em',
                      color: '#FF2D3D',
                      textShadow: '0 0 10px rgba(255,45,61,.55)',
                    }}
                  >
                    {t('CHROŃ')}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#A49DA6',
                  }}
                >
                  {t('Krok 4 z 4')}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <h1
                  style={{
                    margin: '0',
                    fontFamily: "'Unbounded', 'Arial Black', sans-serif",
                    fontWeight: '500',
                    fontSize: '28px',
                    lineHeight: '1.2',
                  }}
                >
                  {t('Logowanie')}
                </h1>
                <p
                  style={{
                    margin: '0',
                    fontSize: '15px',
                    lineHeight: '1.5',
                    color: '#B9B1BB',
                  }}
                >
                  {t(
                    'Opcjonalnie. Konto zapisze Twoje strefy i ustawienia alarmu. Bez konta aplikacja działa w pełni.',
                  )}
                </p>
              </div>
              <form
                onSubmit={loginSubmit}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                  margin: '0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <label
                    htmlFor="login-id"
                    style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#B9B1BB',
                    }}
                  >
                    {t('Telefon lub e-mail')}
                  </label>
                  <input
                    id="login-id"
                    type="text"
                    placeholder="+48 000 000 000"
                    autoComplete="username"
                    style={{
                      height: '52px',
                      boxSizing: 'border-box',
                      padding: '0 16px',
                      borderRadius: '14px',
                      border: '1px solid #2C2830',
                      background: '#16141A',
                      color: '#F4F1F2',
                      fontFamily: 'inherit',
                      fontSize: '16px',
                    }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <label
                    htmlFor="login-pass"
                    style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#B9B1BB',
                    }}
                  >
                    {t('Hasło')}
                  </label>
                  <input
                    id="login-pass"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{
                      height: '52px',
                      boxSizing: 'border-box',
                      padding: '0 16px',
                      borderRadius: '14px',
                      border: '1px solid #2C2830',
                      background: '#16141A',
                      color: '#F4F1F2',
                      fontFamily: 'inherit',
                      fontSize: '16px',
                    }}
                  />
                </div>
                <a
                  href="#"
                  style={{
                    alignSelf: 'flex-end',
                    fontSize: '14px',
                    fontWeight: '600',
                    minHeight: '24px',
                  }}
                >
                  {t('Nie pamiętasz hasła?')}
                </a>
              </form>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <button
                type="button"
                onClick={login}
                style={{
                  height: '56px',
                  border: '0',
                  borderRadius: '16px',
                  background: '#E3203A',
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: '16px',
                  letterSpacing: '0.02em',
                  cursor: 'pointer',
                  boxShadow: '0 0 24px rgba(255,45,61,.45)',
                  fontFamily: 'inherit',
                }}
              >
                {t('Zaloguj się')}
              </button>
              <button
                type="button"
                onClick={skip}
                style={{
                  height: '52px',
                  borderRadius: '16px',
                  border: '1px solid #2C2830',
                  background: '#16141A',
                  color: '#F4F1F2',
                  fontWeight: '700',
                  fontSize: '15px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {t('Kontynuuj bez konta')}
              </button>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  color: '#A49DA6',
                  textAlign: 'center',
                }}
              >
                {t(
                  'Lokalizacja jest potrzebna, aby wskazać najbliższy schron. Nie przechowujemy historii Twoich przemieszczeń.',
                )}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
