import assert from 'node:assert/strict';
import test from 'node:test';
import { detectVelocityCoupletsFromSweep } from '../src/level2-analysis.js';

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
