import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildGeometRadarFrames,
  GEOMET_RADAR_LAYER,
  geometCapabilitiesUrl,
  isoDurationSeconds
} from '../src/geomet-radar.js';

test('GeoMet frames expand the official ISO interval and preserve the default time', () => {
  const frames = buildGeometRadarFrames(
    '2026-08-12T12:54:00Z/2026-08-12T15:54:00Z/PT6M',
    '2026-08-12T15:54:00Z'
  );
  assert.equal(frames.length, 31);
  assert.equal(frames[0].time, Date.parse('2026-08-12T12:54:00Z') / 1000);
  assert.equal(frames.at(-1).kind, 'latest');
  assert.equal(frames.at(-1).path, '2026-08-12T15:54:00.000Z');
  assert.equal(frames[1].time - frames[0].time, 6 * 60);
});

test('GeoMet Reduced Data keeps only the latest hour and bounds hostile dimensions', () => {
  const frames = buildGeometRadarFrames(
    '2026-08-12T12:54:00Z/2026-08-12T15:54:00Z/PT6M',
    '2026-08-12T15:54:00Z',
    { reducedData: true }
  );
  assert.equal(frames.length, 11);
  assert.equal(frames[0].path, '2026-08-12T14:54:00.000Z');
  assert.throws(
    () => buildGeometRadarFrames('2026-01-01T00:00:00Z/2026-12-31T00:00:00Z/PT1M'),
    /safety limit/
  );
});

test('GeoMet helpers accept bounded durations and build layer-specific capabilities requests', () => {
  assert.equal(isoDurationSeconds('PT6M'), 360);
  assert.equal(isoDurationSeconds('PT1H30M'), 5400);
  assert.equal(isoDurationSeconds('P1D'), null);
  const url = new URL(geometCapabilitiesUrl('fr'));
  assert.equal(url.hostname, 'geo.weather.gc.ca');
  assert.equal(url.searchParams.get('layer'), GEOMET_RADAR_LAYER);
  assert.equal(url.searchParams.get('lang'), 'fr');
});
