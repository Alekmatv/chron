/**
 * Root component: phone frame, screen switching, notifications, full-screen alarm and the demo scenario panel.
 */
import { Fragment } from 'react';
import BottomNav from '@/components/BottomNav.jsx';
import EmergencyScreen from '@/screens/EmergencyScreen.jsx';
import GuideScreen from '@/screens/GuideScreen.jsx';
import HomeScreen from '@/screens/HomeScreen.jsx';
import Onboarding from '@/screens/Onboarding.jsx';
import ProfileScreen from '@/screens/ProfileScreen.jsx';
import RouteScreen from '@/screens/RouteScreen.jsx';
import ShelterDetail from '@/screens/ShelterDetail.jsx';
import ShelterInPlace from '@/screens/ShelterInPlace.jsx';
import SheltersScreen from '@/screens/SheltersScreen.jsx';
import SystemBanner from '@/components/SystemBanner.jsx';
import ThreatCard from '@/screens/ThreatCard.jsx';
import ThreatsScreen from '@/screens/ThreatsScreen.jsx';
import chronApi from '@/api/chronApi.js';
import useChronController from '@/app/useChronController.js';
import { LocationContext } from '@/app/LocationContext.js';
import ErrorBoundary from '@/components/ErrorBoundary.jsx';

const LEVEL_UI = {
  green: { label: 'GREEN', color: '#86CDB2', dot: '#4FD1A5' },
  yellow: { label: 'YELLOW', color: '#E6C65E', dot: '#C9A43A' },
  red: { label: 'RED', color: '#FF7A85', dot: '#FF2D3D' },
};
const STEP_COLORS = ['#86CDB2', '#E6C65E', '#FF7A85', '#C9C1CB', '#C9C1CB', '#7CC4FF'];

