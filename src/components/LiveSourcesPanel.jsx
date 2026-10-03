/**
 * Live data from threat sources: health of every source and the latest alerts
 * for the user's location (GET /api/threats).
 */
import { Fragment } from 'react';

/** Maximum number of alerts shown in the list. */
const MAX_ALERTS = 6;

/** Colors and labels for alert levels. */
const LEVELS = {
  red: { dot: '#FF2D3D', fg: '#FF8A95', label: 'PILNE' },
  yellow: { dot: '#C9A43A', fg: '#E6C65E', label: 'OSTRZEŻENIE' },
  info: { dot: '#7D7580', fg: '#C9C1CB', label: 'INFORMACJA' },
};

const sectionTitleStyle = {
  fontSize: '12px',
  fontWeight: '800',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#9C95A0',
  marginTop: '4px',
};

const cardStyle = {
  flex: 'none',
  borderRadius: '18px',
  background: '#17151A',
  border: '1px solid #222026',
  display: 'flex',
  flexDirection: 'column',
};

/** Formats an ISO timestamp as HH:MM in local time; empty for missing values. */
function formatTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

/** One row with the state of a source: name, availability and response time. */
function SourceRow({ source, isLast }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 16px',
        borderBottom: isLast ? 'none' : '1px solid #222026',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '8px',
          height: '8px',
          flex: 'none',
          borderRadius: '4px',
          background: source.ok ? '#4FD1A5' : '#7D7580',
          animation: source.ok ? 'schronLive 2s infinite' : 'none',
        }}
      />
      <span style={{ flex: '1', fontSize: '14px', fontWeight: '700' }}>{source.name}</span>
      <span style={{ fontSize: '12px', fontWeight: '700', color: source.ok ? '#86CDB2' : '#C9C1CB' }}>
        {source.ok ? `${source.count} · ${source.latencyMs} ms` : source.error}
      </span>
    </div>
  );
}

/** One alert card: level, source, time, title and short description. */
function AlertCard({ alert }) {
  const level = LEVELS[alert.level] || LEVELS.info;
  return (
    <div style={{ ...cardStyle, padding: '14px 16px', gap: '6px' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '800' }}>
        <span style={{ width: '7px', height: '7px', borderRadius: '4px', background: level.dot }} />
        <span style={{ color: level.fg, letterSpacing: '0.04em' }}>{level.label}</span>
        <span style={{ color: '#9C95A0' }}>
          {alert.source}
          {formatTime(alert.time) && ` · ${formatTime(alert.time)}`}
        </span>
      </span>
      <span style={{ fontSize: '15px', fontWeight: '800', lineHeight: '1.3' }}>{alert.title}</span>
      {alert.text && <span style={{ fontSize: '13px', lineHeight: '1.45', color: '#C9C1CB' }}>{alert.text}</span>}
    </div>
  );
}

/**
 * Live sources panel.
 *
 * @param {object} props
 * @param {{ fetchedAt: string, sources: object[], alerts: object[] } | null} props.feed
 *   live threat feed; null while loading or when the backend is unavailable
 * @param {boolean} props.stale the device is offline: the feed is the last known state
 */
export default function LiveSourcesPanel({ feed, stale }) {
  if (!feed) return null;
  const alerts = feed.alerts.slice(0, MAX_ALERTS);
  return (
    <>
      <span style={sectionTitleStyle}>
        Na żywo ze źródeł · {stale ? 'dane z' : 'aktualizacja'} {formatTime(feed.fetchedAt)}
      </span>
      <section style={cardStyle}>
        {feed.sources.map((source, index) => (
          <SourceRow key={source.id} source={source} isLast={index === feed.sources.length - 1} />
        ))}
      </section>
      {alerts.length ? (
        alerts.map((alert) => (
          <Fragment key={alert.id}>
            <AlertCard alert={alert} />
          </Fragment>
        ))
      ) : (
        <span style={{ fontSize: '13px', color: '#A49DA6' }}>Brak komunikatów dla Twojej okolicy.</span>
      )}
    </>
  );
}
