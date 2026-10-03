/**
 * Status badge for a threat level, shelter status or data freshness: a colored dot and a label.
 */
const BADGES = {
  green: { bg: 'rgba(79,209,165,.13)', fg: '#86CDB2', dot: '#4FD1A5', text: 'GREEN · Bezpiecznie' },
  yellow: { bg: 'rgba(201,164,58,.16)', fg: '#E6C65E', dot: '#C9A43A', text: 'YELLOW · Podwyższone zagrożenie' },
  red: {
    bg: 'rgba(200,50,63,.2)',
    fg: '#FF8A95',
    dot: '#FF2D3D',
    text: 'RED · Wysokie zagrożenie',
    anim: 'schronLive 1.4s infinite',
  },
  open: { bg: 'rgba(79,209,165,.13)', fg: '#86CDB2', dot: '#4FD1A5', text: 'OTWARTE' },
  closed: { bg: '#26232A', fg: '#C9C1CB', dot: '#7D7580', text: 'ZAMKNIĘTE' },
  unconfirmed: { bg: 'rgba(242,163,58,.14)', fg: '#F2B866', dot: '#F2A33A', text: 'BRAK POTWIERDZENIA' },
  live: { bg: 'rgba(79,209,165,.13)', fg: '#86CDB2', dot: '#4FD1A5', text: 'AKTUALNE', anim: 'schronLive 2s infinite' },
  delayed: { bg: 'rgba(242,163,58,.14)', fg: '#F2B866', dot: '#F2A33A', text: 'OPÓŹNIONE' },
  stale: { bg: '#26232A', fg: '#C9C1CB', dot: '#7D7580', text: 'NIEAKTUALNE' },
};
const SIZES = { sm: ['3px 8px', 11, 6], md: ['5px 10px', 12, 7], lg: ['6px 12px', 13, 8] };

const DEFAULT_PROPS = { kind: 'open', label: '', size: 'md' };

/** Builds view data (texts, colors, handlers) from props. */
function buildViewModel(props) {
  const b = BADGES[props.kind] || BADGES.closed;
  const s = SIZES[props.size] || SIZES.md;
  return {
    bg: b.bg,
    fg: b.fg,
    dotColor: b.dot,
    anim: b.anim || 'none',
    text: props.label || b.text,
    pad: s[0],
    fs: s[1],
    dot: s[2],
  };
}

/**
 * Status badge.
 *
 * @param {object} props
 * @param {string} props.kind
 * @param {string} props.label
 * @param {string} props.size
 */
export default function StatusBadge(inputProps) {
  const props = { ...DEFAULT_PROPS, ...inputProps };
  const { anim, bg, dot, dotColor, fg, fs, pad, text } = buildViewModel(props);
  return (
    // The block wrapper sets the line height around the badge to match the design.
    <div>
      <span
        role="status"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          alignSelf: 'flex-start',
          flex: 'none',
          padding: pad,
          borderRadius: '999px',
          background: bg,
          color: fg,
          fontFamily: "'Manrope', system-ui, sans-serif",
          fontSize: `${fs}px`,
          fontWeight: '800',
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
          transition: 'background .5s, color .5s',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: `${dot}px`,
            height: `${dot}px`,
            borderRadius: '50%',
            background: dotColor,
            flex: 'none',
            animation: anim,
          }}
        ></span>
        {text}
      </span>
    </div>
  );
}
