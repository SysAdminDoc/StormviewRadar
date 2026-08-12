import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_COMPARISON_LOCATION,
  normalizeComparisonLocation,
  normalizeLocationResults,
  shortLocationName
} from '../src/split-view.js';

test('comparison locations are bounded and preserve a safe city label', () => {
  assert.deepEqual(normalizeComparisonLocation({
    latitude: 41.6,
    longitude: -93.6,
    zoom: 99,
    name: 'Des\u0000 Moines, Iowa'
  }), { latitude: 41.6, longitude: -93.6, zoom: 16, name: 'Des  Moines, Iowa' });
  assert.deepEqual(normalizeComparisonLocation({ latitude: 200, longitude: 'bad' }), DEFAULT_COMPARISON_LOCATION);
});

test('comparison search rejects malformed coordinates and limits results', () => {
  assert.deepEqual(normalizeLocationResults([
    { lat: '35.47', lon: '-97.52', display_name: 'Oklahoma City, Oklahoma, USA' },
    { lat: 'not-a-number', lon: '-80', display_name: 'Invalid' },
    { lat: '41.59', lon: '-93.62', display_name: 'Des Moines, Iowa, USA' }
  ], 1), [{ latitude: 35.47, longitude: -97.52, displayName: 'Oklahoma City, Oklahoma, USA' }]);
  assert.equal(shortLocationName('Oklahoma City, Oklahoma, USA'), 'Oklahoma City, Oklahoma');
});
