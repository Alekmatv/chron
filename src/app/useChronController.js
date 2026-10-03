import { useEffect, useMemo, useRef } from 'react';
import chronApi from '@/api/chronApi.js';
import useMergedState from '@/hooks/useMergedState.js';
import { playAlertBeeps, playSiren, vibrateDevice } from '@/app/alarmSignals.js';
import { DEFAULT_LOCATION, distanceMeters, watchLocation } from '@/services/geolocation.js';
import { fetchNearbyShelters } from '@/services/sheltersService.js';
import { fetchLiveThreats } from '@/services/threatsService.js';

/** Shelters are reloaded when the user moves farther than this from the last search point, in meters. */
const SHELTER_RELOAD_DISTANCE_M = 250;

/** How often the live threat feed is refreshed, in milliseconds. */
const THREATS_REFRESH_MS = 60000;

/** Default alarm signal and notification settings. */
const DEFAULT_SETTINGS = {
  volume: 90,
  loudSilent: true,
  vibrate: true,
  flashLed: true,
  flashScreen: true,
  notif: { air: true, chem: true, flood: true },
  scope: 'zones',
  lang: 'pl',
};

/** localStorage key that records completed onboarding. */
const ONBOARDED_KEY = 'chron_onboarded';

/** Last step of the demo scenario. */
const LAST_DEMO_STEP = 6;

/** Safely reads the onboarding flag: localStorage may be unavailable in private mode. */
function readOnboarded() {
  try {
    return window.localStorage.getItem(ONBOARDED_KEY) === '1';
  } catch {
    return false;
  }
}

/** Safely writes (or removes) the onboarding flag. */
function writeOnboarded(value) {
  try {
    if (value) window.localStorage.setItem(ONBOARDED_KEY, '1');
    else window.localStorage.removeItem(ONBOARDED_KEY);
  } catch {
    // Without localStorage, onboarding is simply shown again on the next visit.
  }
}

/** Initial app state. */
function createInitialState() {
  const onboarded = readOnboarded();
  return {
    // User and onboarding
    onboarded,
    loggedIn: onboarded,
    loc: 'zawsze',
    // Navigation: active tab and the stack of screens opened on top of it
    tab: 'map',
    stack: [],
    // Threat and connectivity
    level: 'green',
    threatId: 'air',
    closedIds: [],
    system: 'online',
    syncProgress: 0,
    justSynced: false,
    // Route and emergency mode
    selectedShelterId: null,
    navigating: false,
    emergencyMinimized: false,
    // Device location and real shelters around it (null until loaded; the demo set is used meanwhile)
    location: DEFAULT_LOCATION,
    shelters: null,
    sheltersBuild: null,
    // Live threat feed from official and observational sources (null until loaded)
    liveThreats: null,
    // Profile
    settings: DEFAULT_SETTINGS,
    zoneNotify: { dom: true, praca: true, uczelnia: false },
    packs: chronApi.getSafetyPacks().map((pack) => ({ ...pack })),
    confirmations: {},
    // Demo scenario
    demoStep: 0,
    panelOpen: true,
    // Signals: notification, full-screen alarm, screen flash, shake
    push: null,
    pushVisible: false,
    alarm: null,
    flashing: false,
    shaking: false,
    // Window size, used to choose the mobile or desktop layout
    vw: window.innerWidth,
    vh: window.innerHeight,
  };
}

/**
 * App controller: owns all global state and is the only place where it changes.
 *
 * Returns the current state, the set of actions for screens and the functions
 * that control the demo scenario. Timers live in a ref and are cleared on unmount.
 */