/** Builds view data from the controller state: which screen to show and the texts for notifications, the alarm and the demo panel. */
function buildViewModel(controller) {
  const s = controller.state,
    a = controller.actions,
    api = chronApi;
  const mobile = s.vw < 760;
  const appH = mobile ? s.vh : Math.max(560, Math.min(844, s.vh - 48));
  const top = s.stack[s.stack.length - 1];
  const emergencyBase = s.level === 'red' && !s.emergencyMinimized;
  const screen = top ? top.name : emergencyBase ? 'emergency' : s.tab;
  const scr = {};
  ['map', 'threats', 'shelters', 'profile', 'emergency', 'threat', 'shelter', 'route', 'late', 'guide'].forEach((k) => {
    scr[k] = screen === k;
  });
  scr.home = scr.map;

  const pushData = s.push || { level: 'yellow', tag: '', title: '', text: '' };
  const pushRed = pushData.level === 'red';

  let al = {};
  if (s.alarm) {
    const red = s.alarm.level === 'red';
    const th = api.getThreat(s.alarm.scenario, s, s.alarm.level);
    const onOff = function (on) {
      return on ? '#FFFFFF' : '#7D7580';
    };
    const set = s.settings;
    al = {
      isDemo: s.alarm.mode === 'demo',
      tag: s.alarm.mode === 'demo' ? 'TRYB DEMO' : 'ALARM · SYMULACJA PEŁNOEKRANOWA',
      bg: red ? '#1A0306' : '#1C1705',
      color: red ? '#FF2D3D' : '#F2CC3D',
      fg: red ? '#FFFFFF' : '#1A1405',
      text: red ? '#FF7A85' : '#E6C65E',
      glow: red ? 'rgba(255,45,61,.45)' : 'rgba(242,204,61,.4)',
      flash: set.flashScreen,
      flashSpeed: red ? '0.45s' : '0.9s',
      led: set.flashLed,
      levelLabel: red ? 'Czerwony · Wysokie zagrożenie' : 'Żółty · Podwyższone zagrożenie',
      title: red ? th.title : th.headline,
      kind: th.kind,
      source: th.source,
      time: th.sourceTime,
      text2: th.text,
      todo: th.todo.map((x, i) => {
        return { n: i + 1, text: x };
      }),
      chips: [
        {
          label: 'Dźwięk ' + set.volume + '%' + (set.loudSilent ? ' · także w trybie cichym' : ''),
          color: onOff(set.volume > 0),
        },
        { label: 'Wibracje ' + (set.vibrate ? 'wł.' : 'wył.'), color: onOff(set.vibrate) },
        { label: 'Latarka ' + (set.flashLed ? 'wł.' : 'wył.'), color: onOff(set.flashLed) },
        { label: 'Błysk ekranu ' + (set.flashScreen ? 'wł.' : 'wył.'), color: onOff(set.flashScreen) },
      ],
    };
  }

  const steps = api.getDemoSteps().map((st, i) => {
    const cur = s.demoStep === st.n,
      done = s.demoStep > st.n;
    return Object.assign({}, st, {
      current: cur ? 'step' : 'false',
      color: STEP_COLORS[i],
      bg: cur ? '#1C1A20' : 'transparent',
      border: cur ? '#F2EFF3' : '#222026',
      numBg: cur ? '#E3203A' : done ? '#2C2930' : '#1C1A20',
      numFg: '#FFFFFF',
      go: function () {
        controller.demoGo(st.n);
      },
    });
  });
  function seg(on) {
    return { pressed: on ? 'true' : 'false', bg: on ? '#2C2930' : '#17151A', border: on ? '#F2EFF3' : '#2A272E' };
  }

  return {
    screenKey: screen,
    placeLabel: api.getPlace(s).label,
    showOnboarding: !s.onboarded,
    showApp: s.onboarded,
    store: s,
    actions: a,
    params: top ? top.params : {},
    scr,
    tab: s.tab,
    level: s.level,
    setTab: a.setTab,
    showNav: !top && !emergencyBase,
    showRedStrip: s.level === 'red' && s.emergencyMinimized && !top,
    openEmergency: a.openEmergency,
    systemInfo: api.getSystemInfo(
      s.system,
      s.syncProgress,
      (s.liveThreats ? s.liveThreats.sources : []).filter((x) => !x.ok).map((x) => x.name),
    ),
    bannerVisible: s.system !== 'online' || s.justSynced,
    page: { padding: mobile ? '0' : '24px' },
    frame: mobile
      ? {
          w: '100vw',
          h: appH + 'px',
          radius: '0',
          bezel: '0',
          outerRadius: '0',
          bezelBg: 'transparent',
          border: '0',
          shadow: 'none',
          anim: s.shaking ? 'chronShake .1s 8' : 'none',
        }
      : {
          w: '390px',
          h: appH + 'px',
          radius: '42px',
          bezel: '10px',
          outerRadius: '52px',
          bezelBg: '#17151A',
          border: '1px solid #2C2830',
          shadow: '0 40px 100px rgba(0,0,0,.6)',
          anim: s.shaking ? 'chronShake .1s 8' : 'none',
        },
    push: {
      y: s.pushVisible ? '0' : '-160%',
      opacity: s.pushVisible ? 1 : 0,
      hidden: s.pushVisible ? 'false' : 'true',
      tab: s.pushVisible ? 0 : -1,
      border: pushRed ? '#E3203A' : '#C9A43A',
      color: pushRed ? '#FF7A85' : '#E6C65E',
      tag: pushData.tag,
      title: pushData.title,
      text: pushData.text,
    },
    tapPush: function () {
      if (!s.push) return;
      controller.setState({ pushVisible: false });
      if (s.push.action === 'threat') a.openThreat(s.threatId);
    },
    flashing: s.flashing,
    flashColor: s.level === 'red' ? '#FF2D3D' : '#F2CC3D',
    alarmOn: !!s.alarm,
    al,
    alarmPlan: function () {
      const m = s.alarm;
      controller.closeAlarm();
      if (m.mode === 'demo') a.openLate(m.scenario);
    },
    alarmDetails: function () {
      const m = s.alarm;
      controller.closeAlarm();
      a.openThreat(m.scenario, m.level);
    },
    stopAlarm: controller.closeAlarm,
    panelOpen: s.panelOpen,
    panelClosed: !s.panelOpen,
    panel: mobile
      ? {
          position: 'fixed',
          left: '0',
          right: '0',
          bottom: '0',
          width: 'auto',
          maxHeight: '62vh',
          radius: '24px 24px 0 0',
        }
      : {
          position: 'relative',
          left: 'auto',
          right: 'auto',
          bottom: 'auto',
          width: '330px',
          maxHeight: appH + 20 + 'px',
          radius: '24px',
        },
    panelPill: mobile ? { right: '12px', bottom: '100px' } : { right: '24px', bottom: '24px' },
    togglePanel: function () {
      controller.setState({ panelOpen: !controller.getState().panelOpen });
    },
    demoStepLabel: s.demoStep ? s.demoStep + '/6' : '—',
    threatOpts: api.getThreatTypes().map((t) => {
      return Object.assign(seg(t.id === s.threatId), {
        label: t.short,
        pick: function () {
          controller.setState({ threatId: t.id, selectedShelterId: null });
          if (controller.getState().demoStep >= 4)
            controller.setState({
              closedIds: controller.closedFor(Object.assign({}, controller.getState(), { threatId: t.id })),
            });
        },
      });
    }),
    steps,
    nextText: s.demoStep === 0 ? 'Rozpocznij scenariusz →' : s.demoStep >= 6 ? 'Od początku ↺' : 'Następny krok →',
    nextStep: function () {
      controller.demoGo(s.demoStep >= 6 ? 1 : s.demoStep + 1);
    },
    prevStep: function () {
      if (s.demoStep > 1) controller.demoGo(s.demoStep - 1);
    },
    levelOpts: ['green', 'yellow', 'red'].map((l) => {
      return Object.assign(seg(s.level === l), {
        label: LEVEL_UI[l].label,
        dot: LEVEL_UI[l].dot,
        pick: function () {
          controller.setState({
            level: l,
            stack: [],
            emergencyMinimized: false,
            closedIds: l === 'red' ? controller.getState().closedIds : [],
          });
        },
      });
    }),
    systemOpts: ['online', 'degraded', 'offline', 'recovering'].map((k) => {
      return Object.assign(seg(s.system === k), {
        label: k.toUpperCase(),
        pick: function () {
          controller.setSystem(k);
        },
      });
    }),
    restartOnboarding: controller.restartOnboarding,
    resetAll: controller.resetAll,
  };
}

