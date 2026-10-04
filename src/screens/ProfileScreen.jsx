/**
 * Profile and settings: zones, notifications, Safety Pack, alarm sound and light, demo alarm, language.
 */
import { Fragment, useEffect, useRef } from 'react';
import useMergedState from '@/hooks/useMergedState.js';
import chronApi from '@/api/chronApi.js';
import ProfileEditForm from '@/components/ProfileEditForm.jsx';
import { t, tf } from '@/i18n/index.js';
const ZONE_NAMES = {
  dom: 'Dom',
  praca: 'Praca',
  uczelnia: 'Uczelnia',
};

/** Builds view data (texts, colors, handlers) from props and local state. */
function buildViewModel(props, state, setState, soundTimer) {
  const api = chronApi;
  const s = props.store || {},
    a = props.actions || {};
  const set = s.settings || {};
  function sw(on, title, sub, toggle) {
    return {
      title,
      sub,
      pressed: on ? 'true' : 'false',
      track: on ? '#3FA57F' : '#3A3540',
      knob: on ? 23 : 3,
      toggle,
    };
  }
  function flip(key) {
    return function () {
      a.setSetting(key, !set[key]);
    };
  }
  function flipNotif(key) {
    return function () {
      const n = Object.assign({}, set.notif);
      n[key] = !n[key];
      a.setSetting('notif', n);
    };
  }
  function seg(on) {
    return {
      bg: on ? '#2C2930' : '#1C1A20',
      border: on ? '#F2EFF3' : '#2A272E',
      pressed: on ? 'true' : 'false',
    };
  }
  const zones = api.getZones().map((z, i) => {
    const on = s.zoneNotify ? s.zoneNotify[z.id] : z.notify;
    return Object.assign(
      sw(on, '', '', () => {
        a.toggleZoneNotify(z.id);
      }),
      {
        name: z.name,
        address: z.address,
        radius: z.radius,
        divider: i ? '1px solid #24212A' : '0',
        sub: on ? t('Powiadomienia włączone') : t('Powiadomienia wyłączone'),
        subColor: on ? '#86CDB2' : '#9C95A0',
      },
    );
  });
  const packs = (s.packs || api.getSafetyPacks()).map((p, i) => {
    const busy = p.status === 'downloading';
    const ready = p.status === 'ready';
    return {
      name: t('Strefa „') + t(ZONE_NAMES[p.zoneId]) + '”',
      contents: t(p.contents),
      divider: '1px solid #24212A',
      busy,
      progress: p.progress || 0,
      statusText: busy
        ? tf('Pobieranie… {v0}% z {v1}', { v0: p.progress || 0, v1: p.size })
        : ready
          ? t('Gotowy · ') + p.date + ' · ' + p.size
          : t('Nie pobrano · ') + p.size,
      statusColor: ready ? '#86CDB2' : busy ? '#7CC4FF' : '#F2B866',
      btnText: busy ? t('Pobieranie') : ready ? t('Aktualizuj') : t('Pobierz'),
      btnBg: ready || busy ? '#24212A' : '#E3203A',
      btnFg: '#FFFFFF',
      btnBorder: ready || busy ? '#3A3540' : '#E3203A',
      download: function () {
        a.downloadPack(p.zoneId);
      },
    };
  });
  const types = api.getThreatTypes();
  const demoTh = state.demoScenario || s.threatId || 'air';
  const stOff = s.system === 'offline';
  const loc = s.loc || 'zawsze';
  const lang = set.lang || 'pl';
  return {
    editing: state.editing,
    startEdit: () => setState({ editing: true }),
    cancelEdit: () => setState({ editing: false }),
    saveEdit: (profile) => {
      a.updateProfile(profile);
      setState({ editing: false });
    },
    place: chronApi.getPlace(s),
    user: api.getUser(s),
    loggedIn: !!s.loggedIn,
    guest: !s.loggedIn,
    zones,
    packs,
    scope: {
      zonesPressed: set.scope !== 'all' ? 'true' : 'false',
      allPressed: set.scope === 'all' ? 'true' : 'false',
      zonesBg: set.scope !== 'all' ? '#2C2930' : 'transparent',
      allBg: set.scope === 'all' ? '#2C2930' : 'transparent',
    },
    scopeZones: function () {
      a.setSetting('scope', 'zones');
    },
    scopeAll: function () {
      a.setSetting('scope', 'all');
    },
    typeToggles: [
      sw(set.notif.air, t('Zagrożenia z powietrza'), t('Drony, rakiety, alarm powietrzny'), flipNotif('air')),
      sw(set.notif.chem, t('Zagrożenia chemiczne'), t('Wycieki, skażenie powietrza'), flipNotif('chem')),
      sw(set.notif.flood, t('Żywioły'), t('Powódź, wichura, burze'), flipNotif('flood')),
    ],
    volume: set.volume,
    setVolume: function (e) {
      a.setSetting('volume', Number(e.target.value));
    },
    volPresets: [
      [t('Cicho'), 30],
      [t('Głośno'), 70],
      [t('Maksimum'), 100],
    ].map((p) => {
      return Object.assign(seg(set.volume === p[1]), {
        label: p[0],
        pick: function () {
          a.setSetting('volume', p[1]);
        },
      });
    }),
    soundPlaying: state.soundPlaying,
    soundIdle: !state.soundPlaying,
    snd: {
      bg: state.soundPlaying ? '#2C2930' : '#211F25',
      border: state.soundPlaying ? '#F2EFF3' : '#3A3540',
    },
    testSound: function () {
      a.testSound();
      clearTimeout(soundTimer.current);
      setState({
        soundPlaying: true,
      });
      soundTimer.current = setTimeout(() => {
        setState({
          soundPlaying: false,
        });
      }, 1900);
    },
    soundToggles: [
      sw(
        set.loudSilent,
        t('Alarm także w trybie cichym'),
        t('Dźwięk pominie tryb „Nie przeszkadzać”'),
        flip('loudSilent'),
      ),
      sw(set.vibrate, t('Wibracje'), t('Silne, powtarzane wibracje przy alarmie'), flip('vibrate')),
    ],
    lightToggles: [
      sw(set.flashLed, t('Miganie latarki'), t('Dioda LED aparatu miga podczas alarmu'), flip('flashLed')),
      sw(
        set.flashScreen,
        t('Błysk ekranu'),
        t('Ekran pulsuje w kolorze zagrożenia: żółtym lub czerwonym'),
        flip('flashScreen'),
      ),
    ],
    testLight: function () {
      a.testLight();
    },
    demoScenarios: types.map((entry) => {
      return Object.assign(seg(entry.id === demoTh), {
        label: entry.short,
        pick: function () {
          setState({
            demoScenario: entry.id,
          });
        },
      });
    }),
    demoLevels: [
      ['yellow', t('Żółty'), '#C9A43A'],
      ['red', t('Czerwony'), '#C8323F'],
    ].map((d) => {
      return Object.assign(seg(state.demoLevel === d[0]), {
        label: d[1],
        dot: d[2],
        pick: function () {
          setState({
            demoLevel: d[0],
          });
        },
      });
    }),
    startDemo: function () {
      a.startDemoAlarm({
        scenario: demoTh,
        level: state.demoLevel,
      });
    },
    loc: {
      once: loc !== 'zawsze',
      label: loc === 'zawsze' ? t('Zawsze') : t('Tylko teraz'),
      bg: loc === 'zawsze' ? '#10261E' : '#2A2208',
      fg: loc === 'zawsze' ? '#7FE0BE' : '#E6C65E',
      sub: loc === 'zawsze' ? t('Alarmy działają także w tle') : t('Alarmy w tle wymagają dostępu „Zawsze”'),
    },
    setLocAlways: function () {
      a.setLoc('zawsze');
    },
    off: {
      pressed: stOff ? 'true' : 'false',
      track: stOff ? '#3FA57F' : '#3A3540',
      knob: stOff ? 23 : 3,
    },
    toggleOffline: function () {
      a.setSystem(stOff ? 'recovering' : 'offline');
    },
    langs: [
      ['pl', t('Polski')],
      ['en', t('English')],
      ['uk', 'Українська'],
    ].map((l) => {
      const on = lang === l[0];
      return {
        label: l[1],
        pressed: on ? 'true' : 'false',
        bg: on ? '#2C2930' : 'transparent',
        fg: on ? '#FFFFFF' : '#9C95A0',
        pick: function () {
          a.setSetting('lang', l[0]);
        },
      };
    }),
    goGuide: function () {
      a.openGuide();
    },
    login: function () {
      a.login();
    },
    logout: function () {
      if (s.loggedIn) a.logout();
      else a.login();
    },
    logoutText: s.loggedIn ? t('Wyloguj się') : t('Zaloguj się'),
  };
}

