export const MINI_RADAR_DEFAULT_VIEW = Object.freeze({
  latitude: 39,
  longitude: -96,
  zoom: 3
});

export function overviewFromMapView(center, zoom, fallback = MINI_RADAR_DEFAULT_VIEW) {
  const latitude = Number(center?.lat ?? center?.latitude);
  const longitude = Number(center?.lng ?? center?.longitude);
  const sourceZoom = Number(zoom);
  return {
    latitude: Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
      ? latitude
      : fallback.latitude,
    longitude: Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
      ? longitude
      : fallback.longitude,
    zoom: Number.isFinite(sourceZoom)
      ? Math.min(12, Math.max(3, Math.round(sourceZoom) - 2))
      : fallback.zoom
  };
}
