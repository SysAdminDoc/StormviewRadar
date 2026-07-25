import assert from 'node:assert/strict';
import test from 'node:test';

import {
  alertIdentifier,
  alertMatchesAudioSettings,
  alertUrgency,
  geometryDistanceKm
} from '../src/alert-audio.js';

const nearbyPolygon = {
  type: 'Polygon',
  coordinates: [[
    [-97.2, 34.8],
    [-96.8, 34.8],
    [-96.8, 35.2],
    [-97.2, 35.2],
    [-97.2, 34.8]
  ]]
};

function alert(overrides = {}) {
  return {
    id: 'https://api.weather.gov/alerts/urn:oid:test',
    properties: {
      event: 'Tornado Warning',
      severity: 'Extreme',
      sent: '2026-07-25T22:00:00Z',
      areaDesc: 'Test County',
      ...overrides
    },
    geometry: nearbyPolygon
  };
}

test('alert audio matching enforces severity, type, and polygon distance', () => {
  const settings = {
    alertAudioSeverity: 'severe',
    alertAudioType: 'tornado',
    alertAudioDistanceMiles: 25
  };
  assert.equal(alertMatchesAudioSettings(alert(), settings, { latitude: 35, longitude: -97 }), true);
  assert.equal(alertMatchesAudioSettings(alert({ severity: 'Moderate' }), settings, { latitude: 35, longitude: -97 }), false);
  assert.equal(alertMatchesAudioSettings(alert({ event: 'Flash Flood Warning' }), settings, { latitude: 35, longitude: -97 }), false);
  assert.equal(alertMatchesAudioSettings(alert(), settings, { latitude: 40, longitude: -100 }), false);
  assert.equal(geometryDistanceKm(nearbyPolygon, { latitude: 35, longitude: -97 }), 0);
});

test('alert identity and urgency are stable with incomplete provider data', () => {
  assert.match(alertIdentifier(alert()), /urn:oid:test/);
  assert.equal(alertUrgency(alert()), 'extreme');
  assert.equal(alertUrgency(alert({ event: 'Severe Thunderstorm Warning', severity: 'Severe' })), 'severe');
  assert.equal(alertUrgency(alert({ event: 'Flood Advisory', severity: 'Minor' })), 'standard');
  assert.equal(
    alertIdentifier({ properties: { sent: '2026-07-25T22:00:00Z', event: 'Flood Watch', areaDesc: 'A' } }),
    '2026-07-25T22:00:00Z:Flood Watch:A'
  );
});
