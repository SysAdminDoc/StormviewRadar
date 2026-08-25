import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTrainingScenario,
  trainingFeatureCollection,
  trainingScenarioCatalog
} from '../src/training-overlays.js';

test('training catalog provides bounded archived scenarios with localized study cues', () => {
  const english = trainingScenarioCatalog('en');
  const spanish = trainingScenarioCatalog('es');
  assert.equal(english.length, 3);
  assert.equal(spanish.length, english.length);
  assert.deepEqual(english.map(scenario => scenario.id), spanish.map(scenario => scenario.id));
  english.forEach(scenario => {
    assert.match(scenario.start, /Z$/);
    assert.match(scenario.end, /Z$/);
    assert.ok(new Date(scenario.end) > new Date(scenario.start));
    assert.ok(scenario.annotations.length >= 3 && scenario.annotations.length <= 8);
  });
  assert.notEqual(english[0].summary, spanish[0].summary);
  assert.equal(getTrainingScenario('missing'), null);
});

test('training overlays retain authored geometry while exposing only bounded display properties', () => {
  const scenario = getTrainingScenario('greenfield-supercell');
  const collection = trainingFeatureCollection(scenario);
  assert.equal(collection.type, 'FeatureCollection');
  assert.equal(collection.features.length, 3);
  assert.deepEqual(collection.features.map(feature => feature.properties.trainingIndex), [1, 2, 3]);
  assert.deepEqual(collection.features.map(feature => feature.geometry.type), ['Point', 'LineString', 'Polygon']);
  scenario.annotations[0].geometry.coordinates[0] = 0;
  assert.equal(getTrainingScenario('greenfield-supercell').annotations[0].geometry.coordinates[0], -94.52);
});
