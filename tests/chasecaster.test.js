import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cardinalDirection,
  normalizeChasePosition,
  normalizeHeading,
  orientationHeading,
  smoothHeading
} from '../src/chasecaster.js';

test('headings normalize, label, and smooth across north without wrapping backward', () => {
  assert.equal(normalizeHeading(-10), 350);
  assert.equal(normalizeHeading(725), 5);
  assert.equal(normalizeHeading(null), null);
  assert.equal(normalizeHeading(''), null);
  assert.equal(normalizeHeading('nope'), null);
  assert.equal(cardinalDirection(0), 'N');
  assert.equal(cardinalDirection(91), 'E');
  assert.equal(cardinalDirection(225), 'SW');
  assert.equal(smoothHeading(350, 10, 0.5), 0);
  assert.equal(smoothHeading(10, 350, 0.5), 0);
});

test('device orientation prefers iOS compass heading and corrects absolute alpha for screen rotation', () => {
  assert.deepEqual(orientationHeading({ webkitCompassHeading: 274, webkitCompassAccuracy: 12 }), {
    heading: 274,
    absolute: true,
    calibrated: true
  });
  assert.deepEqual(orientationHeading({ type: 'deviceorientationabsolute', alpha: 90, absolute: true }, 90), {
    heading: 0,
    absolute: true,
    calibrated: true
  });
  assert.deepEqual(orientationHeading({ type: 'deviceorientation', alpha: 180, absolute: false }), {
    heading: 180,
    absolute: false,
    calibrated: false
  });
  assert.equal(orientationHeading({ alpha: null }), null);
});

test('chase positions bound sensor values and reject malformed coordinates', () => {
  assert.deepEqual(normalizeChasePosition({
    timestamp: 1234,
    coords: { latitude: 41.6, longitude: -93.6, accuracy: 8.5, speed: 12, heading: 361 }
  }), {
    latitude: 41.6,
    longitude: -93.6,
    accuracyMeters: 8.5,
    speedMps: 12,
    course: 1,
    timestamp: 1234
  });
  assert.equal(normalizeChasePosition({ latitude: 91, longitude: 0 }), null);
  assert.equal(normalizeChasePosition({ latitude: 40, longitude: Number.NaN }), null);
});
