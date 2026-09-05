import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_COMPARISON_LOCATION,
  mrmsProductTileKey,
  normalizeComparisonLocation,
  normalizeComparisonProduct,
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

test('comparison products map to their MRMS tile keys', () => {
  assert.equal(mrmsProductTileKey('reflectivity'), 'n0q');
  assert.equal(mrmsProductTileKey('velocity'), 'n0v');
  assert.equal(mrmsProductTileKey('echoTops'), 'net');
  assert.equal(mrmsProductTileKey('precipAccum'), 'n1p');
  // An unknown product must not resolve to a different product's tiles.
  assert.equal(mrmsProductTileKey('correlationCoefficient'), 'n0q');
  assert.equal(mrmsProductTileKey(undefined), 'n0q');
});

test('a comparison product equal to the primary means mirror it', () => {
  assert.equal(normalizeComparisonProduct('velocity', 'reflectivity'), 'velocity');
  // Selecting what the primary already shows is not a comparison.
  assert.equal(normalizeComparisonProduct('velocity', 'velocity'), '');
  assert.equal(normalizeComparisonProduct('', 'reflectivity'), '');
  // Products this pane cannot render must not be accepted.
  assert.equal(normalizeComparisonProduct('correlationCoefficient', 'reflectivity'), '');
  assert.equal(normalizeComparisonProduct(null, 'reflectivity'), '');
  assert.equal(normalizeComparisonProduct(7, 'reflectivity'), '');
});
