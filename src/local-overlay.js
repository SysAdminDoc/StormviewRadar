export const LOCAL_OVERLAY_LIMITS = Object.freeze({
  bytes: 2 * 1024 * 1024,
  features: 500,
  coordinatePairs: 50_000,
  geometryDepth: 12,
  properties: 40,
  text: 500
});

const GEOMETRY_DEPTH = Object.freeze({
  Point: 1,
  MultiPoint: 2,
  LineString: 2,
  MultiLineString: 3,
  Polygon: 3,
  MultiPolygon: 4
});

function limitedText(value, limit = LOCAL_OVERLAY_LIMITS.text) {
  return String(value ?? '').replace(/\s+/gu, ' ').trim().slice(0, limit);
}

function sanitizeProperties(properties) {
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return {};
  return Object.fromEntries(Object.entries(properties)
    .slice(0, LOCAL_OVERLAY_LIMITS.properties)
    .flatMap(([key, value]) => {
      if (!['string', 'number', 'boolean'].includes(typeof value) && value !== null) return [];
      return [[limitedText(key, 80), typeof value === 'string' ? limitedText(value) : value]];
    }));
}

function coordinatePair(value, budget) {
  if (!Array.isArray(value) || value.length < 2) throw new Error('Geometry contains an invalid coordinate');
  const longitude = Number(value[0]);
  const latitude = Number(value[1]);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)
      || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    throw new Error('Geometry contains a coordinate outside longitude/latitude bounds');
  }
  budget.count += 1;
  if (budget.count > LOCAL_OVERLAY_LIMITS.coordinatePairs) {
    throw new Error(`Overlay exceeds ${LOCAL_OVERLAY_LIMITS.coordinatePairs} coordinate pairs`);
  }
  return [longitude, latitude];
}

function sanitizeCoordinates(value, depth, budget) {
  if (depth > LOCAL_OVERLAY_LIMITS.geometryDepth) {
    throw new Error(`Geometry exceeds depth ${LOCAL_OVERLAY_LIMITS.geometryDepth}`);
  }
  if (depth === 1) return coordinatePair(value, budget);
  if (!Array.isArray(value) || !value.length) throw new Error('Geometry contains an empty coordinate array');
  return value.map(item => sanitizeCoordinates(item, depth - 1, budget));
}

function sanitizeGeometry(geometry, budget) {
  const type = limitedText(geometry?.type, 32);
  const coordinateDepth = GEOMETRY_DEPTH[type];
  if (!coordinateDepth) throw new Error(`Unsupported geometry type: ${type || 'missing'}`);
  return {
    type,
    coordinates: sanitizeCoordinates(geometry.coordinates, coordinateDepth, budget)
  };
}

export function sanitizeFeatureCollection(payload) {
  const sourceFeatures = payload?.type === 'FeatureCollection'
    ? payload.features
    : payload?.type === 'Feature'
      ? [payload]
      : payload?.type in GEOMETRY_DEPTH
        ? [{ type: 'Feature', properties: {}, geometry: payload }]
        : null;
  if (!Array.isArray(sourceFeatures)) throw new Error('File is not GeoJSON');
  if (!sourceFeatures.length) throw new Error('Overlay contains no features');
  if (sourceFeatures.length > LOCAL_OVERLAY_LIMITS.features) {
    throw new Error(`Overlay exceeds ${LOCAL_OVERLAY_LIMITS.features} features`);
  }
  const budget = { count: 0 };
  const features = sourceFeatures.map((feature, index) => {
    if (feature?.type !== 'Feature' || !feature.geometry) {
      throw new Error(`Feature ${index + 1} is invalid or has no geometry`);
    }
    return {
      type: 'Feature',
      id: limitedText(feature.id, 120) || undefined,
      properties: sanitizeProperties(feature.properties),
      geometry: sanitizeGeometry(feature.geometry, budget)
    };
  });
  return { type: 'FeatureCollection', features };
}

function parseKmlCoordinates(text) {
  const coordinates = limitedText(text, LOCAL_OVERLAY_LIMITS.bytes)
    .split(/\s+/u)
    .filter(Boolean)
    .map(tuple => tuple.split(',').slice(0, 2).map(Number));
  if (!coordinates.length) throw new Error('KML geometry has no coordinates');
  return coordinates;
}

function firstDescendant(element, localName) {
  return element.getElementsByTagNameNS('*', localName)[0] || null;
}

function kmlGeometry(placemark) {
  const point = firstDescendant(placemark, 'Point');
  if (point) {
    const coordinates = parseKmlCoordinates(firstDescendant(point, 'coordinates')?.textContent);
    return { type: 'Point', coordinates: coordinates[0] };
  }
  const line = firstDescendant(placemark, 'LineString');
  if (line) {
    return {
      type: 'LineString',
      coordinates: parseKmlCoordinates(firstDescendant(line, 'coordinates')?.textContent)
    };
  }
  const polygon = firstDescendant(placemark, 'Polygon');
  if (polygon) {
    const rings = [...polygon.getElementsByTagNameNS('*', 'LinearRing')]
      .map(ring => parseKmlCoordinates(firstDescendant(ring, 'coordinates')?.textContent));
    if (!rings.length) throw new Error('KML polygon has no rings');
    return { type: 'Polygon', coordinates: rings };
  }
  throw new Error('KML placemark has no supported Point, LineString, or Polygon');
}

export function parseLocalOverlay(text, extension = '.geojson', createParser) {
  const bytes = new TextEncoder().encode(String(text ?? '')).byteLength;
  if (!bytes) throw new Error('Overlay file is empty');
  if (bytes > LOCAL_OVERLAY_LIMITS.bytes) {
    throw new Error(`Overlay exceeds ${LOCAL_OVERLAY_LIMITS.bytes} bytes`);
  }
  if (extension.toLowerCase() !== '.kml') {
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error('GeoJSON is not valid JSON');
    }
    return sanitizeFeatureCollection(payload);
  }
  if (/<!DOCTYPE|<!ENTITY/iu.test(text)) throw new Error('KML document types and entities are not allowed');
  if (typeof createParser !== 'function') throw new Error('KML parsing is unavailable');
  const document = createParser().parseFromString(text, 'application/xml');
  if (document.querySelector('parsererror')) throw new Error('KML is not valid XML');
  const placemarks = [...document.getElementsByTagNameNS('*', 'Placemark')];
  if (!placemarks.length) throw new Error('KML contains no placemarks');
  const payload = {
    type: 'FeatureCollection',
    features: placemarks.map(placemark => ({
      type: 'Feature',
      properties: {
        name: limitedText(firstDescendant(placemark, 'name')?.textContent),
        description: limitedText(firstDescendant(placemark, 'description')?.textContent)
      },
      geometry: kmlGeometry(placemark)
    }))
  };
  return sanitizeFeatureCollection(payload);
}
