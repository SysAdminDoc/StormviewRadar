export const EMBED_LAYER_IDS = Object.freeze([
  'radar', 'alerts', 'spcOutlook', 'stormReports', 'stormTracks', 'couplets', 'hailMesh',
  'lightning', 'satellite', 'riverGauges', 'surfaceObs', 'spcWatches', 'spcMCD',
  'spcTornado', 'spcWind', 'spcHail', 'tropical', 'sigmets', 'satelliteIR',
  'satelliteWV', 'satelliteGeoColor', 'satelliteSandwich', 'satelliteMesoscale',
  'states', 'counties', 'labels', 'highways'
]);

export const DEFAULT_EMBED_LAYERS = Object.freeze(['radar', 'alerts', 'states', 'labels']);

const SOURCE_PRODUCTS = Object.freeze({
  hrrr: ['reflectivity'],
  rainviewer: ['reflectivity'],
  mrms: ['reflectivity', 'velocity', 'echoTops', 'precipAccum'],
  nowcoast: ['reflectivity'],
  level2: ['reflectivity', 'velocity', 'differentialReflectivity', 'correlationCoefficient']
});
const BASEMAPS = Object.freeze(['dark', 'light', 'satellite', 'terrain', 'clean']);
const PALETTES = Object.freeze(['standard', 'highContrast', 'colorblind']);

function enumValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function boundedNumber(value, minimum, maximum, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : fallback;
}

function booleanValue(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  if (['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())) return true;
  if (['0', 'false', 'no', 'off'].includes(String(value).toLowerCase())) return false;
  return fallback;
}

function embedLayers(value) {
  if (value === null || value === undefined || value === '') return [...DEFAULT_EMBED_LAYERS];
  if (String(value).trim().toLowerCase() === 'none') return [];
  return [...new Set(String(value).split(',').map(layer => layer.trim()).filter(layer => EMBED_LAYER_IDS.includes(layer)))].slice(0, 16);
}

export function parseEmbedConfig(search = '') {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(String(search).replace(/^\?/, ''));
  if (!booleanValue(params.get('embed'), false)) return null;

  const source = enumValue(params.get('source'), Object.keys(SOURCE_PRODUCTS), 'hrrr');
  const product = enumValue(params.get('product'), SOURCE_PRODUCTS[source], 'reflectivity');
  const latitude = boundedNumber(params.get('lat'), -90, 90, 39);
  const longitude = boundedNumber(params.get('lon'), -180, 180, -96);
  const level2Site = /^[A-Z][A-Z0-9]{3}$/.test(params.get('site') || '') ? params.get('site') : '';

  return Object.freeze({
    source,
    product,
    level2Site,
    basemap: enumValue(params.get('basemap'), BASEMAPS, 'dark'),
    theme: enumValue(params.get('theme'), ['dark', 'light'], 'dark'),
    palette: enumValue(params.get('palette'), PALETTES, 'standard'),
    language: enumValue(params.get('lang'), ['en', 'es'], 'en'),
    units: enumValue(params.get('units'), ['us', 'metric'], 'us'),
    latitude,
    longitude,
    zoom: boundedNumber(params.get('zoom'), 2, 18, 5),
    opacity: boundedNumber(params.get('opacity'), 0.1, 1, 0.85),
    delay: Math.round(boundedNumber(params.get('delay'), 100, 3000, 600)),
    controls: booleanValue(params.get('controls'), true),
    legend: booleanValue(params.get('legend'), true),
    autoplay: booleanValue(params.get('autoplay'), true),
    loop: booleanValue(params.get('loop'), true),
    timezone: enumValue(params.get('tz'), ['local', 'utc'], 'local'),
    layers: Object.freeze(embedLayers(params.get('layers')))
  });
}

export function applyEmbedConfiguration(settings, config) {
  if (!config || !settings || typeof settings !== 'object') return settings;
  settings.source = config.source;
  settings.radarProduct = config.product;
  settings.level2Site = config.level2Site;
  settings.basemap = config.basemap;
  settings.theme = config.theme;
  settings.visualPalette = config.palette;
  settings.language = config.language;
  settings.units = config.units;
  settings.opacity = config.opacity;
  settings.delay = config.delay;
  settings.loop = config.loop;
  settings.showLegend = config.legend;
  settings.useLocalTime = config.timezone === 'local';
  settings.splitView = false;
  settings.pipRadar = false;
  settings.alertAudioEnabled = false;
  settings.layers = Object.fromEntries(
    Object.keys(settings.layers || {}).map(layer => [layer, config.layers.includes(layer)])
  );
  return settings;
}
