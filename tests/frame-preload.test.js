import test from 'node:test';
import assert from 'node:assert/strict';
import {
  effectivePreloadWindow,
  frameWindowIndices,
  normalizePreloadWindow
} from '../src/frame-preload.js';

test('preload settings are integral, bounded, and reduced-data aware', () => {
  assert.equal(normalizePreloadWindow('3.4'), 3);
  assert.equal(normalizePreloadWindow(-10), 0);
  assert.equal(normalizePreloadWindow(99), 8);
  assert.equal(normalizePreloadWindow('invalid', 5), 5);
  assert.equal(effectivePreloadWindow(6, true), 2);
  assert.equal(effectivePreloadWindow(1, true), 1);
});

test('frame windows include both sides of the playhead with optional wrapping', () => {
  assert.deepEqual(frameWindowIndices(10, 4, 2), [4, 5, 3, 6, 2]);
  assert.deepEqual(frameWindowIndices(5, 0, 2), [0, 1, 4, 2, 3]);
  assert.deepEqual(frameWindowIndices(5, 0, 2, { loop: false }), [0, 1, 2]);
  assert.deepEqual(frameWindowIndices(3, 1, 8), [1, 2, 0]);
});
