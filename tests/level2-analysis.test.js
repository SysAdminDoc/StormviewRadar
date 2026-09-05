import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseSweepIndex, detectVelocityCoupletsFromSweep } from '../src/level2-analysis.js';

function radarMoment(value, reflectivity) {
  const velocityData = Array(30).fill(0);
  const reflectivityData = Array(30).fill(0);
  [4, 5, 6].forEach(index => {
    velocityData[index] = index === 5 ? value : value * 0.8;
    reflectivityData[index] = reflectivity;
  });
  return {
    velocity: {
      first_gate: 5,
      gate_size: 1,
      gate_count: velocityData.length,
      moment_data: velocityData
    },
    reflect: {
      first_gate: 5,
      gate_size: 1,
      gate_count: reflectivityData.length,
      moment_data: reflectivityData
    }
  };
}

function radial(azimuth, velocity, reflectivity = 48) {
  return {
    azimuth,
    volume: { latitude: 35, longitude: -97 },
    ...radarMoment(velocity, reflectivity)
  };
}

test('velocity couplet detector requires compact opposite flow in precipitation', () => {
  const detections = detectVelocityCoupletsFromSweep([
    radial(10, -22),
    radial(10.5, 24)
  ]);

  assert.equal(detections.length, 1);
  assert.equal(detections[0].shearMs, 46);
  assert.equal(detections[0].rangeKm, 10);
  assert.equal(detections[0].reflectivityDbz, 48);
  assert.equal(detections[0].bearing, 10);
  assert.ok(detections[0].latitude > 35);
  assert.ok(detections[0].longitude > -97);

  assert.deepEqual(detectVelocityCoupletsFromSweep([
    radial(10, -17),
    radial(10.5, 17)
  ]), []);
  assert.deepEqual(detectVelocityCoupletsFromSweep([
    radial(10, -22, 10),
    radial(10.5, 24, 10)
  ]), []);
});

test('sweep selection prefers the requested elevation and falls back to the lowest cut', () => {
  const candidates = [
    { elevation: 1, angle: 0.5 },
    { elevation: 3, angle: 1.5 },
    { elevation: 5, angle: 2.4 }
  ];

  // No request, or a non-integer request, means the lowest cut.
  assert.equal(chooseSweepIndex(candidates, null), 0);
  assert.equal(chooseSweepIndex(candidates, undefined), 0);
  assert.equal(chooseSweepIndex(candidates, 1.5), 0);
  assert.equal(chooseSweepIndex(candidates, 'three'), 0);

  // A requested elevation is matched by its index in the volume, not its angle.
  assert.equal(chooseSweepIndex(candidates, 1), 0);
  assert.equal(chooseSweepIndex(candidates, 3), 1);
  assert.equal(chooseSweepIndex(candidates, 5), 2);

  // An elevation this volume does not carry degrades to the lowest cut.
  assert.equal(chooseSweepIndex(candidates, 4), 0);
  assert.equal(chooseSweepIndex(candidates, 99), 0);

  assert.equal(chooseSweepIndex([], 3), -1);
  assert.equal(chooseSweepIndex(null, 3), -1);
});
