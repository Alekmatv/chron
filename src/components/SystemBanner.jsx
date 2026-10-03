/**
 * Connectivity banner (DEGRADED, OFFLINE, RECOVERING) with sync progress.
 */
const COLORS = {
  offline: { bg: '#211F25', border: '#2C2830', fg: '#C9C1CB', iconBg: '#2C2830' },
  degraded: { bg: '#1E1810', border: '#4A3A1C', fg: '#F2B866', iconBg: '#2E2412' },
  recovering: { bg: '#121A24', border: '#1F3550', fg: '#7CC4FF', iconBg: '#1A2A3D' },
  online: { bg: '#10211B', border: '#1F3B31', fg: '#86CDB2', iconBg: '#173229' },
};

const DEFAULT_PROPS = { visible: true };

/** Builds view data (texts, colors, handlers) from props. */
function buildViewModel(props) {
  const info = props.info || { key: 'online', label: '', title: '', text: '' };
  return {
    info,
    c: COLORS[info.key] || COLORS.online,
    rows: props.visible ? '1fr' : '0fr',
    isOffline: info.key === 'offline',
    isRecovering: info.key === 'recovering',
    isDegraded: info.key === 'degraded',
    isOnline: info.key === 'online',
    progress: info.progress || 0,
  };
}

/**
 * Connectivity banner (DEGRADED, OFFLINE, RECOVERING) with sync progress.
 *
 * @param {object} props
 * @param {{key,label,title,text,progress?}} props.info
 * @param {boolean} props.visible
 */
export default function SystemBanner(inputProps) {
  const props = { ...DEFAULT_PROPS, ...inputProps };
  const { c, info, isDegraded, isOffline, isOnline, isRecovering, progress, rows } = buildViewModel(props);
  return (
    <div
      aria-live="polite"
      style={{
        flex: 'none',
        display: 'grid',
        gridTemplateRows: rows,
        transition: 'grid-template-rows .45s ease',
        fontFamily: "'Manrope', system-ui, sans-serif",
      }}
    >
      <div style={{ overflow: 'hidden', minHeight: '0' }}>
        <div
          style={{
            margin: '8px 12px 0',
            padding: '10px 12px',
            borderRadius: '14px',
            background: c.bg,
            border: `1px solid ${c.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            transition: 'background .4s, border-color .4s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              aria-hidden="true"
              style={{
                width: '28px',
                height: '28px',
                flex: 'none',
                borderRadius: '14px',
                background: c.iconBg,
                color: c.fg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isOffline && (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 4-2.3M19 12.5a10 10 0 0 0-2.6-1.8M2 8.8a15 15 0 0 1 4.3-2.6M22 8.8A15 15 0 0 0 11 5M12 20h.01"></path>
                  </svg>
                </>
              )}
              {isRecovering && (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ animation: 'chronSpin 1s linear infinite' }}
                  >
                    <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4"></path>
                  </svg>
                </>
              )}
              {isDegraded && (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3.5l9 16H3z"></path>
                    <path d="M12 10v4.5M12 17.2v.1"></path>
                  </svg>
                </>
              )}
              {isOnline && (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12.5l4.5 4.5L19 7.5"></path>
                  </svg>
                </>
              )}
            </span>
            <span style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.08em', color: c.fg }}>
                  {info.label}
                </span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#F4F1F2' }}>{info.title}</span>
              </span>
              <span style={{ fontSize: '12px', lineHeight: '1.4', color: '#B9B1BB' }}>{info.text}</span>
            </span>
          </div>
          {isRecovering && (
            <>
              <span
                style={{
                  height: '4px',
                  borderRadius: '2px',
                  background: '#2C2830',
                  overflow: 'hidden',
                  display: 'block',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    height: '4px',
                    width: `${progress}%`,
                    background: '#5AAAFF',
                    transition: 'width .3s linear',
                  }}
                ></span>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