export default function useChronController() {
  const [state, setState] = useMergedState(createInitialState);

  // Latest state for timers and handlers that are created only once.
  const stateRef = useRef(state);
  stateRef.current = state;

  const timers = useRef({});

  const controller = useMemo(() => {
    const getState = () => stateRef.current;
    const t = timers.current;

    /** Pushes a new screen onto the navigation stack. */
    function pushScreen(name, params) {
      setState((s) => ({ stack: s.stack.concat([{ name, params: params || {} }]) }));
    }

    /**
     * Switches the connectivity state. RECOVERING starts a sync sequence:
     * progress grows to 100%, then the system returns to ONLINE.
     */
    function setSystem(system) {
      clearInterval(t.sync);
      clearTimeout(t.synced);
      if (system !== 'recovering') {
        setState({ system, justSynced: false });
        return;
      }
      setState({ system: 'recovering', syncProgress: 0, justSynced: false });
      t.sync = setInterval(() => {
        const progress = Math.min(100, getState().syncProgress + 4);
        if (progress < 100) {
          setState({ syncProgress: progress });
          return;
        }
        clearInterval(t.sync);
        setState({ system: 'online', syncProgress: 100, justSynced: true });
        t.synced = setTimeout(() => setState({ justSynced: false }), 3200);
      }, 110);
    }

    /** Downloads the offline pack for a zone with gradual progress. */
    function downloadPack(zoneId) {
      clearInterval(t.pack);
      const patchPack = (makePatch) =>
        setState((s) => ({
          packs: s.packs.map((pack) => (pack.zoneId === zoneId ? { ...pack, ...makePatch(pack) } : pack)),
        }));

      patchPack(() => ({ status: 'downloading', progress: 0 }));
      t.pack = setInterval(() => {
        const current = getState().packs.find((pack) => pack.zoneId === zoneId);
        const next = Math.min(100, (current.progress || 0) + 7);
        if (next >= 100) {
          clearInterval(t.pack);
          patchPack(() => ({ status: 'ready', progress: 100, date: 'dziś, 14:33', version: 'v2026.10.03' }));
        } else {
          patchPack(() => ({ progress: next }));
        }
      }, 160);
    }

    /** Shakes the phone frame and vibrates the device if enabled in settings. */
    function vibrate() {
      if (!getState().settings.vibrate) return;
      vibrateDevice([200, 120, 200]);
      clearTimeout(t.shake);
      // Reset the animation first so that it plays again.
      setState({ shaking: false });
      setTimeout(() => setState({ shaking: true }), 20);
      t.shake = setTimeout(() => setState({ shaking: false }), 900);
    }

    /** Shows a notification banner at the top of the screen for 6.5 seconds. */
    function showPush(push) {
      clearTimeout(t.push);
      setState({ push, pushVisible: true });
      vibrate();
      t.push = setTimeout(() => setState({ pushVisible: false }), 6500);
    }

    /** Short screen flash in the threat level color. */
    function flash() {
      clearTimeout(t.flash);
      setState({ flashing: true });
      t.flash = setTimeout(() => setState({ flashing: false }), 1800);
    }

    /** Stops the repeating alarm sound and vibration. */
    function stopAlarmLoop() {
      clearInterval(t.alarm);
      vibrateDevice(0);
    }

    /**
     * Full-screen alarm. Red level plays a siren, yellow plays a double beep.
     * In demo mode the sound repeats until the alarm is dismissed.
     */
    function showAlarm(mode, scenario, level) {
      stopAlarmLoop();
      setState({ alarm: { mode, scenario, level } });
      const isRed = level === 'red';
      const play = () => {
        const { settings } = getState();
        if (isRed) playSiren(settings.volume);
        else playAlertBeeps(settings.volume);
        if (settings.vibrate) vibrateDevice(isRed ? [400, 150, 400, 150, 400] : [200, 200, 200]);
      };
      play();
      if (mode === 'demo') t.alarm = setInterval(play, isRed ? 1900 : 2600);
    }

    /** Dismisses the full-screen alarm. */
    function closeAlarm() {
      stopAlarmLoop();
      setState({ alarm: null });
    }

    /** Id of the primary recommended shelter, which becomes closed in the demo scenario. */
    function closedFor(s) {
      const primary = chronApi.getRecommendation({ ...s, level: 'red', closedIds: [], system: 'online' }).primary;
      return primary ? [primary.id] : [];
    }

    /**
     * Moves to a demo scenario step (1–6):
     * 1 GREEN → 2 YELLOW → 3 RED → 4 shelter closed → 5 OFFLINE → 6 RECOVERING.
     */
    function demoGo(step) {
      if (step < 1) return;
      const s = getState();
      const threat = chronApi.getThreat(s.threatId, s, step === 2 ? 'yellow' : 'red');
      const times = chronApi.getTimes();
      clearTimeout(t.push);
      stopAlarmLoop();
      const base = {
        demoStep: step,
        onboarded: true,
        alarm: null,
        pushVisible: false,
        emergencyMinimized: false,
        justSynced: false,
      };
      const freshStart = { closedIds: [], stack: [], navigating: false, selectedShelterId: null };

      if (step === 1) {
        setSystem('online');
        setState({ ...base, ...freshStart, level: 'green', tab: 'map' });
      } else if (step === 2) {
        setSystem('online');
        setState({ ...base, ...freshStart, level: 'yellow', tab: 'map' });
        setTimeout(() => {
          showPush({
            level: 'yellow',
            tag: 'OSTRZEŻENIE',
            title: threat.headline + ' · ' + chronApi.getPlace(s).region,
            text: `${threat.source} · ${times.yellow.source} · do zagrożenia ${threat.ttr}. Sprawdź najbliższy schron.`,
            action: 'threat',
          });
        }, 350);
      } else if (step === 3) {
        setSystem('online');
        setState({ ...base, ...freshStart, level: 'red' });
        if (s.settings.flashScreen) flash();
        vibrate();
        showAlarm('live', s.threatId, 'red');
      } else if (step === 4) {
        // The primary shelter closes while the user is already walking to it.
        const ctx = { ...s, level: 'red', closedIds: [], system: 'online' };
        const first = chronApi.getRecommendation(ctx).primary;
        const closed = first ? [first.id] : [];
        setSystem('online');
        setState({
          ...base,
          level: 'red',
          closedIds: closed,
          stack: first ? [{ name: 'route', params: { id: first.id } }] : [],
          navigating: true,
        });
        const after = chronApi.getRecommendation({ ...ctx, closedIds: closed });
        if (after.reassessment) {
          setTimeout(() => {
            showPush({
              level: 'red',
              tag: 'ZMIANA SCHRONU',
              title: after.reassessment.title,
              text: `Trasa przeliczona: ${after.primary.walk} min pieszo, ${after.primary.hoursLabel.toLowerCase()}.`,
              action: 'route',
            });
          }, 400);
        }
      } else if (step === 5) {
        setState({ ...base, level: 'red', closedIds: s.demoStep >= 4 ? s.closedIds : closedFor(s) });
        setSystem('offline');
      } else if (step === 6) {
        setState({ ...base, level: 'red', closedIds: s.closedIds.length ? s.closedIds : closedFor(s) });
        setSystem('recovering');
      }
    }

    /** Actions that screens receive through the actions prop. */
    const actions = {
      setTab: (tab) => setState({ tab, stack: [] }),
      back: () => setState((s) => ({ stack: s.stack.slice(0, -1), navigating: false })),
      openShelter: (id, replace) =>
        setState((s) => {
          const base = replace ? s.stack.slice(0, -1) : s.stack;
          return { stack: base.concat([{ name: 'shelter', params: { id } }]) };
        }),
      openRoute: (id) =>
        setState((s) => {
          const top = s.stack[s.stack.length - 1];
          const base = top && top.name === 'route' ? s.stack.slice(0, -1) : s.stack;
          return { stack: base.concat([{ name: 'route', params: { id } }]), selectedShelterId: id, navigating: false };
        }),
      openThreat: (threatId, level) => pushScreen('threat', { threatId, level }),
      openLate: (threatId) => pushScreen('late', { threatId }),
      openGuide: (threatId) => pushScreen('guide', { threatId }),
      selectShelter: (id) => setState({ selectedShelterId: id }),
      minimizeEmergency: () => setState({ emergencyMinimized: true, stack: [], tab: 'map' }),
      openEmergency: () => setState({ emergencyMinimized: false, stack: [] }),
      toggleNavigating: () => setState((s) => ({ navigating: !s.navigating })),
      setSetting: (key, value) => setState((s) => ({ settings: { ...s.settings, [key]: value } })),
      toggleZoneNotify: (id) => setState((s) => ({ zoneNotify: { ...s.zoneNotify, [id]: !s.zoneNotify[id] } })),
      downloadPack,
      confirmShelter: (id) =>
        setState((s) => ({ confirmations: { ...s.confirmations, [id]: (s.confirmations[id] || 0) + 1 } })),
      startDemoAlarm: (options) => showAlarm('demo', options.scenario, options.level),
      testSound: () => playSiren(getState().settings.volume),
      testLight: () => {
        if (getState().settings.flashScreen) flash();
      },
      setSystem,
      setLoc: (loc) => setState({ loc }),
      login: () => setState({ loggedIn: true }),
      logout: () => setState({ loggedIn: false }),
      finishOnboarding: (result) => {
        writeOnboarded(true);
        setState({ onboarded: true, loggedIn: !!result.loggedIn, loc: result.loc || 'zawsze', tab: 'map', stack: [] });
      },
    };

    /** Resets to the start: green level, online, scenario not started. */
    function resetAll() {
      stopAlarmLoop();
      setSystem('online');
      setState({
        level: 'green',
        closedIds: [],
        stack: [],
        tab: 'map',
        demoStep: 0,
        alarm: null,
        pushVisible: false,
        navigating: false,
        emergencyMinimized: false,
        selectedShelterId: null,
      });
    }

    /** Restarts onboarding from the beginning. */
    function restartOnboarding() {
      writeOnboarded(false);
      stopAlarmLoop();
      setState({
        onboarded: false,
        alarm: null,
        pushVisible: false,
        stack: [],
        demoStep: 0,
        level: 'green',
        closedIds: [],
      });
    }

    return {
      getState,
      setState,
      actions,
      demoGo,
      setSystem,
      closeAlarm,
      closedFor,
      resetAll,
      restartOnboarding,
    };
  }, [setState]);

  // Watch the device position once onboarding is finished; without permission the default location stays.
  useEffect(() => {
    if (!state.onboarded) return undefined;
    return watchLocation(
      (location) => setState({ location }),
      () => setState({ location: DEFAULT_LOCATION }),
    );
  }, [state.onboarded, setState]);

  // Load shelters around the user, and reload them after a noticeable move.
  const lastShelterSearch = useRef(null);
  useEffect(() => {
    const { location } = state;
    if (lastShelterSearch.current && distanceMeters(lastShelterSearch.current, location) < SHELTER_RELOAD_DISTANCE_M) {
      return;
    }
    lastShelterSearch.current = location;
    fetchNearbyShelters(location)
      .then(({ build, shelters }) => setState({ shelters, sheltersBuild: build }))
      .catch((error) => {
        lastShelterSearch.current = null;
        console.warn('Shelters are unavailable, using the built-in set', error);
      });
  }, [state.location, setState]);

  // Refresh the live threat feed every minute. Skipped while offline: the last known feed stays visible.
  const voivodeship = state.shelters?.[0]?.voivodeship || '';
  const latKey = state.location.lat.toFixed(2);
  const lngKey = state.location.lng.toFixed(2);
  useEffect(() => {
    const load = () => {
      if (stateRef.current.system === 'offline') return;
      fetchLiveThreats(stateRef.current.location, voivodeship)
        .then((liveThreats) => setState({ liveThreats }))
        .catch((error) => console.warn('Live threat feed is unavailable', error));
    };
    load();
    const timer = setInterval(load, THREATS_REFRESH_MS);
    return () => clearInterval(timer);
  }, [latKey, lngKey, voivodeship, setState]);

  // Outside the demo scenario, the connectivity state follows the real sources:
  // DEGRADED when at least one source is unavailable, ONLINE when all respond.
  const failedSources = (state.liveThreats?.sources || []).filter((source) => !source.ok).length;
  useEffect(() => {
    if (state.demoStep !== 0 || !state.liveThreats) return;
    if (failedSources > 0 && state.system === 'online') controller.setSystem('degraded');
    if (failedSources === 0 && state.system === 'degraded') controller.setSystem('online');
  }, [failedSources, state.liveThreats, state.demoStep, state.system, controller]);

  // Window resize and arrow key listeners (arrow keys step through the demo).
  useEffect(() => {
    const onResize = () => setState({ vw: window.innerWidth, vh: window.innerHeight });
    const onKey = (event) => {
      const tag = event.target?.tagName || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const { demoStep } = stateRef.current;
      if (event.key === 'ArrowRight') controller.demoGo(Math.min(LAST_DEMO_STEP, demoStep + 1));
      if (event.key === 'ArrowLeft' && demoStep > 1) controller.demoGo(demoStep - 1);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);

    const activeTimers = timers.current;
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
      Object.values(activeTimers).forEach((id) => {
        clearTimeout(id);
        clearInterval(id);
      });
      vibrateDevice(0);
    };
  }, [controller, setState]);

  return { state, ...controller };
}
