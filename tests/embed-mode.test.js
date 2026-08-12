import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_EMBED_LAYERS,
  applyEmbedConfiguration,
  parseEmbedConfig
} from '../src/embed-mode.js';

test('embed URL parameters produce a bounded deterministic configuration', () => {
  const config = parseEmbedConfig('?embed=1&lat=41.5868&lon=-93.625&zoom=9&source=mrms&product=echoTops'
    + '&basemap=light&layers=radar,alerts,hailMesh,unknown,alerts&theme=light&palette=colorblind'
    + '&lang=es&units=metric&opacity=.65&delay=250&controls=0&legend=0&autoplay=0&loop=0&tz=utc');
  assert.deepEqual(config, {
    source: 'mrms',
    product: 'echoTops',
    level2Site: '',
    basemap: 'light',
    theme: 'light',
    palette: 'colorblind',
    language: 'es',
    units: 'metric',
    latitude: 41.5868,
    longitude: -93.625,
    zoom: 9,
    opacity: 0.65,
    delay: 250,
    controls: false,
    legend: false,
    autoplay: false,
    loop: false,
    timezone: 'utc',
    layers: ['radar', 'alerts', 'hailMesh']
  });
});

test('embed parsing rejects unsupported products and bounds hostile values', () => {
  assert.equal(parseEmbedConfig('?embed=0&source=level2'), null);
  const config = parseEmbedConfig('?embed=true&lat=999&lon=-999&zoom=100&opacity=-4&delay=99999&source=nowcoast&product=velocity&site=bad');
  assert.equal(config.latitude, 90);
  assert.equal(config.longitude, -180);
  assert.equal(config.zoom, 18);
  assert.equal(config.opacity, 0.1);
  assert.equal(config.delay, 3000);
  assert.equal(config.product, 'reflectivity');
  assert.equal(config.level2Site, '');
  assert.deepEqual(config.layers, DEFAULT_EMBED_LAYERS);
});

test('embed parsing exposes the credential-free ECCC rain-rate product', () => {
  const config = parseEmbedConfig('?embed=1&source=eccc&product=precipRate');
  assert.equal(config.source, 'eccc');
  assert.equal(config.product, 'precipRate');
});

test('embed configuration replaces persisted presentation without enabling local or credentialed layers', () => {
  const settings = {
    source: 'rainviewer',
    splitView: true,
    pipRadar: true,
    alertAudioEnabled: true,
    layers: { radar: true, alerts: false, temp: true, geofences: true, labels: false }
  };
  const config = parseEmbedConfig('?embed=1&layers=radar,alerts,labels&source=level2&site=KDMX');
  applyEmbedConfiguration(settings, config);
  assert.equal(settings.source, 'level2');
  assert.equal(settings.level2Site, 'KDMX');
  assert.equal(settings.splitView, false);
  assert.equal(settings.pipRadar, false);
  assert.equal(settings.alertAudioEnabled, false);
  assert.deepEqual(settings.layers, { radar: true, alerts: true, temp: false, geofences: false, labels: true });
});
