/**
 * Schematic neighborhood map: user position, shelters, alarm zone and walking route.
 */
import { Fragment } from 'react';

const PIN = { open: ['#4FD1A5', '#04170F'], unconfirmed: ['#F2A33A', '#1A0E05'], closed: ['#4A4550', '#E6E0E8'] };
const ZONE = {
  red: { fill: 'rgba(255,45,61,.12)', stroke: '#FF2D3D', text: '#FF8A95' },
  yellow: { fill: 'rgba(230,198,94,.12)', stroke: '#C9A43A', text: '#E6C65E' },
};
const ZONE_LABEL = { area: 'Strefa alarmu', plume: 'Chmura chloru', river: 'Strefa zalewowa' };

const DEFAULT_PROPS = {
  highlightId: '',
  routeD: '',
  routeDashed: false,
  zone: 'area',
  zoneLevel: 'green',
  offlineLabel: '',
  stale: false,
};

/** Builds view data (texts, colors, handlers) from props. */
function buildViewModel(props) {
  const p = props;
  const stale = !!p.stale;
  const onPin = p.onPin;
  const zone = p.zoneLevel && p.zoneLevel !== 'green' ? p.zone : null;
  const pins = (p.pins || []).map((s) => {
    const c = stale ? ['#C9C1CB', '#0B0A0D'] : PIN[s.status] || PIN.closed;
    const hl = s.id === p.highlightId;
    return {
      num: s.num,
      color: c[0],
      fg: c[1],
      left: ((s.x / 358) * 100).toFixed(2),
      top: ((s.y / 300) * 100).toFixed(2),
      opacity: s.status === 'closed' || s.suitable === false ? 0.45 : 1,
      strike: s.status === 'closed' ? 'line-through' : 'none',
      ring: hl ? '0 0 0 2px #0B0A0D, 0 0 0 4px #F2EFF3' : '0 0 0 2px #0B0A0D',
      aria: s.name + ', ' + s.statusLabel + ', ' + s.walk + ' min',
      tap: function () {
        if (onPin) onPin(s.id);
      },
    };
  });
  return {
    pins,
    routeD: p.routeD || '',
    dash: p.routeDashed ? '2 9' : 'none',
    zoneArea: zone === 'area',
    zonePlume: zone === 'plume',
    zoneRiver: zone === 'river',
    zc: ZONE[p.zoneLevel] || ZONE.yellow,
    hasZoneLabel: !!zone,
    zoneLabel: ZONE_LABEL[zone] || '',
    hasOffline: !!p.offlineLabel,
    offlineLabel: p.offlineLabel || '',
  };
}

/**
 * Schematic neighborhood map.
 *
 * @param {object} props
 * @param {Shelter[]} props.pins
 * @param {string} props.highlightId
 * @param {string} props.routeD
 * @param {boolean} props.routeDashed
 * @param {string} props.zone
 * @param {string} props.zoneLevel
 * @param {string} props.offlineLabel
 * @param {boolean} props.stale
 * @param {Function} props.onPin
 */
export default function StreetMap(inputProps) {
  const props = { ...DEFAULT_PROPS, ...inputProps };
  const { dash, hasOffline, hasZoneLabel, offlineLabel, pins, routeD, zc, zoneArea, zoneLabel, zonePlume, zoneRiver } =
    buildViewModel(props);
  return (
    <div
      style={{
        flex: 'none',
        position: 'relative',
        width: '100%',
        aspectRatio: '358 / 300',
        borderRadius: '16px',
        overflow: 'hidden',
        background: '#121015',
        border: '1px solid #2C2830',
        fontFamily: "'Manrope', system-ui, sans-serif",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 358 300"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{ position: 'absolute', left: '0', top: '0' }}
      >
        <rect x="196" y="186" width="70" height="46" rx="8" fill="#14211A"></rect>
        <path d="M0 284 C80 266 130 298 200 280 S320 262 358 272" stroke="#132131" strokeWidth="20" fill="none"></path>
        <path d="M0 30H358M0 130H358M30 0V300M230 0V300M330 0V300" stroke="#1C1920" strokeWidth="6" fill="none"></path>
        <path
          d="M0 80H358M0 170H358M0 250H358M90 0V300M170 0V300M280 0V300"
          stroke="#2A2630"
          strokeWidth="11"
          fill="none"
        ></path>
        {zoneArea && (
          <>
            <rect
              x="4"
              y="4"
              width="350"
              height="292"
              rx="12"
              fill={zc.fill}
              stroke={zc.stroke}
              strokeWidth="2"
              strokeDasharray="6 6"
            ></rect>
          </>
        )}
        {zonePlume && (
          <>
            <ellipse
              cx="320"
              cy="30"
              rx="190"
              ry="95"
              transform="rotate(-24 320 30)"
              fill={zc.fill}
              stroke={zc.stroke}
              strokeWidth="2"
              strokeDasharray="6 6"
            ></ellipse>
          </>
        )}
        {zoneRiver && (
          <>
            <path
              d="M0 284 C80 266 130 298 200 280 S320 262 358 272"
              stroke={zc.fill}
              strokeWidth="70"
              fill="none"
            ></path>
            <path
              d="M0 246 C80 228 130 260 200 242 S320 224 358 234"
              stroke={zc.stroke}
              strokeWidth="2"
              strokeDasharray="6 6"
              fill="none"
            ></path>
          </>
        )}
        <path
          d={routeD}
          stroke="#FF2D3D"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dash}
          style={{ filter: 'drop-shadow(0 0 2px rgba(255,45,61,.6))', transition: 'd .5s' }}
        ></path>
      </svg>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '47.49%',
          top: '56.67%',
          width: '20px',
          height: '20px',
          margin: '-10px 0 0 -10px',
          borderRadius: '10px',
          background: '#5AAAFF',
          border: '3px solid #0B0A0D',
          boxSizing: 'border-box',
          animation: 'schronPulse 1.8s infinite',
        }}
      ></span>
      {hasZoneLabel && (
        <>
          <span
            style={{
              position: 'absolute',
              right: '10px',
              top: '10px',
              padding: '4px 8px',
              borderRadius: '8px',
              background: 'rgba(22,20,26,.9)',
              border: `1px solid ${zc.stroke}`,
              fontSize: '11px',
              fontWeight: '700',
              color: zc.text,
            }}
          >
            {zoneLabel}
          </span>
        </>
      )}
      {hasOffline && (
        <>
          <span
            style={{
              position: 'absolute',
              left: '10px',
              top: '10px',
              padding: '4px 8px',
              borderRadius: '8px',
              background: 'rgba(22,20,26,.9)',
              border: '1px solid #2C2830',
              fontSize: '11px',
              fontWeight: '700',
              color: '#C9C1CB',
            }}
          >
            {offlineLabel}
          </span>
        </>
      )}
      {(pins || []).map((p, pIndex) => (
        <Fragment key={pIndex}>
          <button
            type="button"
            onClick={p.tap}
            aria-label={p.aria}
            style={{
              opacity: p.opacity,
              position: 'absolute',
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: '44px',
              height: '44px',
              margin: '-22px 0 0 -22px',
              border: '0',
              padding: '0',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'opacity .4s',
            }}
          >
            <span
              style={{
                minWidth: '30px',
                height: '30px',
                padding: '0 4px',
                boxSizing: 'border-box',
                borderRadius: '10px',
                background: p.color,
                color: p.fg,
                fontWeight: '800',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: p.ring,
                textDecoration: p.strike,
                transition: 'background .4s, box-shadow .3s',
              }}
            >
              {p.num}
            </span>
          </button>
        </Fragment>
      ))}
    </div>
  );
}