/**
 * Profile and settings.
 *
 * @param {object} props
 * @param {AppStore} props.store — global app state
 * @param {AppActions} props.actions — controller actions (navigation, settings)
 */
export default function ProfileScreen(inputProps) {
  const props = inputProps;
  // Timer for the "sound playing" indicator; cleared when leaving the screen.
  const soundTimer = useRef(null);
  useEffect(() => () => clearTimeout(soundTimer.current), []);
  const [state, setState] = useMergedState({
    demoScenario: null,
    demoLevel: 'red',
    soundPlaying: false,
    editing: false,
  });
  const {
    editing,
    startEdit,
    cancelEdit,
    saveEdit,
    place,
    demoLevels,
    demoScenarios,
    goGuide,
    guest,
    langs,
    lightToggles,
    loc,
    loggedIn,
    login,
    logout,
    logoutText,
    off,
    packs,
    scope,
    scopeAll,
    scopeZones,
    setLocAlways,
    setVolume,
    snd,
    soundIdle,
    soundPlaying,
    soundToggles,
    startDemo,
    testLight,
    testSound,
    toggleOffline,
    typeToggles,
    user,
    volPresets,
    volume,
    zones,
  } = buildViewModel(props, state, setState, soundTimer);
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
          {t('Konto i ustawienia')}
        </span>
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
          gap: '18px',
        }}
      >
        {loggedIn && (
          <>
            {editing ? (
              <ProfileEditForm name={user.name} contact={user.phone} onSave={saveEdit} onCancel={cancelEdit} />
            ) : (
              <section
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '16px',
                  borderRadius: '18px',
                  background: '#17151A',
                  border: '1px solid #222026',
                }}
              >
                <span
                  style={{
                    width: '56px',
                    height: '56px',
                    flex: 'none',
                    borderRadius: '28px',
                    background: '#2A0A10',
                    border: '1px solid #5A1A22',
                    color: '#FF6B78',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Unbounded', 'Arial Black', sans-serif",
                    fontWeight: '700',
                    fontSize: '18px',
                  }}
                >
                  {user.initials}
                </span>
                <div
                  style={{
                    flex: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    minWidth: '0',
                  }}
                >
                  <span
                    style={{
                      fontSize: '17px',
                      fontWeight: '800',
                    }}
                  >
                    {user.name}
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      color: '#A49DA6',
                    }}
                  >
                    {user.phone}
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      color: '#A49DA6',
                    }}
                  >
                    {place.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={startEdit}
                  style={{
                    minHeight: '40px',
                    padding: '0 12px',
                    borderRadius: '10px',
                    background: '#24212A',
                    border: '1px solid #3A3540',
                    color: '#F4F1F2',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {t('Edytuj')}
                </button>
              </section>
            )}
          </>
        )}
        {guest && (
          <>
            <section
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '16px',
                borderRadius: '18px',
                background: '#17151A',
                border: '1px solid #222026',
              }}
            >
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: '800',
                }}
              >
                {t('Korzystasz bez konta')}
              </span>
              <span
                style={{
                  fontSize: '13px',
                  lineHeight: '1.5',
                  color: '#A49DA6',
                }}
              >
                {t(
                  'Alarmy, schrony i Safety Pack działają bez konta. Konto zapisze Twoje strefy i ustawienia na innych urządzeniach.',
                )}
              </span>
              <button
                type="button"
                onClick={login}
                style={{
                  minHeight: '50px',
                  border: '0',
                  borderRadius: '14px',
                  background: '#E3203A',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {t('Zaloguj się')}
              </button>
            </section>
          </>
        )}
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
              {t('Poradnik')}
            </span>
            <span
              style={{
                fontSize: '13px',
                color: '#9C95A0',
              }}
            >
              {t('Jak zachować się w sytuacji zagrożenia')}
            </span>
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
        <span
          style={{
            fontSize: '12px',
            fontWeight: '800',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#9C95A0',
          }}
        >
          {t('Zapisane strefy')}
        </span>
        <section
          style={{
            borderRadius: '18px',
            background: '#17151A',
            border: '1px solid #222026',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {(zones || []).map((z, zIndex) => (
            <Fragment key={zIndex}>
              <button
                type="button"
                onClick={z.toggle}
                aria-pressed={z.pressed}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  minHeight: '64px',
                  padding: '12px 18px',
                  border: '0',
                  borderTop: z.divider,
                  background: 'transparent',
                  color: '#F4F1F2',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <span
                  style={{
                    width: '36px',
                    height: '36px',
                    flex: 'none',
                    borderRadius: '10px',
                    background: '#211F25',
                    color: '#DCD5DD',
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
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"></path>
                    <circle cx="12" cy="10" r="2.6"></circle>
                  </svg>
                </span>
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
                      fontSize: '15px',
                      fontWeight: '800',
                    }}
                  >
                    {z.name}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#A49DA6',
                    }}
                  >
                    {z.address}
                    {t(' · promień ')}
                    {z.radius}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      color: z.subColor,
                    }}
                  >
                    {z.sub}
                  </span>
                </span>
                <span
                  style={{
                    width: '50px',
                    height: '30px',
                    flex: 'none',
                    borderRadius: '15px',
                    background: z.track,
                    position: 'relative',
                    display: 'block',
                    transition: 'background .2s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: `${z.knob}px`,
                      width: '24px',
                      height: '24px',
                      borderRadius: '12px',
                      background: '#FFFFFF',
                      display: 'block',
                      transition: 'left .2s',
                    }}
                  ></span>
                </span>
              </button>
            </Fragment>
          ))}
        </section>
        <span
          style={{
            fontSize: '12px',
            fontWeight: '800',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#9C95A0',
          }}
        >
          {t('Safety Pack · offline')}
        </span>
        <section
          style={{
            borderRadius: '18px',
            background: '#17151A',
            border: '1px solid #222026',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <p
            style={{
              margin: '0',
              padding: '14px 18px 4px',
              fontSize: '13px',
              lineHeight: '1.5',
              color: '#C9C1CB',
            }}
          >
            {t('Pakiet działa bez internetu: mapa, schrony, trasy piesze i instrukcje dla wybranej strefy.')}
          </p>
          {(packs || []).map((p, pIndex) => (
            <Fragment key={pIndex}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '14px 18px',
                  borderTop: p.divider,
                }}
              >
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
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      minWidth: '0',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '15px',
                        fontWeight: '800',
                      }}
                    >
                      {p.name}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: p.statusColor,
                      }}
                    >
                      {p.statusText}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#A49DA6',
                      }}
                    >
                      {p.contents}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={p.download}
                    disabled={p.busy}
                    style={{
                      minHeight: '40px',
                      flex: 'none',
                      padding: '0 12px',
                      borderRadius: '10px',
                      border: `1px solid ${p.btnBorder}`,
                      background: p.btnBg,
                      color: p.btnFg,
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {p.btnText}
                  </button>
                </div>
                {p.busy && (
                  <>
                    <span
                      style={{
                        height: '6px',
                        borderRadius: '3px',
                        background: '#2C2830',
                        overflow: 'hidden',
                        display: 'block',
                      }}
                    >
                      <span
                        style={{
                          display: 'block',
                          height: '6px',
                          width: `${p.progress}%`,
                          background: '#4FD1A5',
                          transition: 'width .25s linear',
                        }}
                      ></span>
                    </span>
                  </>
                )}
              </div>
            </Fragment>
          ))}
        </section>
        <span
          style={{
            fontSize: '12px',
            fontWeight: '800',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#A49DA6',
          }}
        >
          {t('Powiadomienia')}
        </span>
        <section
          style={{
            padding: '18px',
            borderRadius: '18px',
            background: '#17151A',
            border: '1px solid #222026',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '4px',
              padding: '4px',
              borderRadius: '12px',
              background: '#0B0A0D',
            }}
          >
            <button
              type="button"
              onClick={scopeZones}
              aria-pressed={scope.zonesPressed}
              style={{
                minHeight: '40px',
                border: '0',
                borderRadius: '9px',
                background: scope.zonesBg,
                color: '#F4F1F2',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {t('Moje strefy')}
            </button>
            <button
              type="button"
              onClick={scopeAll}
              aria-pressed={scope.allPressed}
              style={{
                minHeight: '40px',
                border: '0',
                borderRadius: '9px',
                background: scope.allBg,
                color: '#F4F1F2',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {t('Cała Polska')}
            </button>
          </div>
          {(typeToggles || []).map((tg, tgIndex) => (
            <Fragment key={tgIndex}>
              <button
                type="button"
                onClick={tg.toggle}
                aria-pressed={tg.pressed}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '0',
                  border: '0',
                  background: 'transparent',
                  color: '#F4F1F2',
                  textAlign: 'left',
                  cursor: 'pointer',
                  minHeight: '48px',
                  fontFamily: 'inherit',
                }}
              >
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
                    {tg.title}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#A49DA6',
                    }}
                  >
                    {tg.sub}
                  </span>
                </span>
                <span
                  style={{
                    width: '50px',
                    height: '30px',
                    flex: 'none',
                    borderRadius: '15px',
                    background: tg.track,
                    position: 'relative',
                    display: 'block',
                    transition: 'background .2s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: `${tg.knob}px`,
                      width: '24px',
                      height: '24px',
                      borderRadius: '12px',
                      background: '#FFFFFF',
                      display: 'block',
                      transition: 'left .2s',
                    }}
                  ></span>
                </span>
              </button>
            </Fragment>
          ))}
        </section>
        <span
          style={{
            fontSize: '12px',
            fontWeight: '800',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#9C95A0',
          }}
        >
          {t('Dźwięk alarmu')}
        </span>
        <section
          style={{
            padding: '18px',
            borderRadius: '18px',
            background: '#17151A',
            border: '1px solid #222026',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <label
              htmlFor="alarm-volume"
              style={{
                fontSize: '16px',
                fontWeight: '800',
              }}
            >
              {t('Głośność alarmu')}
            </label>
            <span
              style={{
                fontFamily: "'Unbounded', 'Arial Black', sans-serif",
                fontWeight: '700',
                fontSize: '26px',
                color: '#FFFFFF',
              }}
            >
              {volume}%
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#A49DA6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 9v6h4l5 4V5L8 9z"></path>
            </svg>
            <input
              id="alarm-volume"
              type="range"
              min="0"
              max="100"
              step="5"
              value={volume}
              onChange={setVolume}
              style={{
                flex: '1',
                height: '44px',
                accentColor: '#E3203A',
                cursor: 'pointer',
              }}
            />
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#F4F1F2"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 9v6h4l5 4V5L8 9z"></path>
              <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"></path>
            </svg>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '6px',
            }}
          >
            {(volPresets || []).map((vp, vpIndex) => (
              <Fragment key={vpIndex}>
                <button
                  type="button"
                  onClick={vp.pick}
                  aria-pressed={vp.pressed}
                  style={{
                    minHeight: '44px',
                    borderRadius: '12px',
                    border: `1px solid ${vp.border}`,
                    background: vp.bg,
                    color: '#F4F1F2',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {vp.label}
                </button>
              </Fragment>
            ))}
          </div>
          <button
            type="button"
            onClick={testSound}
            aria-live="polite"
            style={{
              minHeight: '50px',
              borderRadius: '14px',
              border: `1px solid ${snd.border}`,
              background: snd.bg,
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {soundPlaying && (
              <>
                <span
                  aria-hidden="true"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '3px',
                    height: '18px',
                  }}
                >
                  <span
                    style={{
                      width: '3px',
                      height: '18px',
                      borderRadius: '2px',
                      background: '#FFFFFF',
                      transformOrigin: 'bottom',
                      animation: 'chronBars 0.6s ease-in-out infinite',
                    }}
                  ></span>
                  <span
                    style={{
                      width: '3px',
                      height: '18px',
                      borderRadius: '2px',
                      background: '#FFFFFF',
                      transformOrigin: 'bottom',
                      animation: 'chronBars 0.6s ease-in-out 0.15s infinite',
                    }}
                  ></span>
                  <span
                    style={{
                      width: '3px',
                      height: '18px',
                      borderRadius: '2px',
                      background: '#FFFFFF',
                      transformOrigin: 'bottom',
                      animation: 'chronBars 0.6s ease-in-out 0.3s infinite',
                    }}
                  ></span>
                  <span
                    style={{
                      width: '3px',
                      height: '18px',
                      borderRadius: '2px',
                      background: '#FFFFFF',
                      transformOrigin: 'bottom',
                      animation: 'chronBars 0.6s ease-in-out 0.45s infinite',
                    }}
                  ></span>
                </span>
                Odtwarzanie… {volume}%
              </>
            )}
            {soundIdle && (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M7 5l12 7-12 7z"></path>
                </svg>
                {t('Odtwórz testowy alarm')}
              </>
            )}
          </button>
          {(soundToggles || []).map((tg, tgIndex) => (
            <Fragment key={tgIndex}>
              <button
                type="button"
                onClick={tg.toggle}
                aria-pressed={tg.pressed}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '0',
                  border: '0',
                  background: 'transparent',
                  color: '#F4F1F2',
                  textAlign: 'left',
                  cursor: 'pointer',
                  minHeight: '48px',
                  fontFamily: 'inherit',
                }}
              >
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
                    {tg.title}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#A49DA6',
                    }}
                  >
                    {tg.sub}
                  </span>
                </span>
                <span
                  style={{
                    width: '50px',
                    height: '30px',
                    flex: 'none',
                    borderRadius: '15px',
                    background: tg.track,
                    position: 'relative',
                    display: 'block',
                    transition: 'background .2s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: `${tg.knob}px`,
                      width: '24px',
                      height: '24px',
                      borderRadius: '12px',
                      background: '#FFFFFF',
                      display: 'block',
                      transition: 'left .2s',
                    }}
                  ></span>
                </span>
              </button>
            </Fragment>
          ))}
        </section>
        <span
          style={{
            fontSize: '12px',
            fontWeight: '800',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#A49DA6',
          }}
        >
          {t('Sygnał świetlny')}
        </span>
        <section
          style={{
            padding: '18px',
            borderRadius: '18px',
            background: '#17151A',
            border: '1px solid #222026',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {(lightToggles || []).map((tg, tgIndex) => (
            <Fragment key={tgIndex}>
              <button
                type="button"
                onClick={tg.toggle}
                aria-pressed={tg.pressed}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '0',
                  border: '0',
                  background: 'transparent',
                  color: '#F4F1F2',
                  textAlign: 'left',
                  cursor: 'pointer',
                  minHeight: '48px',
                  fontFamily: 'inherit',
                }}
              >
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
                    {tg.title}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#A49DA6',
                    }}
                  >
                    {tg.sub}
                  </span>
                </span>
                <span
                  style={{
                    width: '50px',
                    height: '30px',
                    flex: 'none',
                    borderRadius: '15px',
                    background: tg.track,
                    position: 'relative',
                    display: 'block',
                    transition: 'background .2s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: `${tg.knob}px`,
                      width: '24px',
                      height: '24px',
                      borderRadius: '12px',
                      background: '#FFFFFF',
                      display: 'block',
                      transition: 'left .2s',
                    }}
                  ></span>
                </span>
              </button>
            </Fragment>
          ))}
          <button
            type="button"
            onClick={testLight}
            style={{
              minHeight: '46px',
              borderRadius: '14px',
              border: '1px solid #3A3540',
              background: '#24212A',
              color: '#F4F1F2',
              fontSize: '14px',
              fontWeight: '800',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t('Podgląd sygnału świetlnego')}
          </button>
        </section>
        <span
          style={{
            fontSize: '12px',
            fontWeight: '800',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#9C95A0',
          }}
        >
          {t('Demo alarmu')}
        </span>
        <section
          style={{
            padding: '18px',
            borderRadius: '18px',
            background: '#17151A',
            border: '1px solid #222026',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <p
            style={{
              margin: '0',
              fontSize: '14px',
              lineHeight: '1.45',
              color: '#C9C1CB',
            }}
          >
            {t('Zobacz i usłysz, jak będzie wyglądał alarm — z Twoim dźwiękiem, wibracjami i sygnałem świetlnym.')}
          </p>
          <span
            style={{
              fontSize: '13px',
              fontWeight: '700',
              color: '#A49DA6',
            }}
          >
            {t('Scenariusz')}
          </span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '6px',
            }}
          >
            {(demoScenarios || []).map((ds, dsIndex) => (
              <Fragment key={dsIndex}>
                <button
                  type="button"
                  onClick={ds.pick}
                  aria-pressed={ds.pressed}
                  style={{
                    minHeight: '44px',
                    borderRadius: '12px',
                    border: `1px solid ${ds.border}`,
                    background: ds.bg,
                    color: '#F4F1F2',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {ds.label}
                </button>
              </Fragment>
            ))}
          </div>
          <span
            style={{
              fontSize: '13px',
              fontWeight: '700',
              color: '#A49DA6',
            }}
          >
            {t('Poziom zagrożenia')}
          </span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '6px',
            }}
          >
            {(demoLevels || []).map((dl, dlIndex) => (
              <Fragment key={dlIndex}>
                <button
                  type="button"
                  onClick={dl.pick}
                  aria-pressed={dl.pressed}
                  style={{
                    minHeight: '44px',
                    borderRadius: '12px',
                    border: `1px solid ${dl.border}`,
                    background: dl.bg,
                    color: '#F4F1F2',
                    fontSize: '13px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '5px',
                      background: dl.dot,
                    }}
                  ></span>
                  {dl.label}
                </button>
              </Fragment>
            ))}
          </div>
          <button
            type="button"
            onClick={startDemo}
            style={{
              minHeight: '54px',
              border: '0',
              borderRadius: '14px',
              background: '#E3203A',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 5l12 7-12 7z"></path>
            </svg>
            {t('Uruchom demo alarmu')}
          </button>
        </section>
        <section
          style={{
            borderRadius: '18px',
            background: '#17151A',
            border: '1px solid #222026',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '16px 18px',
              borderBottom: '1px solid #24212A',
            }}
          >
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
                {t('Lokalizacja')}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: '#A49DA6',
                }}
              >
                {loc.sub}
              </span>
            </span>
            {loc.once && (
              <>
                <button
                  type="button"
                  onClick={setLocAlways}
                  style={{
                    minHeight: '34px',
                    padding: '0 10px',
                    borderRadius: '10px',
                    border: '1px solid #3A3540',
                    background: '#211F25',
                    color: '#F2EFF3',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {t('Zmień na „Zawsze”')}
                </button>
              </>
            )}
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '999px',
                background: loc.bg,
                color: loc.fg,
                fontSize: '12px',
                fontWeight: '800',
              }}
            >
              {loc.label}
            </span>
          </div>
          <div
            style={{
              padding: '8px 18px',
              borderBottom: '1px solid #24212A',
            }}
          >
            <button
              type="button"
              onClick={toggleOffline}
              aria-pressed={off.pressed}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '0',
                border: '0',
                background: 'transparent',
                color: '#F4F1F2',
                textAlign: 'left',
                cursor: 'pointer',
                minHeight: '48px',
                fontFamily: 'inherit',
              }}
            >
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
                  {t('Tryb offline')}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    color: '#A49DA6',
                  }}
                >
                  {t('Korzystaj z Safety Pack bez internetu')}
                </span>
              </span>
              <span
                style={{
                  width: '50px',
                  height: '30px',
                  flex: 'none',
                  borderRadius: '15px',
                  background: off.track,
                  position: 'relative',
                  display: 'block',
                  transition: 'background .2s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: `${off.knob}px`,
                    width: '24px',
                    height: '24px',
                    borderRadius: '12px',
                    background: '#FFFFFF',
                    display: 'block',
                    transition: 'left .2s',
                  }}
                ></span>
              </span>
            </button>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '16px 18px',
            }}
          >
            <span
              style={{
                fontSize: '15px',
                fontWeight: '700',
              }}
            >
              {t('Język')}
            </span>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '4px',
                padding: '4px',
                borderRadius: '12px',
                background: '#0B0A0D',
              }}
            >
              {(langs || []).map((lg, lgIndex) => (
                <Fragment key={lgIndex}>
                  <button
                    type="button"
                    onClick={lg.pick}
                    aria-pressed={lg.pressed}
                    style={{
                      minHeight: '40px',
                      border: '0',
                      borderRadius: '9px',
                      background: lg.bg,
                      color: lg.fg,
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {lg.label}
                  </button>
                </Fragment>
              ))}
            </div>
          </div>
        </section>
        <button
          type="button"
          onClick={logout}
          style={{
            minHeight: '50px',
            borderRadius: '14px',
            border: '1px solid #3A3540',
            background: '#17151A',
            color: '#F2EFF3',
            fontSize: '15px',
            fontWeight: '800',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {logoutText}
        </button>
      </div>
    </div>
  );
}
