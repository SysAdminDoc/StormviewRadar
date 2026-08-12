export const GEOMET_RADAR_ENDPOINT = 'https://geo.weather.gc.ca/geomet';
export const GEOMET_RADAR_LAYER = 'RADAR_1KM_RRAI';
export const GEOMET_RADAR_STYLE = 'RADARURPPRECIPR14-LINEAR';
export const GEOMET_MAX_FRAMES = 32;
export const GEOMET_REDUCED_DATA_SECONDS = 60 * 60;

export function isoDurationSeconds(value) {
  const match = String(value || '').trim().match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) return null;
  const seconds = (Number(match[1] || 0) * 3600)
    + (Number(match[2] || 0) * 60)
    + Number(match[3] || 0);
  return seconds > 0 ? seconds : null;
}

function epochSeconds(value) {
  const timestamp = Date.parse(String(value || '').trim());
  return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : null;
}

function dimensionTimes(value) {
  const dimension = String(value || '').trim();
  if (!dimension) return [];
  if (!dimension.includes('/')) {
    return dimension.split(',').map(epochSeconds).filter(Number.isFinite);
  }

  const [startValue, endValue, intervalValue] = dimension.split('/');
  const start = epochSeconds(startValue);
  const end = epochSeconds(endValue);
  const interval = isoDurationSeconds(intervalValue);
  if (!Number.isFinite(start) || !Number.isFinite(end) || !interval || end < start) return [];
  const count = Math.floor((end - start) / interval) + 1;
  if (count > 1000) throw new Error('GeoMet radar time dimension exceeds its safety limit');
  return Array.from({ length: count }, (_, index) => start + (index * interval))
    .filter(time => time <= end);
}

export function buildGeometRadarFrames(dimension, defaultValue, { reducedData = false } = {}) {
  const defaultTime = epochSeconds(defaultValue);
  let times = [...new Set(dimensionTimes(dimension))].sort((left, right) => left - right);
  if (Number.isFinite(defaultTime)) times = times.filter(time => time <= defaultTime);
  if (!times.length && Number.isFinite(defaultTime)) times = [defaultTime];
  if (!times.length) throw new Error('GeoMet returned no valid radar times');

  const latestTime = Number.isFinite(defaultTime) && times.includes(defaultTime)
    ? defaultTime
    : times.at(-1);
  if (reducedData) times = times.filter(time => time >= latestTime - GEOMET_REDUCED_DATA_SECONDS);
  times = times.slice(-GEOMET_MAX_FRAMES);

  return times.map(time => ({
    time,
    path: new Date(time * 1000).toISOString(),
    kind: time === latestTime ? 'latest' : 'past',
    timeSource: 'MSC GeoMet WMS capabilities'
  }));
}

export function geometCapabilitiesUrl(language = 'en') {
  const url = new URL(GEOMET_RADAR_ENDPOINT);
  url.search = new URLSearchParams({
    lang: language === 'fr' ? 'fr' : 'en',
    service: 'WMS',
    version: '1.3.0',
    request: 'GetCapabilities',
    layer: GEOMET_RADAR_LAYER
  });
  return url.toString();
}
