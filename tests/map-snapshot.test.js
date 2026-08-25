import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SNAPSHOT_MAX_DIMENSION,
  SNAPSHOT_MAX_PIXELS,
  snapshotAttribution,
  snapshotFilename,
  snapshotScale
} from '../src/map-snapshot.js';

test('snapshot scale prefers 2x output while enforcing pixel and dimension budgets', () => {
  assert.equal(snapshotScale(1280, 720, 2), 2);
  const largeScale = snapshotScale(3000, 2000, 2);
  assert.ok(largeScale > 0 && largeScale < 2);
  assert.ok(3000 * largeScale <= SNAPSHOT_MAX_DIMENSION);
  assert.ok(3000 * (2000 + 88) * largeScale ** 2 <= SNAPSHOT_MAX_PIXELS + 1);
  assert.equal(snapshotScale(0, 720, 2), 1);
});

test('snapshot filenames are deterministic, safe, and frame-specific', () => {
  assert.equal(
    snapshotFilename('HRRR 18-hour', 'Reflectivity', new Date('2026-08-12T13:05:00.000Z')),
    'stormview-hrrr-18-hour-reflectivity-20260812T130500z.png'
  );
  assert.equal(snapshotFilename('', '', 'invalid'), 'stormview-radar-19700101T000000z.png');
});

test('snapshot attribution strips Leaflet chrome and normalizes provider text', () => {
  assert.equal(
    snapshotAttribution(' Leaflet | Tiles © Esri   and imagery providers '),
    'Tiles © Esri and imagery providers'
  );
  assert.equal(snapshotAttribution(''), 'Provider credits unavailable');
});
