/**
 * Home screen: threat status, location, Safety Pack, map of Poland and nearby shelters.
 */
import { Fragment } from 'react';
import useMergedState from '@/hooks/useMergedState.js';
import PolandMap from '@/components/PolandMap.jsx';
import ShelterRow from '@/components/ShelterRow.jsx';
import StatusBadge from '@/components/StatusBadge.jsx';
import StreetMap from '@/components/StreetMap.jsx';
import chronApi from '@/api/chronApi.js';

const LVL = {
  yellow: {
    short: 'Żółty',
    label: 'Podwyższone zagrożenie',
    tint: 'rgba(201,164,58,.14)',
    bg: '#C9A43A',
    fg: '#1A1405',
    text: '#E6C65E',
  },
  red: {
    short: 'Czerwony',
    label: 'Wysokie zagrożenie',
    tint: 'rgba(200,50,63,.16)',
    bg: '#C8323F',
    fg: '#FFFFFF',
    text: '#FF7A85',
  },
};
const NET = {
  online: { label: 'LIVE', color: '#FF7A85', anim: 'schronLive 2s infinite' },
  degraded: { label: 'OPÓŹNIENIA', color: '#F2B866', anim: 'schronLive 2s infinite' },
  offline: { label: 'OFFLINE', color: '#9C95A0', anim: 'none' },
  recovering: { label: 'SYNC', color: '#7CC4FF', anim: 'schronLive 1s infinite' },
};

/** Builds view data (texts, colors, handlers) from props and local state. */
function buildViewModel(props, state, setState) {
  const api = chronApi;
  const s = props.store || {},
    a = props.actions || {};
  const status = api.getStatus(s);
  const green = s.level === 'green';
  const threat = green ? null : api.getThreat(s.threatId, s);
  const rec = api.getRecommendation(s);
  const shelters = api.getShelters(s);
  const stale = s.system === 'offline' || s.system === 'recovering';
  const nearby = green
    ? shelters
        .filter((x) => {
          return x.status === 'open';
        })
        .slice(0, 3)
    : rec.options;
  const r = rec.primary || {};
  const route = rec.primary ? api.getRoute(rec.primary.id, s) : null;
  const packs = s.packs || api.getSafetyPacks();
  return {
    user: api.getUser(s),
    status,
    isGreen: green,
    hasThreat: !green,
    threat: threat || {},
    lvl: LVL[s.level] || LVL.yellow,
    rec: r,
    hasRec: !!rec.primary,
    reach: {
      bg: r.canReach ? 'rgba(79,209,165,.13)' : 'rgba(255,122,133,.13)',
      fg: r.canReach ? '#86CDB2' : '#FF8A95',
    },
    net: NET[s.system] || NET.online,
    stale,
    pack: packs[0],
    tabs: {
      regionsPressed: state.tab === 'regions' ? 'true' : 'false',
      nearbyPressed: state.tab === 'nearby' ? 'true' : 'false',
      regionsBg: state.tab === 'regions' ? '#2C2930' : 'transparent',
      nearbyBg: state.tab === 'nearby' ? '#2C2930' : 'transparent',
    },
    isRegions: state.tab === 'regions',
    isNearby: state.tab === 'nearby',
    tabNear: threat ? threat.tabNear : 'Schrony obok',
    listTitle: green ? 'Najbliższe otwarte schrony' : threat.listTitle,
    regionLevels: api.getRegionLevels(s),
    mapTitle: threat ? threat.title : 'Sytuacja w kraju',
    shelters,
    recId: r.id || '',
    showRoute: !!route,
    zone: threat ? threat.zone : '',
    level: s.level,
    offlineMapLabel: stale ? 'Mapa offline · pobrana 14:32' : '',
    nearby,
    showReach: !green,
    goProfile: function () {
      a.setTab('profile');
    },
    goShelters: function () {
      a.setTab('shelters');
    },
    goThreat: function () {
      a.openThreat(s.threatId);
    },
    goRoute: function () {
      a.openRoute(r.id);
    },
    openShelter: function (id) {
      a.openShelter(id);
    },
    showRegions: function () {
      setState({ tab: 'regions' });
    },
    showNearby: function () {
      setState({ tab: 'nearby' });
    },
  };
}

/**
 * Home screen.
 *
 * @param {object} props
 * @param {AppStore} props.store — global app state
 * @param {AppActions} props.actions — controller actions (navigation, settings)
 */
