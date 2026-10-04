/**
 * Shelter details: status, opening hours, threat suitability, source, community confirmations and route.
 */
import useMergedState from '@/hooks/useMergedState.js';
import StatusBadge from '@/components/StatusBadge.jsx';
import StreetMap from '@/components/StreetMap.jsx';
import chronApi from '@/api/chronApi.js';
import { t, tf } from '@/i18n/index.js';

/** Builds view data (texts, colors, handlers) from props and local state. */
function buildViewModel(props, state, setState) {
  const api = chronApi;
  const s = props.store || {},
    a = props.actions || {},
    params = props.params || {};
  const sh = api.getShelter(params.id, s) || api.getShelters(s)[0];
  const stale = s.system === 'offline' || s.system === 'recovering';
  const route = api.getRoute(sh.id, s);
  const rec = api.getRecommendation(s);
  const threat = s.level !== 'green' ? api.getThreat(s.threatId, s) : null;
  const extra = (s.confirmations && s.confirmations[sh.id]) || 0;
  const count = sh.community.count + extra;
  const isClosed = sh.status === 'closed';
  const alt = rec.primary && rec.primary.id !== sh.id ? rec.primary : null;
  return {
    nearbyUsersText: sh.nearbyUsers
      ? tf('Użytkownicy CHROŃ w pobliżu wejścia: ~{v0}', { v0: sh.nearbyUsers })
      : t('Brak użytkowników CHROŃ w pobliżu wejścia'),
    sh,
    route,
    stale,
    pins: [sh],
    level: s.level,
    zone: threat ? threat.zone : '',
    offlineLabel: stale ? t('Trasa zapisana offline') : '',
    hoursShort: sh.hours === '24/7' ? '24/7' : t('Przy alarmie'),
    category: sh.category === 'schron' ? t('Budowla ochronna') : t('Miejsce przystosowane'),
    updated: stale ? sh.statusNote : t('dziś, ') + sh.updated,
    showSuit: !!threat,
    suit: sh.suitable
      ? {
          bg: 'rgba(79,209,165,.1)',
          fg: '#86CDB2',
          label: t('Odpowiedni'),
        }
      : {
          bg: 'rgba(255,122,133,.1)',
          fg: '#FF8A95',
          label: t('Niezalecany'),
        },
    community: count
      ? count +
        ' ' +
        (count === 1 ? 'osoba' : count < 5 ? 'osoby' : t('osób')) +
        ' ' +
        sh.community.text +
        (sh.community.time ? ' · ' + sh.community.time : '')
      : t('Brak potwierdzeń od mieszkańców'),
    confirmText: stale
      ? t('Potwierdzenie wyślemy po odzyskaniu połączenia')
      : state.confirmed
        ? t('Dziękujemy — potwierdzenie zapisane')
        : t('Potwierdź: wejście otwarte'),
    confirmDisabled: stale || state.confirmed,
    confirmColor: stale || state.confirmed ? '#A49DA6' : '#F4F1F2',
    confirm: function () {
      a.confirmShelter(sh.id);
      setState({
        confirmed: true,
      });
    },
    isClosed,
    isOpen: !isClosed,
    showLate: s.level !== 'green',
    barCols: s.level !== 'green' ? '1.6fr 1fr' : '1fr',
    recText: alt ? t('Zamknięte — pokaż ') + alt.name : t('Obiekt zamknięty'),
    goRec: function () {
      if (alt) a.openShelter(alt.id, true);
    },
    goRoute: function () {
      a.openRoute(sh.id);
    },
    goLate: function () {
      a.openLate();
    },
    back: function () {
      a.back();
    },
  };
}

/**
 * Shelter details.
 *
 * @param {object} props
 * @param {AppStore} props.store — global app state
 * @param {AppActions} props.actions — controller actions (navigation, settings)
 * @param {{id: string}} props.params — params of the open screen from the navigation stack
 */
