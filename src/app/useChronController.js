import { useEffect, useMemo, useRef } from 'react';
import chronApi from '@/api/chronApi.js';
import useMergedState from '@/hooks/useMergedState.js';
import { playAlertBeeps, playSiren, vibrateDevice } from '@/app/alarmSignals.js';
import { DEFAULT_LOCATION, distanceMeters, watchLocation } from '@/services/geolocation.js';
import { fetchNearbyShelters, relocateShelters } from '@/services/sheltersService.js';
import { loadLastShelters, loadPacks, saveLastShelters } from '@/services/offlineStore.js';
import { downloadSafetyPack } from '@/services/safetyPack.js';
import { showSystemNotification } from '@/services/notifications.js';
import { fetchLiveThreats } from '@/services/threatsService.js';
import { getLanguage, setLanguage, t, tf } from '@/i18n/index.js';

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
  notif: {
    air: true,
    chem: true,
    flood: true,
  },
  scope: 'zones',
  lang: getLanguage(),
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

/** Saved shelters are used offline only within this distance from where they were downloaded, in meters. */
const OFFLINE_SHELTERS_MAX_DISTANCE_M = 10000;

/**
 * Safety Packs for the user's zones: downloaded packs from the device,
 * zones without a downloaded pack are offered for download.
 */
function initialPacks() {
  const saved = loadPacks();
  return chronApi.getSafetyPacks().map((pack) => {
    const stored = saved[pack.zoneId];
    if (!stored)
      return {
        ...pack,
        status: 'none',
        date: '',
        version: '',
      };
    const { shelters, ...meta } = stored; // shelters stay in storage; state keeps only metadata
    return {
      ...pack,
      ...meta,
    };
  });
}

/**
 * Shelters saved on the device for offline use: the last loaded list or the
 * nearest downloaded Safety Pack, recalculated for the current location.
 */
function offlineShelters(location) {
  const sources = [loadLastShelters(), ...Object.values(loadPacks())].filter(
    (entry) => entry && entry.shelters && entry.shelters.length,
  );
  const near = sources
    .map((entry) => ({
      entry,
      distance: distanceMeters(entry.location || entry.center, location),
    }))
    .filter(({ distance }) => distance <= OFFLINE_SHELTERS_MAX_DISTANCE_M)
    .sort((a, b) => a.distance - b.distance)[0];
  return near ? relocateShelters(near.entry.shelters, location) : null;
}

/** HH:MM when shelters were last saved on the device; used as the data time when starting offline. */
function lastSavedTime() {
  const savedAt = loadLastShelters()?.savedAt;
  return savedAt
    ? new Date(savedAt).toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;
}

