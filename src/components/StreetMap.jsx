/**
 * Neighborhood map: user position, nearby shelters, threat zone and walking route.
 *
 * Built on Leaflet with standard OpenStreetMap tiles, darkened with a CSS filter
 * (see .chron-map in global.css) to match the app theme. The walking
 * route to the highlighted shelter is requested from OSRM; if the routing service
 * is unavailable, a straight line is drawn instead.
 */
import { useContext, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocationContext } from '@/app/LocationContext.js';
import { fetchWalkingRoute } from '@/services/routing.js';

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '© OpenStreetMap';

const PIN = { open: ['#4FD1A5', '#04170F'], unconfirmed: ['#F2A33A', '#1A0E05'], closed: ['#4A4550', '#E6E0E8'] };
const ZONE = {
  red: { fill: 'rgba(255,45,61,.12)', stroke: '#FF2D3D', text: '#FF8A95' },
  yellow: { fill: 'rgba(230,198,94,.12)', stroke: '#C9A43A', text: '#E6C65E' },
};
const ZONE_LABEL = { area: 'Strefa alarmu', plume: 'Chmura chloru', river: 'Strefa zalewowa' };

/** Radius of the threat zone drawn around the user, in meters, per zone type. */
const ZONE_RADIUS_M = { area: 1500, plume: 1100, river: 900 };

/** Number of nearest pins kept in view when the map fits its bounds. */
const PINS_IN_VIEW = 5;

const DEFAULT_PROPS = {
  highlightId: '',
  showRoute: false,
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
  const zone = p.zoneLevel && p.zoneLevel !== 'green' ? p.zone : null;
  const pins = (p.pins || [])
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
    .map((s) => {
      const c = stale ? ['#C9C1CB', '#0B0A0D'] : PIN[s.status] || PIN.closed;
      return {
        id: s.id,
        num: s.num,
        lat: s.lat,
        lng: s.lng,
        color: c[0],
        fg: c[1],
        opacity: s.status === 'closed' || s.suitable === false ? 0.45 : 1,
        strike: s.status === 'closed' ? 'line-through' : 'none',
        highlighted: s.id === p.highlightId,
        aria: s.name + ', ' + s.statusLabel + ', ' + s.walk + ' min',
      };
    });
  return {
    pins,
    zone,
    zc: ZONE[p.zoneLevel] || ZONE.yellow,
    zoneLabel: ZONE_LABEL[zone] || '',
    offlineLabel: p.offlineLabel || '',
  };
}

/** Leaflet marker icon for a shelter: a numbered tile in the shelter status color. */
function shelterIcon(pin) {
  const ring = pin.highlighted ? '0 0 0 2px #0B0A0D, 0 0 0 4px #F2EFF3' : '0 0 0 2px #0B0A0D';
  return L.divIcon({
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    html: `<span aria-label="${pin.aria}" style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;opacity:${pin.opacity}"><span style="min-width:30px;height:30px;padding:0 4px;box-sizing:border-box;border-radius:10px;background:${pin.color};color:${pin.fg};font:800 12px 'Manrope',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;box-shadow:${ring};text-decoration:${pin.strike}">${pin.num}</span></span>`,
  });
}

/** Leaflet marker icon for the user: a pulsing blue dot. */
const userIcon = L.divIcon({
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  html: '<span style="display:block;width:20px;height:20px;border-radius:10px;background:#5AAAFF;border:3px solid #0B0A0D;box-sizing:border-box;animation:schronPulse 1.8s infinite"></span>',
});

/** Small label in a map corner (threat zone name, offline notice, approximate route). */
function MapLabel({ side, edge = 'top', color, border, children }) {
  return (
    <span
      style={{
        position: 'absolute',
        [side]: '10px',
        [edge]: '10px',
        zIndex: 1000,
        padding: '4px 8px',
        borderRadius: '8px',
        background: 'rgba(22,20,26,.9)',
        border: `1px solid ${border}`,
        fontSize: '11px',
        fontWeight: '700',
        color,
      }}
    >
      {children}
    </span>
  );
}