export default function HomeScreen(inputProps) {
  const props = inputProps;
  const [state, setState] = useMergedState({ tab: 'regions' });
  const {
    goProfile,
    goRoute,
    goShelters,
    goThreat,
    hasRec,
    hasThreat,
    isGreen,
    isNearby,
    isRegions,
    level,
    listTitle,
    lvl,
    mapTitle,
    nearby,
    net,
    offlineMapLabel,
    openShelter,
    pack,
    reach,
    rec,
    recId,
    regionLevels,
    showRoute,
    shelters,
    showNearby,
    showReach,
    showRegions,
    stale,
    status,
    tabNear,
    tabs,
    threat,
    user,
    zone,
  } = buildViewModel(props, state, setState);
  return (
    <div
      style={{
        height: '100%',
        position: 'relative',
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
          padding: '20px 16px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg
            width="30"
            height="27"
            viewBox="0 0 72 64"
            fill="none"
            aria-hidden="true"
            style={{ filter: 'drop-shadow(0 0 3px rgba(255,45,61,.45))', overflow: 'visible' }}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span
              style={{
                fontFamily: "'Unbounded', 'Arial Black', sans-serif",
                fontWeight: '700',
                fontSize: '15px',
                letterSpacing: '0.16em',
                color: '#FF2D3D',
              }}
            >
              CHROŃ
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#A49DA6' }}>
              Gdańsk · Pomorskie
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: '800',
                  letterSpacing: '0.04em',
                  color: net.color,
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '3px',
                    background: net.color,
                    animation: net.anim,
                  }}
                ></span>
                {net.label}
              </span>
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={goProfile}
          aria-label="Profil"
          style={{
            width: '44px',
            height: '44px',
            boxSizing: 'border-box',
            borderRadius: '22px',
            background: '#17151A',
            border: '1px solid #222026',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#F4F1F2',
            cursor: 'pointer',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="4"></circle>
            <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"></path>
          </svg>
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
          gap: '16px',
        }}
      >
        {isGreen && (
          <>
            <section
              style={{
                flex: 'none',
                borderRadius: '20px',
                background: '#17151A',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                animation: 'chronIn .45s ease both',
              }}
            >
              <div
                style={{
                  padding: '16px 18px',
                  background: 'rgba(42,79,67,.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <span
                  style={{
                    width: '44px',
                    height: '44px',
                    flex: 'none',
                    borderRadius: '22px',
                    background: '#24493D',
                    color: '#CFEFE2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"></path>
                    <path d="M8.5 12l2.5 2.5 4.5-5"></path>
                  </svg>
                </span>
                <span style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '0' }}>
                  <StatusBadge kind="green" size="sm" />
                  <span
                    style={{
                      fontFamily: "'Unbounded', 'Arial Black', sans-serif",
                      fontWeight: '500',
                      fontSize: '18px',
                      lineHeight: '1.3',
                      color: '#FFFFFF',
                      textWrap: 'pretty',
                    }}
                  >
                    {status.title}
                  </span>
                </span>
              </div>
              <div style={{ padding: '14px 18px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '15px', lineHeight: '1.5', color: '#D9D4DB' }}>{status.reason}</span>
                <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#9C95A0' }}>
                    Źródło: {status.source} · {status.updated}
                  </span>
                  <StatusBadge kind={status.freshness.key} size="sm" />
                </span>
              </div>
            </section>
          </>
        )}
        {hasThreat && (
          <>
            <section
              style={{
                flex: 'none',
                borderRadius: '20px',
                background: '#17151A',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                animation: 'chronIn .45s ease both',
              }}
            >
              <button
                type="button"
                onClick={goThreat}
                aria-label="Pokaż szczegóły zagrożenia"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '0',
                  border: '0',
                  background: 'transparent',
                  color: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer',
                  width: '100%',
                  fontFamily: 'inherit',
                }}
              >
                <span
                  style={{
                    padding: '16px 18px',
                    background: lvl.tint,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    transition: 'background .6s',
                  }}
                >
                  <span
                    style={{
                      width: '44px',
                      height: '44px',
                      flex: 'none',
                      borderRadius: '22px',
                      background: lvl.bg,
                      color: lvl.fg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg
                      width="22"
                      height="22"
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
                  <span style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '0' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: '#C9C1CB',
                      }}
                    >
                      {threat.title}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: '800', letterSpacing: '0.01em', color: lvl.text }}>
                      {lvl.short} · {lvl.label}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Unbounded', 'Arial Black', sans-serif",
                        fontWeight: '500',
                        fontSize: '20px',
                        lineHeight: '1.25',
                        color: '#FFFFFF',
                      }}
                    >
                      Zagrożenie: {threat.kind}
                    </span>
                  </span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#C9C1CB"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    style={{ flex: 'none' }}
                  >
                    <path d="M9 5l7 7-7 7"></path>
                  </svg>
                </span>
                <span style={{ padding: '14px 18px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ display: 'block', fontSize: '15px', lineHeight: '1.5', color: '#D9D4DB' }}>
                    {threat.text}
                  </span>
                  <span style={{ display: 'block', fontSize: '13px', lineHeight: '1.45', color: '#B9B1BB' }}>
                    Powód: {threat.reason}
                  </span>
                  <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#9C95A0' }}>
                      Źródło: {threat.source} · {threat.sourceTime} · aktualizacja {threat.updated}
                    </span>
                    <StatusBadge kind={threat.freshness.key} size="sm" />
                  </span>
                </span>
              </button>
              <div
                style={{
                  padding: '14px 18px',
                  borderTop: '1px solid #26232A',
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
              {hasRec && (
                <>
                  <button
                    type="button"
                    onClick={goRoute}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'transparent',
                      border: '0',
                      borderTop: '1px solid #26232A',
                      padding: '14px 18px',
                      color: '#F2EFF3',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '0' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#9C95A0' }}>
                        {threat.nearestLabel}
                      </span>
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
            </section>
          </>
        )}
        <div
          style={{
            flex: 'none',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '16px',
            background: '#17151A',
            border: '1px solid #222026',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px' }}>
            <span
              style={{
                width: '36px',
                height: '36px',
                flex: 'none',
                borderRadius: '10px',
                background: '#1A2A3D',
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
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"></path>
                <circle cx="12" cy="10" r="2.6"></circle>
              </svg>
            </span>
            <span style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#9C95A0' }}>Twoja lokalizacja</span>
              <span style={{ fontSize: '15px', fontWeight: '800' }}>
                {user.location.label} · {user.location.address}
              </span>
              <span style={{ fontSize: '12px', color: '#A49DA6' }}>Strefa: Dom · GPS {user.location.accuracy}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={goProfile}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              border: '0',
              borderTop: '1px solid #24212A',
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
                background: '#173229',
                color: '#86CDB2',
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
                <path d="M12 3v12M7 10l5 5 5-5M5 21h14"></path>
              </svg>
            </span>
            <span style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '14px', fontWeight: '800' }}>Safety Pack „Dom” gotowy</span>
              <span style={{ fontSize: '12px', color: '#A49DA6' }}>
                {pack.date} · {pack.size} · działa bez internetu
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
            >
              <path d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '4px',
            padding: '4px',
            borderRadius: '14px',
            background: '#17151A',
          }}
        >
          <button
            type="button"
            onClick={showRegions}
            aria-pressed={tabs.regionsPressed}
            style={{
              minHeight: '44px',
              border: '0',
              borderRadius: '10px',
              background: tabs.regionsBg,
              color: '#F4F1F2',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Mapa Polski
          </button>
          <button
            type="button"
            onClick={showNearby}
            aria-pressed={tabs.nearbyPressed}
            style={{
              minHeight: '44px',
              border: '0',
              borderRadius: '10px',
              background: tabs.nearbyBg,
              color: '#F4F1F2',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {tabNear}
          </button>
        </div>
        {isRegions && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <PolandMap
                regionLevels={regionLevels}
                threatTitle={mapTitle}
                offline={stale}
                offlineLabel="Mapa offline · pobrana 14:32"
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#B9B1BB' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#2A4F43' }}></span>
                  Bezpiecznie
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#B9B1BB' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#C9A43A' }}></span>
                  Żółty — podwyższone zagrożenie
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#B9B1BB' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#C8323F' }}></span>
                  Czerwony — wysokie zagrożenie
                </span>
              </div>
            </div>
          </>
        )}
        {isNearby && (
          <>
            <StreetMap
              pins={shelters}
              highlightId={recId}
              showRoute={showRoute}
              routeDashed={true}
              zone={zone}
              zoneLevel={level}
              offlineLabel={offlineMapLabel}
              stale={stale}
              onPin={openShelter}
            />
          </>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '16px', fontWeight: '800' }}>{listTitle}</span>
          <button
            type="button"
            onClick={goShelters}
            style={{
              minHeight: '36px',
              padding: '0 4px',
              border: '0',
              background: 'transparent',
              color: '#FF6B78',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Wszystkie →
          </button>
        </div>
        {(nearby || []).map((s, sIndex) => (
          <Fragment key={sIndex}>
            <ShelterRow
              shelter={s}
              isRec={s.isRec}
              showReach={showReach}
              showSuit={false}
              stale={stale}
              onOpen={openShelter}
            />
          </Fragment>
        ))}
      </div>
    </div>
  );
}