/** Initial app state. */
function createInitialState() {
  const onboarded = readOnboarded();
  const networkOnline = navigator.onLine !== false;
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
    system: networkOnline ? 'online' : 'offline',
    networkOnline,
    // HH:MM of the last fresh data when the device really lost the connection (null otherwise)
    offlineSince: networkOnline ? null : lastSavedTime(),
    syncProgress: 0,
    justSynced: false,
    // Route and emergency mode
    selectedShelterId: null,
    navigating: false,
    emergencyMinimized: false,
    // Device location and real shelters around it (null until loaded; the demo set is used meanwhile)
    location: DEFAULT_LOCATION,
    shelters: offlineShelters(DEFAULT_LOCATION),
    sheltersBuild: null,
    // Live threat feed from official and observational sources (null until loaded)
    liveThreats: null,
    // Profile
    settings: DEFAULT_SETTINGS,
    zoneNotify: {
      dom: true,
      praca: true,
      uczelnia: false,
    },
    packs: initialPacks(),
    confirmations: {},
    // Demo scenario
    demoStep: 0,
    panelOpen: false,
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
    const entry = timers.current;

    /** Pushes a new screen onto the navigation stack. */
    function pushScreen(name, params) {
      setState((s) => ({
        stack: s.stack.concat([
          {
            name,
            params: params || {},
          },
        ]),
      }));
    }

    /**
     * Switches the connectivity state. RECOVERING starts a sync sequence:
     * progress grows to 100%, then the system returns to ONLINE.
     */
    function setSystem(system) {
      clearInterval(entry.sync);
      clearTimeout(entry.synced);
      if (system !== 'recovering') {
        setState({
          system,
          justSynced: false,
        });
        return;
      }
      setState({
        system: 'recovering',
        syncProgress: 0,
        justSynced: false,
      });
      entry.sync = setInterval(() => {
        const progress = Math.min(100, getState().syncProgress + 4);
        if (progress < 100) {
          setState({
            syncProgress: progress,
          });
          return;
        }
        clearInterval(entry.sync);
        setState({
          system: 'online',
          syncProgress: 100,
          justSynced: true,
        });
        entry.synced = setTimeout(
          () =>
            setState({
              justSynced: false,
            }),
          3200,
        );
      }, 110);
    }

    /** Downloads the Safety Pack for a zone: shelters, map tiles and walking routes. */
    function downloadPack(zoneId) {
      const patchPack = (patch) =>
        setState((s) => ({
          packs: s.packs.map((pack) =>
            pack.zoneId === zoneId
              ? {
                  ...pack,
                  ...patch,
                }
              : pack,
          ),
        }));
      const { location } = getState();
      const zone = chronApi.getZones().find((item) => item.id === zoneId);
      // The home zone follows the real position; other zones use their saved addresses.
      const center =
        zoneId === 'dom' && location.source === 'gps'
          ? location
          : {
              lat: zone.lat,
              lng: zone.lng,
            };
      patchPack({
        status: 'downloading',
        progress: 0,
      });
      downloadSafetyPack(zone, center, (progress) =>
        patchPack({
          progress,
        }),
      )
        .then(({ shelters, ...meta }) => patchPack(meta))
        .catch((error) => {
          console.warn('Safety Pack download failed', error);
          patchPack({
            status: 'none',
            progress: 0,
          });
        });
    }

    /** Shakes the phone frame and vibrates the device if enabled in settings. */
    function vibrate() {
      if (!getState().settings.vibrate) return;
      vibrateDevice([200, 120, 200]);
      clearTimeout(entry.shake);
      // Reset the animation first so that it plays again.
      setState({
        shaking: false,
      });
      setTimeout(
        () =>
          setState({
            shaking: true,
          }),
        20,
      );
      entry.shake = setTimeout(
        () =>
          setState({
            shaking: false,
          }),
        900,
      );
    }

    /** Shows a notification banner at the top of the screen for 6.5 seconds. */
    function showPush(push) {
      clearTimeout(entry.push);
      setState({
        push,
        pushVisible: true,
      });
      showSystemNotification({
        title: tf('CHROŃ · {v0}', {
          v0: push.tag,
        }),
        text: push.title,
        tag: push.tag,
      });
      vibrate();
      entry.push = setTimeout(
        () =>
          setState({
            pushVisible: false,
          }),
        6500,
      );
    }

    /** Short screen flash in the threat level color. */
    function flash() {
      clearTimeout(entry.flash);
      setState({
        flashing: true,
      });
      entry.flash = setTimeout(
        () =>
          setState({
            flashing: false,
          }),
        1800,
      );
    }

    /** Stops the repeating alarm sound and vibration. */
    function stopAlarmLoop() {
      clearInterval(entry.alarm);
      vibrateDevice(0);
    }

    /**
     * Full-screen alarm. Red level plays a siren, yellow plays a double beep.
     * In demo mode the sound repeats until the alarm is dismissed.
     */
    function showAlarm(mode, scenario, level) {
      stopAlarmLoop();
      setState({
        alarm: {
          mode,
          scenario,
          level,
        },
      });
      const isRed = level === 'red';
      const play = () => {
        const { settings } = getState();
        if (isRed) playSiren(settings.volume);
        else playAlertBeeps(settings.volume);
        if (settings.vibrate) vibrateDevice(isRed ? [400, 150, 400, 150, 400] : [200, 200, 200]);
      };
      play();
      if (mode === 'demo') entry.alarm = setInterval(play, isRed ? 1900 : 2600);
    }

    /** Dismisses the full-screen alarm. */
    function closeAlarm() {
      stopAlarmLoop();
      setState({
        alarm: null,
      });
    }

    /** Id of the primary recommended shelter, which becomes closed in the demo scenario. */
    function closedFor(s) {
      const primary = chronApi.getRecommendation({
        ...s,
        level: 'red',
        closedIds: [],
        system: 'online',
      }).primary;
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
      clearTimeout(entry.push);
      stopAlarmLoop();
      // Starting the scenario skips onboarding, also after the app is reopened.
      writeOnboarded(true);
      const base = {
        demoStep: step,
        onboarded: true,
        alarm: null,
        pushVisible: false,
        emergencyMinimized: false,
        justSynced: false,
      };
      const freshStart = {
        closedIds: [],
        stack: [],
        navigating: false,
        selectedShelterId: null,
      };
      if (step === 1) {
        setSystem('online');
        setState({
          ...base,
          ...freshStart,
          level: 'green',
          tab: 'map',
        });
      } else if (step === 2) {
        setSystem('online');
        setState({
          ...base,
          ...freshStart,
          level: 'yellow',
          tab: 'map',
        });
        setTimeout(() => {
          showPush({
            level: 'yellow',
            tag: t('OSTRZEŻENIE'),
            title: threat.headline + ' · ' + chronApi.getPlace(s).region,
            text: tf('{v0} · {v1} · do zagrożenia {v2}. Sprawdź najbliższy schron.', {
              v0: threat.source,
              v1: times.yellow.source,
              v2: threat.ttr,
            }),
            action: 'threat',
          });
        }, 350);
      } else if (step === 3) {
        setSystem('online');
        setState({
          ...base,
          ...freshStart,
          level: 'red',
        });
        if (s.settings.flashScreen) flash();
        vibrate();
        showAlarm('live', s.threatId, 'red');
      } else if (step === 4) {
        // The primary shelter closes while the user is already walking to it.
        const ctx = {
          ...s,
          level: 'red',
          closedIds: [],
          system: 'online',
        };
        const first = chronApi.getRecommendation(ctx).primary;
        const closed = first ? [first.id] : [];
        setSystem('online');
        setState({
          ...base,
          level: 'red',
          closedIds: closed,
          stack: first
            ? [
                {
                  name: 'route',
                  params: {
                    id: first.id,
                  },
                },
              ]
            : [],
          navigating: true,
        });
        const after = chronApi.getRecommendation({
          ...ctx,
          closedIds: closed,
        });
        if (after.reassessment) {
          setTimeout(() => {
            showPush({
              level: 'red',
              tag: t('ZMIANA SCHRONU'),
              title: after.reassessment.title,
              text: tf('Trasa przeliczona: {v0} min pieszo, {v1}.', {
                v0: after.primary.walk,
                v1: after.primary.hoursLabel.toLowerCase(),
              }),
              action: 'route',
            });
          }, 400);
        }
      } else if (step === 5) {
        setState({
          ...base,
          level: 'red',
          closedIds: s.demoStep >= 4 ? s.closedIds : closedFor(s),
        });
        setSystem('offline');
      } else if (step === 6) {
        setState({
          ...base,
          level: 'red',
          closedIds: s.closedIds.length ? s.closedIds : closedFor(s),
        });
        setSystem('recovering');
      }
    }

    /** Actions that screens receive through the actions prop. */
    const actions = {
      setTab: (tab) =>
        setState({
          tab,
          stack: [],
        }),
      back: () =>
        setState((s) => ({
          stack: s.stack.slice(0, -1),
          navigating: false,
        })),
      openShelter: (id, replace) =>
        setState((s) => {
          const base = replace ? s.stack.slice(0, -1) : s.stack;
          return {
            stack: base.concat([
              {
                name: 'shelter',
                params: {
                  id,
                },
              },
            ]),
          };
        }),
      openRoute: (id) =>
        setState((s) => {
          const top = s.stack[s.stack.length - 1];
          const base = top && top.name === 'route' ? s.stack.slice(0, -1) : s.stack;
          return {
            stack: base.concat([
              {
                name: 'route',
                params: {
                  id,
                },
              },
            ]),
            selectedShelterId: id,
            navigating: false,
          };
        }),
      openThreat: (threatId, level) =>
        pushScreen('threat', {
          threatId,
          level,
        }),
      openLate: (threatId) =>
        pushScreen('late', {
          threatId,
        }),
      openGuide: (threatId) =>
        pushScreen('guide', {
          threatId,
        }),
      selectShelter: (id) =>
        setState({
          selectedShelterId: id,
        }),
      minimizeEmergency: () =>
        setState({
          emergencyMinimized: true,
          stack: [],
          tab: 'map',
        }),
      openEmergency: () =>
        setState({
          emergencyMinimized: false,
          stack: [],
        }),
      toggleNavigating: () =>
        setState((s) => ({
          navigating: !s.navigating,
        })),
      setSetting: (key, value) => {
        // The language is applied before the state update, so the re-render already uses it.
        if (key === 'lang') setLanguage(value);
        setState((s) => ({ settings: { ...s.settings, [key]: value } }));
      },
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
      login: () =>
        setState({
          loggedIn: true,
        }),
      logout: () =>
        setState({
          loggedIn: false,
        }),
      finishOnboarding: (result) => {
        writeOnboarded(true);
        setState({
          onboarded: true,
          loggedIn: !!result.loggedIn,
          loc: result.loc || 'zawsze',
          tab: 'map',
          stack: [],
        });
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
      (location) =>
        setState({
          location,
        }),
      () =>
        setState({
          location: DEFAULT_LOCATION,
        }),
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
      .then(({ build, shelters }) => {
        setState({
          shelters,
          sheltersBuild: build,
        });
        saveLastShelters(location, shelters, build);
      })
      .catch((error) => {
        // Without the server, use shelters saved on the device; the built-in set is the last resort.
        lastShelterSearch.current = null;
        const saved = offlineShelters(location);
        if (saved)
          setState({
            shelters: saved,
          });
        console.warn('Shelters are unavailable from the server', error);
      });
  }, [state.location, state.networkOnline, setState]);

  // Download the home zone Safety Pack automatically once real shelters are available.
  const homePackRequested = useRef(false);
  const homePackStatus = state.packs.find((pack) => pack.zoneId === 'dom')?.status;
  useEffect(() => {
    if (homePackRequested.current || !state.onboarded || !state.networkOnline || !state.shelters) return;
    if (homePackStatus !== 'none') return;
    homePackRequested.current = true;
    controller.actions.downloadPack('dom');
  }, [state.onboarded, state.networkOnline, state.shelters, homePackStatus, controller]);

  // Real connectivity: losing the network switches to OFFLINE, regaining it starts RECOVERING.
  useEffect(() => {
    const goOffline = () => {
      const lastFeed = stateRef.current.liveThreats?.fetchedAt;
      const since = new Date(lastFeed || Date.now()).toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setState({
        networkOnline: false,
        offlineSince: since,
      });
      controller.setSystem('offline');
    };
    const goOnline = () => {
      // Forget the last search point so shelters are reloaded from the server.
      lastShelterSearch.current = null;
      setState({
        networkOnline: true,
        offlineSince: null,
      });
      if (stateRef.current.system === 'offline') controller.setSystem('recovering');
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, [controller, setState]);

  // Refresh the live threat feed every minute. Offline, the service worker answers with the last
  // saved feed (its fetchedAt shows how old it is); if nothing is saved, the current feed stays.
  const voivodeship = state.shelters?.[0]?.voivodeship || '';
  const latKey = state.location.lat.toFixed(2);
  const lngKey = state.location.lng.toFixed(2);
  useEffect(() => {
    const load = () => {
      fetchLiveThreats(stateRef.current.location, voivodeship)
        .then((liveThreats) =>
          setState({
            liveThreats,
          }),
        )
        .catch((error) => console.warn('Live threat feed is unavailable', error));
    };
    load();
    const timer = setInterval(load, THREATS_REFRESH_MS);
    return () => clearInterval(timer);
  }, [latKey, lngKey, voivodeship, state.networkOnline, state.settings.lang, setState]);

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
    const onResize = () =>
      setState({
        vw: window.innerWidth,
        vh: window.innerHeight,
      });
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
  return {
    state,
    ...controller,
  };
}