/**
 * Neighborhood map.
 *
 * @param {object} props
 * @param {Shelter[]} props.pins shelters to show (need lat/lng)
 * @param {string} props.highlightId shelter that is selected and routed to
 * @param {boolean} props.showRoute draw the walking route to the highlighted shelter
 * @param {boolean} props.routeDashed draw the route as a dotted line (preview)
 * @param {string} props.zone threat zone type: 'area' | 'plume' | 'river'
 * @param {string} props.zoneLevel threat level; no zone is drawn at 'green'
 * @param {string} props.offlineLabel notice shown while offline
 * @param {boolean} props.stale data is outdated: pins are shown in gray
 * @param {Function} props.onPin called with the shelter id when a pin is tapped
 */
export default function StreetMap(inputProps) {
  const props = { ...DEFAULT_PROPS, ...inputProps };
  const { pins, zone, zc, zoneLabel, offlineLabel } = buildViewModel(props);
  const location = useContext(LocationContext);
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef(null);
  const onPinRef = useRef(props.onPin);
  onPinRef.current = props.onPin;
  const [route, setRoute] = useState(null);

  const target = pins.find((pin) => pin.highlighted);
  // GPS jitter of a few meters must not rebuild the route or reset the view: react to ~100 m moves.
  const areaKey = `${location.lat.toFixed(3)},${location.lng.toFixed(3)}`;
  const routeTarget = props.showRoute && target ? target : null;

  // Create the Leaflet map once and remove it when the component unmounts.
  useEffect(() => {
    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: true });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    map.attributionControl.setPrefix(false);
    mapRef.current = map;
    layersRef.current = L.layerGroup().addTo(map);
    return () => map.remove();
  }, []);

  // Request the walking route whenever the destination or the user position changes.
  useEffect(() => {
    if (!routeTarget) {
      setRoute(null);
      return undefined;
    }
    let cancelled = false;
    fetchWalkingRoute(location, routeTarget).then((result) => {
      if (!cancelled) setRoute(result);
    });
    return () => {
      cancelled = true;
    };
  }, [routeTarget?.id, routeTarget?.lat, routeTarget?.lng, areaKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Redraw all overlays when data changes.
  const pinsKey = pins.map((pin) => `${pin.id}:${pin.color}:${pin.opacity}:${pin.highlighted}`).join('|');
  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    layers.clearLayers();
    const user = [location.lat, location.lng];

    if (zone) {
      L.circle(user, {
        radius: ZONE_RADIUS_M[zone] || ZONE_RADIUS_M.area,
        color: zc.stroke,
        weight: 2,
        dashArray: '6 6',
        fillColor: zc.fill,
        fillOpacity: 1,
      }).addTo(layers);
    }
    if (route) {
      L.polyline(route.coords, {
        color: '#FF2D3D',
        weight: 5,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: props.routeDashed ? '2 9' : null,
      }).addTo(layers);
    }
    pins.forEach((pin) => {
      L.marker([pin.lat, pin.lng], { icon: shelterIcon(pin), keyboard: true, zIndexOffset: pin.highlighted ? 500 : 0 })
        .on('click', () => onPinRef.current && onPinRef.current(pin.id))
        .addTo(layers);
    });
    L.marker(user, { icon: userIcon, interactive: false, zIndexOffset: 1000 }).addTo(layers);
  }, [pinsKey, route, zone, zc.stroke, location.lat, location.lng, props.routeDashed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fit the view to the user, the nearest shelters and the route.
  useEffect(() => {
    const points = [[location.lat, location.lng]];
    const inView = target ? [target] : pins.slice(0, PINS_IN_VIEW);
    inView.forEach((pin) => points.push([pin.lat, pin.lng]));
    if (route) points.push(...route.coords);
    mapRef.current.fitBounds(points, { padding: [36, 36], maxZoom: 17 });
  }, [target?.id, route, pins.length, areaKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div ref={containerRef} className="chron-map" style={{ position: 'absolute', inset: 0, background: '#121015' }} />
      {zone && (
        <MapLabel side="right" color={zc.text} border={zc.stroke}>
          {zoneLabel}
        </MapLabel>
      )}
      {route && !route.exact && (
        <MapLabel side="left" edge="bottom" color="#F2B866" border="#5C4520">
          Trasa przybliżona · linia prosta
        </MapLabel>
      )}
      {offlineLabel && (
        <MapLabel side="left" color="#C9C1CB" border="#2C2830">
          {offlineLabel}
        </MapLabel>
      )}
    </div>
  );
}
