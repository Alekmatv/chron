import { t } from '@/i18n/index.js';
/**
 * Bottom tab bar (Mapa, Zagrożenia, Schrony, Profil) with an active threat indicator.
 */
const DEFAULT_PROPS = {
  tab: 'map',
  alertLevel: 'green',
};

/** Builds view data (texts, colors, handlers) from props. */
function buildViewModel(props) {
  const tab = props.tab || 'map';
  const onTab = props.onTab || function () {};
  const entry = {};
  ['map', 'threats', 'shelters', 'profile'].forEach((k) => {
    const on = k === tab;
    entry[k] = {
      fg: on ? '#F4F1F2' : '#9C95A0',
      bg: on ? '#2C2930' : 'transparent',
      cur: on ? 'page' : 'false',
    };
  });
  return {
    t: entry,
    hasAlert: !!props.alertLevel && props.alertLevel !== 'green',
    alertColor: props.alertLevel === 'red' ? '#FF2D3D' : '#C9A43A',
    goMap: function () {
      onTab('map');
    },
    goThreats: function () {
      onTab('threats');
    },
    goShelters: function () {
      onTab('shelters');
    },
    goProfile: function () {
      onTab('profile');
    },
  };
}

/**
 * Bottom tab bar (Mapa, Zagrożenia, Schrony, Profil) with an active threat indicator.
 *
 * @param {object} props
 * @param {string} props.tab
 * @param {string} props.alertLevel
 * @param {Function} props.onTab
 */
export default function BottomNav(inputProps) {
  const props = {
    ...DEFAULT_PROPS,
    ...inputProps,
  };
  const { alertColor, goMap, goProfile, goShelters, goThreats, hasAlert, t: entry } = buildViewModel(props);
  return (
    <nav
      aria-label={t('Nawigacja główna')}
      style={{
        flex: 'none',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: '4px',
        padding: '8px 8px 18px',
        background: '#0B0A0D',
        borderTop: '1px solid #1F1C24',
        fontFamily: "'Manrope', system-ui, sans-serif",
      }}
    >
      <button
        type="button"
        onClick={goMap}
        aria-current={entry.map.cur}
        style={{
          minHeight: '56px',
          border: '0',
          background: 'transparent',
          color: entry.map.fg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: '700',
        }}
      >
        <span
          style={{
            width: '52px',
            height: '30px',
            borderRadius: '15px',
            background: entry.map.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background .25s',
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
            <path d="M9 4L3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"></path>
            <path d="M9 4v13.5M15 6.5V20"></path>
          </svg>
        </span>
        {t('Mapa')}
      </button>
      <button
        type="button"
        onClick={goThreats}
        aria-current={entry.threats.cur}
        style={{
          minHeight: '56px',
          border: '0',
          background: 'transparent',
          color: entry.threats.fg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: '700',
        }}
      >
        <span
          style={{
            position: 'relative',
            width: '52px',
            height: '30px',
            borderRadius: '15px',
            background: entry.threats.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background .25s',
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
            <path d="M12 3.5l9 16H3z"></path>
            <path d="M12 10v4.5M12 17.2v.1"></path>
          </svg>
          {hasAlert && (
            <>
              <span
                style={{
                  position: 'absolute',
                  top: '3px',
                  right: '12px',
                  width: '9px',
                  height: '9px',
                  borderRadius: '5px',
                  background: alertColor,
                  border: '2px solid #0B0A0D',
                  animation: 'schronLive 1.6s infinite',
                }}
              ></span>
            </>
          )}
        </span>
        {t('Zagrożenia')}
      </button>
      <button
        type="button"
        onClick={goShelters}
        aria-current={entry.shelters.cur}
        style={{
          minHeight: '56px',
          border: '0',
          background: 'transparent',
          color: entry.shelters.fg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: '700',
        }}
      >
        <span
          style={{
            width: '52px',
            height: '30px',
            borderRadius: '15px',
            background: entry.shelters.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background .25s',
          }}
        >
          <svg width="22" height="20" viewBox="0 0 72 64" fill="none" aria-hidden="true">
            <path
              d="M10 56V28L36 8L62 28V56"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            ></path>
            <path d="M24 56V42a12 12 0 0 1 24 0V56" stroke="currentColor" strokeWidth="6" strokeLinecap="round"></path>
          </svg>
        </span>
        {t('Schrony')}
      </button>
      <button
        type="button"
        onClick={goProfile}
        aria-current={entry.profile.cur}
        style={{
          minHeight: '56px',
          border: '0',
          background: 'transparent',
          color: entry.profile.fg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: '700',
        }}
      >
        <span
          style={{
            width: '52px',
            height: '30px',
            borderRadius: '15px',
            background: entry.profile.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background .25s',
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
        </span>
        {t('Profil')}
      </button>
    </nav>
  );
}
