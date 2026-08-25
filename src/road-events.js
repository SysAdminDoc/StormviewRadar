export const IOWA_511_COVERAGE_BOUNDS = Object.freeze([-96.7, 40.3, -90.1, 43.6]);
export const IOWA_511_MAX_EVENTS = 500;

const IOWA_511_QUERY_URL = 'https://services.arcgis.com/8lRhdTsQyJpO52F1/arcgis/rest/services/CARS511_Iowa_View/FeatureServer/0/query';
const INCLUDED_STYLES = Object.freeze([
  'priority_closure',
  'closure',
  'lane_closure',
  'restriction',
  'roadwork'
]);
const STYLE_PRIORITY = Object.freeze({
  priority_closure: 5,
  closure: 4,
  lane_closure: 3,
  restriction: 2,
  roadwork: 1
});

function boundedText(value, maxLength = 300) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function finiteBounds(bounds) {
  if (!Array.isArray(bounds) || bounds.length !== 4) return null;
  const values = bounds.map(Number);
  return values.every(Number.isFinite) ? values : null;
}

export function clipBoundsToIowa(bounds) {
  const values = finiteBounds(bounds);
  if (!values) return null;
  const [west, south, east, north] = values;
  const [coverageWest, coverageSouth, coverageEast, coverageNorth] = IOWA_511_COVERAGE_BOUNDS;
  const clipped = [
    Math.max(west, coverageWest),
    Math.max(south, coverageSouth),
    Math.min(east, coverageEast),
    Math.min(north, coverageNorth)
  ];
  return clipped[0] < clipped[2] && clipped[1] < clipped[3] ? clipped : null;
}

export function buildIowa511Query(bounds) {
  const clipped = clipBoundsToIowa(bounds);
  if (!clipped) return null;
  const quotedStyles = INCLUDED_STYLES.map(style => `'${style}'`).join(',');
  const params = new URLSearchParams({
    where: `STYLE IN (${quotedStyles})`,
    geometry: clipped.map(value => value.toFixed(5)).join(','),
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'OBJECTID,ID,STYLE,headline,phrase,Route,Restrict_,msg0,Desc0,AltRoute,UpdateDate,UpdateTime,EditDate,linktxt',
    returnGeometry: 'true',
    outSR: '4326',
    resultRecordCount: '1000',
    f: 'geojson'
  });
  return `${IOWA_511_QUERY_URL}?${params}`;
}

function validCoordinate(value) {
  if (!Array.isArray(value) || value.length < 2) return null;
  const longitude = Number(value[0]);
  const latitude = Number(value[1]);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) return null;
  return [longitude, latitude];
}

function geometryPoints(geometry) {
  if (geometry?.type === 'Point') {
    const point = validCoordinate(geometry.coordinates);
    return point ? [point] : [];
  }
  if (geometry?.type === 'MultiPoint' && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.map(validCoordinate).filter(Boolean);
  }
  return [];
}

function validIowa511Url(value) {
  const text = boundedText(value, 300);
  if (!text) return '';
  try {
    const url = new URL(text);
    return url.protocol === 'https:' && url.hostname === '511ia.org' && url.pathname.startsWith('/event/')
      ? url.href
      : '';
  } catch {
    return '';
  }
}

function normalizedUpdatedAt(value) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return '';
  const date = new Date(timestamp);
  return Number.isFinite(date.getTime()) && date.getUTCFullYear() >= 2000 && date.getUTCFullYear() <= 2100
    ? date.toISOString()
    : '';
}

export function roadEventKind(style) {
  if (style === 'priority_closure' || style === 'closure') return 'closure';
  if (style === 'lane_closure') return 'laneClosure';
  if (style === 'restriction') return 'restriction';
  return 'workZone';
}

function eventRecord(properties) {
  const style = INCLUDED_STYLES.includes(properties.STYLE) ? properties.STYLE : 'roadwork';
  return {
    eventId: boundedText(properties.ID, 100),
    style,
    headline: boundedText(properties.headline, 240),
    phrase: boundedText(properties.phrase, 100),
    route: boundedText(properties.Route, 80),
    description: boundedText(properties.msg0, 500),
    details: boundedText(properties.Desc0, 240),
    restrictions: boundedText(properties.Restrict_, 200),
    alternateRoute: boundedText(properties.AltRoute, 200),
    updatedAt: normalizedUpdatedAt(properties.EditDate),
    sourceUrl: validIowa511Url(properties.linktxt),
    coordinates: [],
    coordinateKeys: new Set()
  };
}

function mergeRecord(target, properties) {
  const nextStyle = INCLUDED_STYLES.includes(properties.STYLE) ? properties.STYLE : 'roadwork';
  if ((STYLE_PRIORITY[nextStyle] || 0) > (STYLE_PRIORITY[target.style] || 0)) target.style = nextStyle;
  const nextUpdatedAt = normalizedUpdatedAt(properties.EditDate);
  if (nextUpdatedAt > target.updatedAt) target.updatedAt = nextUpdatedAt;
  if (!target.headline) target.headline = boundedText(properties.headline, 240);
  if (!target.description) target.description = boundedText(properties.msg0, 500);
  if (!target.sourceUrl) target.sourceUrl = validIowa511Url(properties.linktxt);
}

export function normalizeIowa511Events(payload, { limit = IOWA_511_MAX_EVENTS } = {}) {
  const rows = Array.isArray(payload?.features) ? payload.features.slice(0, 2000) : [];
  const groups = new Map();

  for (const feature of rows) {
    const properties = feature?.properties && typeof feature.properties === 'object' ? feature.properties : {};
    const points = geometryPoints(feature?.geometry);
    if (!points.length) continue;
    const eventId = boundedText(properties.ID, 100)
      || `iowa-511-${boundedText(String(properties.OBJECTID ?? ''), 40)}`;
    if (!eventId || eventId === 'iowa-511-') continue;
    let record = groups.get(eventId);
    if (!record) {
      record = eventRecord({ ...properties, ID: eventId });
      groups.set(eventId, record);
    } else {
      mergeRecord(record, properties);
    }
    for (const point of points.slice(0, 8)) {
      const key = `${point[0].toFixed(6)},${point[1].toFixed(6)}`;
      if (record.coordinateKeys.has(key)) continue;
      record.coordinateKeys.add(key);
      record.coordinates.push(point);
    }
  }

  const records = [...groups.values()]
    .filter(record => record.coordinates.length)
    .sort((left, right) => (STYLE_PRIORITY[right.style] || 0) - (STYLE_PRIORITY[left.style] || 0)
      || right.updatedAt.localeCompare(left.updatedAt)
      || left.eventId.localeCompare(right.eventId))
    .slice(0, Math.max(0, Math.min(IOWA_511_MAX_EVENTS, Number(limit) || 0)));

  const updatedAt = records.reduce((latest, record) => record.updatedAt > latest ? record.updatedAt : latest, '');
  return {
    type: 'FeatureCollection',
    updatedAt,
    features: records.map(record => ({
      type: 'Feature',
      id: record.eventId,
      properties: {
        eventId: record.eventId,
        kind: roadEventKind(record.style),
        headline: record.headline,
        phrase: record.phrase,
        route: record.route,
        description: record.description,
        details: record.details,
        restrictions: record.restrictions,
        alternateRoute: record.alternateRoute,
        updatedAt: record.updatedAt,
        sourceUrl: record.sourceUrl
      },
      geometry: record.coordinates.length === 1
        ? { type: 'Point', coordinates: record.coordinates[0] }
        : { type: 'MultiPoint', coordinates: record.coordinates }
    }))
  };
}
