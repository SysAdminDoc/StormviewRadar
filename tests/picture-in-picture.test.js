import test from 'node:test';
import assert from 'node:assert/strict';
import { MINI_RADAR_DEFAULT_VIEW, overviewFromMapView } from '../src/picture-in-picture.js';

test('mini radar follows the primary center with a bounded overview zoom', () => {
  assert.deepEqual(overviewFromMapView({ lat: 35.4676, lng: -97.5164 }, 9), {
    latitude: 35.4676,
    longitude: -97.5164,
    zoom: 7
  });
  assert.equal(overviewFromMapView({ lat: 90, lng: 180 }, 30).zoom, 12);
  assert.equal(overviewFromMapView({ lat: -90, lng: -180 }, 2).zoom, 3);
});

test('mini radar rejects invalid primary views', () => {
  assert.deepEqual(overviewFromMapView({ lat: 120, lng: Infinity }, 'bad'), MINI_RADAR_DEFAULT_VIEW);
});
