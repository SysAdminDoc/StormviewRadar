import test from 'node:test';
import assert from 'node:assert/strict';
import {
  alertPaletteColor,
  alertPaletteDash,
  level2PaletteStops,
  meshPaletteStops,
  normalizeVisualPalette,
  stormPaletteColor
} from '../src/visual-palette.js';

test('visual palettes normalize and preserve ordered native radar ramps', () => {
  assert.equal(normalizeVisualPalette('colorblind'), 'colorblind');
  assert.equal(normalizeVisualPalette('unknown'), 'standard');
  const stops = level2PaletteStops('reflectivity', 'colorblind');
  assert.deepEqual(stops.map(stop => stop[0]), [5, 15, 25, 35, 45, 55, 65, 75]);
  assert.deepEqual(stops.at(0)[1], [0, 32, 76]);
  assert.deepEqual(stops.at(-1)[1], [253, 234, 69]);
});

test('color-blind alert symbology combines distinct colors and line patterns', () => {
  const tornado = { properties: { event: 'Tornado Warning' } };
  const severe = { properties: { event: 'Severe Thunderstorm Warning' } };
  const flood = { properties: { event: 'Flash Flood Warning' } };
  assert.equal(alertPaletteColor(tornado, 'colorblind'), '#d55e00');
  assert.equal(alertPaletteColor(severe, 'colorblind'), '#e69f00');
  assert.equal(alertPaletteColor(flood, 'colorblind'), '#0072b2');
  assert.equal(alertPaletteDash(severe, 'colorblind'), '10, 4');
  assert.equal(alertPaletteDash(flood, 'colorblind'), '3, 5');
});

test('analysis palettes cover MESH and storm-threat categories', () => {
  assert.deepEqual(meshPaletteStops('highContrast').at(-1), [101.6, [255, 0, 64, 245]]);
  assert.equal(stormPaletteColor({ tvs: 'TVS' }, 'colorblind'), '#d55e00');
  assert.equal(stormPaletteColor({ meso: 'MESO' }, 'colorblind'), '#cc79a7');
  assert.equal(stormPaletteColor({ posh: 70 }, 'colorblind'), '#e69f00');
  assert.equal(stormPaletteColor({}, 'colorblind'), '#0072b2');
});
