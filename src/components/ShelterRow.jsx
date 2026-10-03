/**
 * Shelter list row: number, type, address, status, walking time and whether the user can make it in time.
 */
import StatusBadge from '@/components/StatusBadge.jsx';

const TILES = {
  open: ['#4FD1A5', '#04170F'],
  unconfirmed: ['#F2A33A', '#1A0E05'],
  closed: ['#4A4550', '#E6E0E8'],
};

const DEFAULT_PROPS = { isRec: false, showReach: true, showSuit: true, stale: false };

/** Builds view data (texts, colors, handlers) from props. */
function buildViewModel(props) {
  const s = props.shelter || {};
  const stale = !!props.stale;
  const t = stale ? ['#C9C1CB', '#0B0A0D'] : TILES[s.status] || TILES.closed;
  const muted = s.status === 'closed' || s.suitable === false;
  const onOpen = props.onOpen;
  return {
    s,
    isRec: !!props.isRec,
    tile: t[0],
    tileFg: t[1],
    strike: s.status === 'closed' ? 'line-through' : 'none',
    border: props.isRec ? '#3E5E52' : '#222026',
    opacity: muted ? 0.55 : 1,
    showReach: !!props.showReach && s.canReach != null && s.status !== 'closed',
    reachBg: s.canReach ? 'rgba(79,209,165,.13)' : 'rgba(255,122,133,.13)',
    reachColor: s.canReach ? '#86CDB2' : '#FF8A95',
    showSuit: s.suitable === false && !!props.showSuit,
    showStale: stale,
    aria: s.name + ', ' + s.statusLabel + ', ' + s.walk + ' min pieszo',
    open: function () {
      if (onOpen) onOpen(s.id);
    },
  };
}

/**
 * Shelter list row.
 *
 * @param {object} props
 * @param {object} props.shelter
 * @param {Function} props.onOpen
 * @param {boolean} props.isRec
 * @param {boolean} props.showReach
 * @param {boolean} props.showSuit
 * @param {boolean} props.stale
 */
export default function ShelterRow(inputProps) {
  const props = { ...DEFAULT_PROPS, ...inputProps };
  const {
    aria,
    border,
    isRec,
    opacity,
    open,
    reachBg,
    reachColor,
    s,
    showReach,
    showStale,
    showSuit,
    strike,
    tile,
    tileFg,
  } = buildViewModel(props);
  return (
    <button
      type="button"
      onClick={open}
      aria-label={aria}
      style={{
        opacity,
        width: '100%',
        textAlign: 'left',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        padding: '14px',
        boxSizing: 'border-box',
        borderRadius: '14px',
        background: '#16141A',
        border: `1px solid ${border}`,
        color: '#F4F1F2',
        fontFamily: "'Manrope', system-ui, sans-serif",
        cursor: 'pointer',
        transition: 'border-color .4s, opacity .4s',
      }}
    >
      <span
        style={{
          minWidth: '36px',
          height: '36px',
          flex: 'none',
          borderRadius: '10px',
          background: tile,
          color: tileFg,
          fontWeight: '800',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textDecoration: strike,
          transition: 'background .4s',
        }}
      >
        {s.num}
      </span>
      <span style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span style={{ fontSize: '15px', fontWeight: '800' }}>{s.name}</span>
          {isRec && (
            <>
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: '8px',
                  background: '#1F3B31',
                  color: '#9FE0C6',
                  fontSize: '11px',
                  fontWeight: '800',
                  whiteSpace: 'nowrap',
                }}
              >
                Polecamy
              </span>
            </>
          )}
        </span>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#DCD5DD' }}>{s.typeLabel}</span>
        <span style={{ fontSize: '13px', color: '#A49DA6' }}>{s.address}</span>
        <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
          <StatusBadge kind={s.status} size="sm" />
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '7px',
              background: '#24212A',
              fontSize: '12px',
              fontWeight: '700',
              color: s.hoursColor,
            }}
          >
            {s.hoursLabel}
          </span>
        </span>
        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#DCD5DD' }}>
            {s.walk} min pieszo · {s.dist} m
          </span>
          {showReach && (
            <>
              <span
                style={{
                  flex: 'none',
                  padding: '5px 10px',
                  borderRadius: '999px',
                  background: reachBg,
                  color: reachColor,
                  fontSize: '12px',
                  fontWeight: '800',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.reachText}
              </span>
            </>
          )}
        </span>
        {showSuit && (
          <>
            <span style={{ fontSize: '12px', lineHeight: '1.4', color: '#B9B1BB' }}>Niezalecany: {s.suitNote}</span>
          </>
        )}
        {showStale && (
          <>
            <span style={{ fontSize: '12px', color: '#A49DA6' }}>{s.statusNote}</span>
          </>
        )}
      </span>
    </button>
  );
}
