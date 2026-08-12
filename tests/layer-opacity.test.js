import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyLayerOpacity,
  normalizeLayerOpacities
} from '../src/layer-opacity.js';

test('layer opacity settings are bounded and unknown layers are discarded', () => {
  assert.deepEqual(
    normalizeLayerOpacities(
      { alerts: 0.45, lightning: 4, unknown: 0.2 },
      ['alerts', 'lightning', 'states'],
      { states: 0.7 }
    ),
    { alerts: 0.45, lightning: 1, states: 0.7 }
  );
  assert.deepEqual(
    normalizeLayerOpacities({ alerts: 0 }, ['alerts']),
    { alerts: 0.1 }
  );
});

test('nested tile and marker layers preserve their authored opacity', () => {
  const tileValues = [];
  const markerValues = [];
  const tile = {
    options: { opacity: 0.8 },
    setOpacity: value => tileValues.push(value)
  };
  const marker = {
    options: { opacity: 1 },
    setOpacity: value => markerValues.push(value)
  };
  const group = { eachLayer: callback => [tile, marker].forEach(callback) };

  applyLayerOpacity(group, 0.5);
  applyLayerOpacity(group, 0.75);

  assert.deepEqual(tileValues.map(value => Number(value.toFixed(6))), [0.4, 0.6]);
  assert.deepEqual(markerValues, [0.5, 0.75]);
});

test('canvas paths retain independent stroke and fill styling without accumulation', () => {
  const styles = [];
  const path = {
    options: { opacity: 0.9, fillOpacity: 0.25 },
    getElement: () => null,
    setStyle(style) {
      styles.push(style);
      Object.assign(this.options, style);
    }
  };

  applyLayerOpacity(path, 0.4);
  applyLayerOpacity(path, 1);

  assert.deepEqual(styles.map(style => ({
    opacity: Number(style.opacity.toFixed(6)),
    fillOpacity: Number(style.fillOpacity.toFixed(6))
  })), [
    { opacity: 0.36, fillOpacity: 0.1 },
    { opacity: 0.9, fillOpacity: 0.25 }
  ]);
});

test('SVG paths use a non-destructive element multiplier', () => {
  const element = { style: {} };
  const layer = {
    options: { opacity: 0.9, fillOpacity: 0.25 },
    getElement: () => element,
    setStyle: () => assert.fail('SVG opacity should not rewrite path styles')
  };

  applyLayerOpacity(layer, 0.35);

  assert.equal(element.style.opacity, '0.35');
});
