import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LOCAL_OVERLAY_LIMITS,
  parseLocalOverlay,
  sanitizeFeatureCollection
} from '../src/local-overlay.js';

test('GeoJSON overlays are bounded and strip unsafe property shapes', () => {
  const overlay = parseLocalOverlay(JSON.stringify({
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {
        name: '<img src=x onerror=alert(1)>',
        nested: { secret: true },
        count: 3
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-97, 35], [-96, 35], [-96, 36], [-97, 35]]]
      }
    }]
  }));

  assert.equal(overlay.features.length, 1);
  assert.equal(overlay.features[0].properties.name, '<img src=x onerror=alert(1)>');
  assert.equal(overlay.features[0].properties.count, 3);
  assert.equal('nested' in overlay.features[0].properties, false);
});

test('local overlays reject unsupported, excessive, and invalid geometry', () => {
  assert.throws(() => sanitizeFeatureCollection({
    type: 'FeatureCollection',
    features: Array.from({ length: LOCAL_OVERLAY_LIMITS.features + 1 }, () => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [0, 0] }
    }))
  }), /exceeds 500 features/);
  assert.throws(() => parseLocalOverlay(JSON.stringify({
    type: 'Feature',
    properties: {},
    geometry: { type: 'GeometryCollection', geometries: [] }
  })), /Unsupported geometry type/);
  assert.throws(() => parseLocalOverlay(JSON.stringify({
    type: 'Feature',
    properties: {},
    geometry: { type: 'Point', coordinates: [500, 35] }
  })), /outside longitude\/latitude bounds/);
  assert.throws(() => parseLocalOverlay('<!DOCTYPE kml><kml/>', '.kml', () => null), /not allowed/);
});
