import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIowa511Query,
  clipBoundsToIowa,
  normalizeIowa511Events,
  roadEventKind
} from '../src/road-events.js';

test('Iowa 511 queries are clipped to declared state coverage', () => {
  assert.deepEqual(clipBoundsToIowa([-125, 24, -66, 50]), [-96.7, 40.3, -90.1, 43.6]);
  assert.equal(clipBoundsToIowa([-80, 30, -70, 40]), null);

  const query = new URL(buildIowa511Query([-94, 41, -92, 43]));
  assert.equal(query.hostname, 'services.arcgis.com');
  assert.equal(query.searchParams.get('geometry'), '-94.00000,41.00000,-92.00000,43.00000');
  assert.match(query.searchParams.get('where'), /lane_closure/);
  assert.equal(query.searchParams.get('f'), 'geojson');
});

test('Iowa 511 rows group endpoints into bounded, safe road events', () => {
  const payload = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          OBJECTID: 1,
          ID: 'IACARS4-1',
          STYLE: 'roadwork',
          headline: '<img src=x onerror=alert(1)>',
          phrase: 'Road Construction',
          Route: 'I-80',
          msg0: 'Right lane closed',
          EditDate: 1786533787000,
          linktxt: 'https://511ia.org/event/IACARS4-1'
        },
        geometry: { type: 'Point', coordinates: [-93.62, 41.59] }
      },
      {
        type: 'Feature',
        properties: {
          OBJECTID: 2,
          ID: 'IACARS4-1',
          STYLE: 'closure',
          EditDate: 1786533787662,
          linktxt: 'javascript:alert(1)'
        },
        geometry: { type: 'Point', coordinates: [-93.61, 41.60] }
      },
      {
        type: 'Feature',
        properties: { OBJECTID: 3, STYLE: 'restriction', headline: 'Weight restriction' },
        geometry: { type: 'Point', coordinates: [-91.6, 42.0] }
      },
      {
        type: 'Feature',
        properties: { OBJECTID: 4, ID: 'invalid', STYLE: 'closure' },
        geometry: { type: 'Polygon', coordinates: [] }
      }
    ]
  };

  const result = normalizeIowa511Events(payload);
  assert.equal(result.features.length, 2);
  assert.equal(result.features[0].id, 'IACARS4-1');
  assert.equal(result.features[0].properties.kind, 'closure');
  assert.equal(result.features[0].properties.headline, '<img src=x onerror=alert(1)>');
  assert.equal(result.features[0].properties.sourceUrl, 'https://511ia.org/event/IACARS4-1');
  assert.equal(result.features[0].geometry.type, 'MultiPoint');
  assert.equal(result.features[0].geometry.coordinates.length, 2);
  assert.equal(result.updatedAt, '2026-08-12T11:23:07.662Z');
  assert.equal(roadEventKind('lane_closure'), 'laneClosure');
});
