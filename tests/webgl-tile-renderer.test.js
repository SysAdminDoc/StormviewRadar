import test from 'node:test';
import assert from 'node:assert/strict';

import { tileQuad } from '../src/webgl-tile-renderer.js';

test('tile quads map CSS pixels into padded WebGL clip space', () => {
  const vertices = [...tileQuad(
    { left: 100, top: 50, width: 200, height: 100 },
    { left: 0, top: 0, width: 400, height: 200 },
    100
  )].map(value => Number(value.toFixed(6)));

  assert.deepEqual(vertices.slice(0, 12), [
    -0.333333, 0.25, 0, 1,
    0.333333, 0.25, 1, 1,
    -0.333333, -0.25, 0, 0
  ]);
  assert.deepEqual(vertices.slice(12), [
    -0.333333, -0.25, 0, 0,
    0.333333, 0.25, 1, 1,
    0.333333, -0.25, 1, 0
  ]);
});
