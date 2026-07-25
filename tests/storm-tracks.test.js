import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mergeStormHistory,
  normalizeStormFeature,
  projectStormCell,
  stormCellKey,
  stormTrackColor
} from '../src/storm-tracks.js';

function feature(valid, longitude = -97, latitude = 35, properties = {}) {
  return {
    type: 'Feature',
    properties: {
      nexrad: 'TLX',
      storm_id: 'A1',
      valid,
      tvs: 'NONE',
      meso: 'NONE',
      posh: 10,
      max_size: 0.5,
      max_dbz: 52,
      top: 38,
      drct: 90,
      sknt: 30,
      ...properties
    },
    geometry: { type: 'Point', coordinates: [longitude, latitude] }
  };
}

test('storm attributes normalize safely and project motion geodesically', () => {
  const cell = normalizeStormFeature(feature('2026-07-25T22:00:00Z'));
  assert.equal(stormCellKey(cell), 'TLX:A1');
  assert.equal(stormTrackColor(cell), '#22d3ee');

  const projected = projectStormCell(cell, 60);
  assert.ok(Math.abs(projected.latitude - 34.998) < 0.01);
  assert.ok(Math.abs(projected.longitude - -96.389) < 0.02);

  assert.equal(normalizeStormFeature(feature('invalid')), null);
  assert.equal(normalizeStormFeature({ geometry: { type: 'Point', coordinates: [500, 35] } }), null);
});

test('storm histories deduplicate scans and retain only the latest hour', () => {
  const histories = new Map();
  const referenceTime = Date.parse('2026-07-25T22:00:00Z');
  const scans = [
    normalizeStormFeature(feature('2026-07-25T20:45:00Z', -97.5)),
    normalizeStormFeature(feature('2026-07-25T21:15:00Z', -97.3)),
    normalizeStormFeature(feature('2026-07-25T21:45:00Z', -97.1)),
    normalizeStormFeature(feature('2026-07-25T22:00:00Z', -97))
  ];

  mergeStormHistory(histories, scans, referenceTime);
  mergeStormHistory(histories, [scans[3]], referenceTime);

  const history = histories.get('TLX:A1');
  assert.equal(history.length, 3);
  assert.deepEqual(history.map(point => point.longitude), [-97.3, -97.1, -97]);

  const threat = normalizeStormFeature(feature(
    '2026-07-25T22:00:00Z',
    -97,
    35,
    { tvs: 'TVS', max_size: 2 }
  ));
  assert.equal(stormTrackColor(threat), '#ef4444');
});