export default function App() {
  const controller = useChronController();
  const {
    screenKey,
    placeLabel,
    actions,
    al,
    alarmDetails,
    alarmOn,
    alarmPlan,
    bannerVisible,
    demoStepLabel,
    flashColor,
    flashing,
    frame,
    level,
    levelOpts,
    nextStep,
    nextText,
    openEmergency,
    page,
    panel,
    panelClosed,
    panelOpen,
    panelPill,
    params,
    prevStep,
    push,
    resetAll,
    restartOnboarding,
    scr,
    setTab,
    showApp,
    showNav,
    showOnboarding,
    showRedStrip,
    steps,
    stopAlarm,
    store,
    systemInfo,
    systemOpts,
    tab,
    tapPush,
    threatOpts,
    togglePanel,
  } = buildViewModel(controller);
  return (
    <LocationContext.Provider value={controller.state.location}>
      <div
        style={{
          minHeight: '100vh',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '32px',
          padding: page.padding,
          background: 'radial-gradient(circle at 50% 38%, #22090E 0%, #0B0A0D 62%)',
          fontFamily: "'Manrope', system-ui, sans-serif",
          color: '#F4F1F2',
        }}
      >
        <div
          style={{
            flex: 'none',
            padding: frame.bezel,
            borderRadius: frame.outerRadius,
            background: frame.bezelBg,
            border: frame.border,
            boxShadow: frame.shadow,
            animation: frame.anim,
          }}
        >
          <div
            data-screen-label="Aplikacja"
            style={{
              position: 'relative',
              width: frame.w,
              height: frame.h,
              borderRadius: frame.radius,
              overflow: 'hidden',
              background: '#0B0A0D',
              display: 'flex',
              flexDirection: 'column',
              transform: 'translateZ(0)',
            }}
          >
            {showOnboarding && (
              <>
                <div style={{ flex: '1', minHeight: '0' }}>
                  <div style={{ height: '100%' }}>
                    <Onboarding actions={actions} />
                  </div>
                </div>
              </>
            )}
            {showApp && (
              <>
                <SystemBanner info={systemInfo} visible={bannerVisible} />
                {showRedStrip && (
                  <>
                    <button
                      type="button"
                      onClick={openEmergency}
                      style={{
                        flex: 'none',
                        margin: '8px 12px 0',
                        padding: '10px 14px',
                        minHeight: '44px',
                        borderRadius: '14px',
                        background: 'rgba(200,50,63,.18)',
                        border: '1px solid #5A1A22',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '13px',
                        fontWeight: '800',
                        animation: 'chronIn .3s ease both',
                      }}
                    >
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          flex: 'none',
                          borderRadius: '4px',
                          background: '#FF2D3D',
                          animation: 'schronLive 1.2s infinite',
                        }}
                      ></span>
                      <span style={{ flex: '1' }}>ALARM AKTYWNY · wróć do planu działania</span>
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
                        <path d="M9 5l7 7-7 7"></path>
                      </svg>
                    </button>
                  </>
                )}
                <div style={{ flex: '1', minHeight: '0', position: 'relative' }}>
                  <ErrorBoundary resetKey={screenKey}>
                    {scr.home && (
                      <>
                        <div style={{ height: '100%' }}>
                          <HomeScreen store={store} actions={actions} />
                        </div>
                      </>
                    )}
                    {scr.threats && (
                      <>
                        <div style={{ height: '100%' }}>
                          <ThreatsScreen store={store} actions={actions} />
                        </div>
                      </>
                    )}
                    {scr.shelters && (
                      <>
                        <div style={{ height: '100%' }}>
                          <SheltersScreen store={store} actions={actions} />
                        </div>
                      </>
                    )}
                    {scr.profile && (
                      <>
                        <div style={{ height: '100%' }}>
                          <ProfileScreen store={store} actions={actions} />
                        </div>
                      </>
                    )}
                    {scr.emergency && (
                      <>
                        <div style={{ height: '100%' }}>
                          <EmergencyScreen store={store} actions={actions} />
                        </div>
                      </>
                    )}
                    {scr.threat && (
                      <>
                        <div style={{ height: '100%' }}>
                          <ThreatCard store={store} actions={actions} params={params} />
                        </div>
                      </>
                    )}
                    {scr.shelter && (
                      <>
                        <div style={{ height: '100%' }}>
                          <ShelterDetail store={store} actions={actions} params={params} />
                        </div>
                      </>
                    )}
                    {scr.route && (
                      <>
                        <div style={{ height: '100%' }}>
                          <RouteScreen store={store} actions={actions} params={params} />
                        </div>
                      </>
                    )}
                    {scr.late && (
                      <>
                        <div style={{ height: '100%' }}>
                          <ShelterInPlace store={store} actions={actions} params={params} />
                        </div>
                      </>
                    )}
                    {scr.guide && (
                      <>
                        <div style={{ height: '100%' }}>
                          <GuideScreen actions={actions} params={params} />
                        </div>
                      </>
                    )}
                  </ErrorBoundary>
                </div>
                {showNav && (
                  <>
                    <BottomNav tab={tab} alertLevel={level} onTab={setTab} />
                  </>
                )}
              </>
            )}
            <button
              type="button"
              onClick={tapPush}
              aria-hidden={push.hidden}
              tabIndex={push.tab}
              style={{
                position: 'absolute',
                left: '10px',
                right: '10px',
                top: '10px',
                zIndex: '70',
                padding: '14px',
                borderRadius: '18px',
                background: 'rgba(23,21,26,.97)',
                border: `1px solid ${push.border}`,
                boxShadow: '0 12px 40px rgba(0,0,0,.6)',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                textAlign: 'left',
                color: '#F4F1F2',
                cursor: 'pointer',
                transform: `translateY(${push.y})`,
                opacity: push.opacity,
                transition: 'transform .5s cubic-bezier(.2,.9,.3,1.1), opacity .4s',
                backdropFilter: 'blur(8px)',
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="22" height="20" viewBox="0 0 72 64" fill="none" aria-hidden="true">
                  <path
                    d="M10 56V28L36 8L62 28V56"
                    stroke="#FF2D3D"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></path>
                  <path d="M24 56V42a12 12 0 0 1 24 0V56" stroke="#FF2D3D" strokeWidth="6" strokeLinecap="round"></path>
                </svg>
              </span>
              <span style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '8px',
                    fontSize: '12px',
                    fontWeight: '800',
                    letterSpacing: '0.06em',
                    color: push.color,
                  }}
                >
                  <span>CHROŃ · {push.tag}</span>
                  <span style={{ color: '#A49DA6', fontWeight: '700', letterSpacing: '0' }}>teraz</span>
                </span>
                <span style={{ fontSize: '15px', fontWeight: '800', lineHeight: '1.3' }}>{push.title}</span>
                <span style={{ fontSize: '13px', lineHeight: '1.4', color: '#C9C1CB' }}>{push.text}</span>
              </span>
            </button>
            {flashing && (
              <>
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: '0',
                    top: '0',
                    width: '100%',
                    height: '100%',
                    zIndex: '80',
                    pointerEvents: 'none',
                    background: flashColor,
                    animation: 'chronFlash 0.22s steps(1) 8 alternate both',
                  }}
                ></div>
              </>
            )}
            {alarmOn && (
              <>
                <div
                  role="alertdialog"
                  aria-label="Alarm"
                  style={{
                    position: 'absolute',
                    left: '0',
                    top: '0',
                    width: '100%',
                    height: '100%',
                    zIndex: '90',
                    background: al.bg,
                    overflow: 'hidden',
                  }}
                >
                  {al.flash && (
                    <>
                      <div
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: '0',
                          top: '0',
                          width: '100%',
                          height: '100%',
                          background: al.color,
                          animation: `chronFlash ${al.flashSpeed} steps(1) infinite alternate`,
                          pointerEvents: 'none',
                        }}
                      ></div>
                    </>
                  )}
                  <div
                    style={{
                      position: 'relative',
                      height: '100%',
                      boxSizing: 'border-box',
                      padding: '32px 20px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      overflowY: 'auto',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span
                        style={{
                          padding: '5px 10px',
                          borderRadius: '999px',
                          background: 'rgba(0,0,0,.55)',
                          border: '1px solid rgba(255,255,255,.25)',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: '800',
                          letterSpacing: '0.08em',
                        }}
                      >
                        {al.tag}
                      </span>
                      {al.led && (
                        <>
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '5px 10px',
                              borderRadius: '999px',
                              background: 'rgba(0,0,0,.55)',
                              color: '#FFFFFF',
                              fontSize: '12px',
                              fontWeight: '700',
                            }}
                          >
                            <span
                              style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '6px',
                                background: '#FFFFFF',
                                boxShadow: '0 0 12px #FFFFFF',
                                animation: 'chronFlash 0.35s steps(1) infinite alternate',
                              }}
                            ></span>
                            Latarka miga
                          </span>
                        </>
                      )}
                    </div>
                    <div style={{ flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <section
                        style={{
                          borderRadius: '24px',
                          padding: '24px 22px',
                          background: 'rgba(14,12,17,.94)',
                          border: `2px solid ${al.color}`,
                          boxShadow: `0 0 40px ${al.glow}`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px',
                          animation: 'chronShake .12s 8',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <svg width="26" height="23" viewBox="0 0 72 64" fill="none" aria-hidden="true">
                            <path
                              d="M10 56V28L36 8L62 28V56"
                              stroke={al.color}
                              strokeWidth="5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            ></path>
                            <path
                              d="M24 56V42a12 12 0 0 1 24 0V56"
                              stroke={al.color}
                              strokeWidth="5"
                              strokeLinecap="round"
                            ></path>
                            <circle cx="36" cy="27" r="3.4" fill={al.color}></circle>
                          </svg>
                          <span
                            style={{ fontSize: '13px', fontWeight: '800', letterSpacing: '0.1em', color: '#DCD5DD' }}
                          >
                            CHROŃ · TERAZ
                          </span>
                        </div>
                        <span
                          style={{
                            alignSelf: 'flex-start',
                            padding: '5px 12px',
                            borderRadius: '10px',
                            background: al.color,
                            color: al.fg,
                            fontSize: '13px',
                            fontWeight: '800',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {al.levelLabel}
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
                          {al.title}
                        </span>
                        <span
                          style={{
                            fontSize: '17px',
                            fontWeight: '800',
                            color: al.text,
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em',
                          }}
                        >
                          Zagrożenie: {al.kind}
                        </span>
                        <span style={{ fontSize: '14px', color: '#A49DA6' }}>
                          {placeLabel} · {al.source} {al.time}
                        </span>
                        <p style={{ margin: '0', fontSize: '15px', lineHeight: '1.45', color: '#F4F1F2' }}>
                          {al.text2}
                        </p>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            padding: '14px',
                            borderRadius: '14px',
                            background: 'rgba(255,255,255,.06)',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: '800',
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              color: '#C9C1CB',
                            }}
                          >
                            Co robić teraz
                          </span>
                          {(al.todo || []).map((dt, dtIndex) => (
                            <Fragment key={dtIndex}>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                <span
                                  style={{
                                    minWidth: '22px',
                                    height: '22px',
                                    borderRadius: '11px',
                                    background: al.color,
                                    color: al.fg,
                                    fontSize: '12px',
                                    fontWeight: '800',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {dt.n}
                                </span>
                                <span
                                  style={{ fontSize: '15px', fontWeight: '700', lineHeight: '1.4', color: '#FFFFFF' }}
                                >
                                  {dt.text}
                                </span>
                              </div>
                            </Fragment>
                          ))}
                        </div>
                      </section>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {(al.chips || []).map((dc, dcIndex) => (
                        <Fragment key={dcIndex}>
                          <span
                            style={{
                              padding: '6px 10px',
                              borderRadius: '10px',
                              background: 'rgba(0,0,0,.6)',
                              border: '1px solid rgba(255,255,255,.18)',
                              color: dc.color,
                              fontSize: '12px',
                              fontWeight: '700',
                            }}
                          >
                            {dc.label}
                          </span>
                        </Fragment>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={alarmPlan}
                        style={{
                          minHeight: '54px',
                          border: '0',
                          borderRadius: '16px',
                          background: al.color,
                          color: al.fg,
                          fontSize: '15px',
                          fontWeight: '800',
                          cursor: 'pointer',
                        }}
                      >
                        Plan działania
                      </button>
                      <button
                        type="button"
                        onClick={alarmDetails}
                        style={{
                          minHeight: '54px',
                          borderRadius: '16px',
                          border: '1px solid rgba(255,255,255,.4)',
                          background: 'rgba(0,0,0,.55)',
                          color: '#FFFFFF',
                          fontSize: '15px',
                          fontWeight: '800',
                          cursor: 'pointer',
                        }}
                      >
                        Szczegóły
                      </button>
                    </div>
                    {al.isDemo && (
                      <>
                        <button
                          type="button"
                          onClick={stopAlarm}
                          style={{
                            minHeight: '48px',
                            borderRadius: '14px',
                            border: '0',
                            background: 'transparent',
                            color: '#DCD5DD',
                            fontSize: '15px',
                            fontWeight: '700',
                            textDecoration: 'underline',
                            textUnderlineOffset: '3px',
                            cursor: 'pointer',
                          }}
                        >
                          Zakończ demo
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        {panelOpen && (
          <>
            <aside
              data-screen-label="Panel demo"
              aria-label="Panel sterowania demo"
              style={{
                position: panel.position,
                left: panel.left,
                right: panel.right,
                bottom: panel.bottom,
                zIndex: '100',
                width: panel.width,
                maxHeight: panel.maxHeight,
                boxSizing: 'border-box',
                overflowY: 'auto',
                overflowX: 'hidden',
                scrollbarWidth: 'none',
                padding: '18px',
                borderRadius: panel.radius,
                background: '#121015',
                border: '1px solid #222026',
                boxShadow: '0 20px 60px rgba(0,0,0,.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                animation: 'chronIn .3s ease both',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span
                    style={{
                      fontFamily: "'Unbounded', 'Arial Black', sans-serif",
                      fontWeight: '500',
                      fontSize: '15px',
                    }}
                  >
                    Scenariusz demo
                  </span>
                  <span style={{ fontSize: '12px', color: '#A49DA6' }}>Od zagrożenia do działania · ← → klawisze</span>
                </span>
                <button
                  type="button"
                  onClick={togglePanel}
                  aria-label="Ukryj panel"
                  style={{
                    width: '40px',
                    height: '40px',
                    flex: 'none',
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
                    width="16"
                    height="16"
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#9C95A0' }}>Typ zagrożenia</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
                  {(threatOpts || []).map((t, tIndex) => (
                    <Fragment key={tIndex}>
                      <button
                        type="button"
                        onClick={t.pick}
                        aria-pressed={t.pressed}
                        style={{
                          minHeight: '40px',
                          borderRadius: '10px',
                          border: `1px solid ${t.border}`,
                          background: t.bg,
                          color: '#F4F1F2',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        {t.label}
                      </button>
                    </Fragment>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(steps || []).map((st, stIndex) => (
                  <Fragment key={stIndex}>
                    <button
                      type="button"
                      onClick={st.go}
                      aria-current={st.current}
                      style={{
                        width: '100%',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start',
                        padding: '10px 12px',
                        borderRadius: '14px',
                        border: `1px solid ${st.border}`,
                        background: st.bg,
                        color: '#F4F1F2',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background .25s, border-color .25s',
                      }}
                    >
                      <span
                        style={{
                          minWidth: '26px',
                          height: '26px',
                          flex: 'none',
                          borderRadius: '13px',
                          background: st.numBg,
                          color: st.numFg,
                          fontSize: '12px',
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {st.n}
                      </span>
                      <span style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '800' }}>
                          <span style={{ color: st.color, letterSpacing: '0.04em' }}>{st.title}</span> · {st.label}
                        </span>
                        <span style={{ fontSize: '12px', lineHeight: '1.4', color: '#A49DA6' }}>{st.desc}</span>
                      </span>
                    </button>
                  </Fragment>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={prevStep}
                  style={{
                    minHeight: '48px',
                    borderRadius: '14px',
                    border: '1px solid #3A3540',
                    background: '#17151A',
                    color: '#F2EFF3',
                    fontSize: '14px',
                    fontWeight: '800',
                    cursor: 'pointer',
                  }}
                >
                  ← Wstecz
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  style={{
                    minHeight: '48px',
                    border: '0',
                    borderRadius: '14px',
                    background: '#E3203A',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: '800',
                    cursor: 'pointer',
                  }}
                >
                  {nextText}
                </button>
              </div>
              <div style={{ height: '1px', background: '#222026' }}></div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '800',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#9C95A0',
                }}
              >
                Sterowanie ręczne
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#9C95A0' }}>Status zagrożenia</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
                  {(levelOpts || []).map((l, lIndex) => (
                    <Fragment key={lIndex}>
                      <button
                        type="button"
                        onClick={l.pick}
                        aria-pressed={l.pressed}
                        style={{
                          minHeight: '40px',
                          borderRadius: '10px',
                          border: `1px solid ${l.border}`,
                          background: l.bg,
                          color: '#F4F1F2',
                          fontSize: '12px',
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ width: '8px', height: '8px', borderRadius: '4px', background: l.dot }}></span>
                        {l.label}
                      </button>
                    </Fragment>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#9C95A0' }}>Stan systemu</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px' }}>
                  {(systemOpts || []).map((o, oIndex) => (
                    <Fragment key={oIndex}>
                      <button
                        type="button"
                        onClick={o.pick}
                        aria-pressed={o.pressed}
                        style={{
                          minHeight: '40px',
                          borderRadius: '10px',
                          border: `1px solid ${o.border}`,
                          background: o.bg,
                          color: '#F4F1F2',
                          fontSize: '12px',
                          fontWeight: '800',
                          letterSpacing: '0.04em',
                          cursor: 'pointer',
                        }}
                      >
                        {o.label}
                      </button>
                    </Fragment>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                <button
                  type="button"
                  onClick={restartOnboarding}
                  style={{
                    minHeight: '44px',
                    borderRadius: '12px',
                    border: '1px solid #3A3540',
                    background: '#17151A',
                    color: '#F2EFF3',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  Onboarding
                </button>
                <button
                  type="button"
                  onClick={resetAll}
                  style={{
                    minHeight: '44px',
                    borderRadius: '12px',
                    border: '1px solid #3A3540',
                    background: '#17151A',
                    color: '#F2EFF3',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  Reset
                </button>
              </div>
            </aside>
          </>
        )}
        {panelClosed && (
          <>
            <button
              type="button"
              onClick={togglePanel}
              style={{
                position: 'fixed',
                right: panelPill.right,
                bottom: panelPill.bottom,
                zIndex: '100',
                minHeight: '44px',
                padding: '0 16px',
                borderRadius: '999px',
                background: '#17151A',
                border: '1px solid #3A3540',
                color: '#F4F1F2',
                fontSize: '13px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 8px 30px rgba(0,0,0,.5)',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '4px', background: '#FF2D3D' }}></span>Panel
              demo · krok {demoStepLabel}
            </button>
          </>
        )}
      </div>
    </LocationContext.Provider>
  );
}