export default function ShelterDetail(inputProps) {
  const props = inputProps;
  const [state, setState] = useMergedState({
    confirmed: false,
  });
  const {
    nearbyUsersText,
    back,
    barCols,
    category,
    community,
    confirm,
    confirmColor,
    confirmDisabled,
    confirmText,
    goLate,
    goRec,
    goRoute,
    hoursShort,
    isClosed,
    isOpen,
    level,
    offlineLabel,
    pins,
    recText,
    route,
    sh,
    showLate,
    showSuit,
    stale,
    suit,
    updated,
    zone,
  } = buildViewModel(props, state, setState);
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
            {t('Schronienie')}
          </span>
          <span
            style={{
              fontSize: '12px',
              color: '#A49DA6',
            }}
          >
            ID {sh.id} · {sh.statusNote}
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
          padding: '4px 16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <StreetMap
          pins={pins}
          highlightId={sh.id}
          showRoute
          routeDashed={true}
          zone={zone}
          zoneLevel={level}
          offlineLabel={offlineLabel}
          stale={stale}
        />
        <section
          style={{
            borderRadius: '18px',
            padding: '18px',
            background: '#17151A',
            border: '1px solid #222026',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span
              style={{
                fontFamily: "'Unbounded', 'Arial Black', sans-serif",
                fontWeight: '500',
                fontSize: '18px',
              }}
            >
              {sh.name}
            </span>
            <span
              style={{
                fontSize: '13px',
                fontWeight: '700',
                color: '#DCD5DD',
              }}
            >
              {sh.typeLabel}
            </span>
            <span
              style={{
                fontSize: '13px',
                color: '#A49DA6',
              }}
            >
              {sh.fullAddress}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <StatusBadge kind={sh.status} size="lg" />
            <span
              style={{
                fontSize: '13px',
                lineHeight: '1.45',
                color: '#C9C1CB',
              }}
            >
              {sh.statusReason}
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '8px',
            }}
          >
            <div
              style={{
                background: '#1F1C24',
                borderRadius: '12px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  color: '#A49DA6',
                }}
              >
                {t('Pieszo')}
              </span>
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: '800',
                }}
              >
                {sh.walk} min
              </span>
            </div>
            <div
              style={{
                background: '#1F1C24',
                borderRadius: '12px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  color: '#A49DA6',
                }}
              >
                {t('Dystans')}
              </span>
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: '800',
                }}
              >
                {sh.dist} m
              </span>
            </div>
            <div
              style={{
                background: '#1F1C24',
                borderRadius: '12px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  color: '#A49DA6',
                }}
              >
                {t('Godziny')}
              </span>
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: '800',
                  color: sh.hoursColor,
                }}
              >
                {hoursShort}
              </span>
            </div>
          </div>
          {showSuit && (
            <>
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: suit.bg,
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: '800',
                    color: suit.fg,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {suit.label}
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    lineHeight: '1.45',
                    color: '#DCD5DD',
                  }}
                >
                  {sh.suitNote}
                </span>
              </div>
            </>
          )}
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
              padding: '12px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <span
              style={{
                fontSize: '14px',
                color: '#9C95A0',
              }}
            >
              {t('Godziny otwarcia')}
            </span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: '700',
                textAlign: 'right',
              }}
            >
              {sh.hoursLabel}
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
            <span
              style={{
                fontSize: '14px',
                color: '#9C95A0',
              }}
            >
              {t('Kategoria')}
            </span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: '700',
                textAlign: 'right',
              }}
            >
              {category}
            </span>
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
            <span
              style={{
                fontSize: '14px',
                color: '#9C95A0',
              }}
            >
              {t('Wiarygodność')}
            </span>
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
              {sh.confidence}
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
            <span
              style={{
                fontSize: '14px',
                color: '#9C95A0',
              }}
            >
              {t('Źródło')}
            </span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: '700',
                textAlign: 'right',
              }}
            >
              {sh.source}
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
            <span
              style={{
                fontSize: '14px',
                color: '#9C95A0',
              }}
            >
              {t('Ostatnia aktualizacja')}
            </span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: '700',
              }}
            >
              {updated}
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
            <span
              style={{
                fontSize: '14px',
                color: '#9C95A0',
              }}
            >
              {t('Współrzędne')}
            </span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: '700',
              }}
            >
              {sh.lat}, {sh.lng}
            </span>
          </div>
        </section>
        <section
          style={{
            borderRadius: '18px',
            padding: '16px 18px',
            background: '#17151A',
            border: '1px solid #222026',
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
            {t('Zgłoszenia użytkowników')}
          </span>
          <span
            style={{
              fontSize: '15px',
              fontWeight: '700',
              lineHeight: '1.45',
            }}
          >
            {community}
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '14px', fontWeight: '700' }}>{nearbyUsersText}</span>
            <span style={{ fontSize: '12px', lineHeight: '1.4', color: '#A49DA6' }}>
              {t('Szacunek na podstawie lokalizacji użytkowników aplikacji — nie pełna liczba osób w obiekcie.')}
            </span>
          </span>
          <button
            type="button"
            onClick={confirm}
            disabled={confirmDisabled}
            style={{
              minHeight: '46px',
              borderRadius: '14px',
              border: '1px solid #3A3540',
              background: '#24212A',
              color: confirmColor,
              fontSize: '14px',
              fontWeight: '800',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {confirmText}
          </button>
          <span
            style={{
              fontSize: '12px',
              lineHeight: '1.45',
              color: '#A49DA6',
            }}
          >
            {t('Zgłoszenia uzupełniają, ale nie zastępują oficjalnego statusu.')}
          </span>
        </section>
      </div>
      <div
        style={{
          padding: '12px 16px 24px',
          display: 'grid',
          gridTemplateColumns: barCols,
          gap: '10px',
          borderTop: '1px solid #1F1C24',
        }}
      >
        {isClosed && (
          <>
            <button
              type="button"
              onClick={goRec}
              style={{
                minHeight: '56px',
                border: '0',
                borderRadius: '16px',
                background: '#E3203A',
                color: '#FFFFFF',
                fontWeight: '800',
                fontSize: '14px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {recText}
            </button>
          </>
        )}
        {isOpen && (
          <>
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
                letterSpacing: '0.02em',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {t('WYZNACZ TRASĘ')}
            </button>
          </>
        )}
        {showLate && (
          <>
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
              {t('Nie zdążę')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
