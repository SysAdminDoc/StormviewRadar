export const DEFAULT_COMPARISON_LOCATION = Object.freeze({
  latitude: 39,
  longitude: -96,
  zoom: 6,
  name: ''
});

function boundedName(value) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 120);
}

export function normalizeComparisonLocation(value, fallback = DEFAULT_COMPARISON_LOCATION) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const safeFallback = fallback && typeof fallback === 'object' ? fallback : DEFAULT_COMPARISON_LOCATION;
  const latitude = Number(source.latitude);
  const longitude = Number(source.longitude);
  const zoom = Number(source.zoom);
  return {
    latitude: Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
      ? latitude
      : safeFallback.latitude,
    longitude: Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
      ? longitude
      : safeFallback.longitude,
    zoom: Number.isFinite(zoom) ? Math.min(16, Math.max(3, Math.round(zoom))) : safeFallback.zoom,
    name: boundedName(source.name)
  };
}

export function normalizeLocationResults(payload, limit = 5) {
  if (!Array.isArray(payload)) return [];
  const boundedLimit = Math.min(8, Math.max(1, Math.floor(Number(limit) || 5)));
  return payload.flatMap(result => {
    const latitude = Number(result?.lat);
    const longitude = Number(result?.lon);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
      || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return [];
    const displayName = boundedName(result?.display_name || 'Unnamed location');
    return displayName ? [{ latitude, longitude, displayName }] : [];
  }).slice(0, boundedLimit);
}

export function shortLocationName(displayName, fallback = 'Comparison view') {
  const parts = boundedName(displayName).split(',').map(part => part.trim()).filter(Boolean);
  return parts.slice(0, 2).join(', ') || fallback;
}
