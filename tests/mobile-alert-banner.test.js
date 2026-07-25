import test from 'node:test';
import assert from 'node:assert/strict';

import {
    alertBannerIdentifier,
    featureBounds,
    featureIntersectsBounds,
    selectMobileAlert
} from '../src/mobile-alert-banner.js';

function alertFeature(id, event, severity, west, south, east, north, sent) {
    return {
        type: 'Feature',
        id,
        properties: { event, severity, sent, headline: `${event} headline` },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [west, south],
                [east, south],
                [east, north],
                [west, north],
                [west, south]
            ]]
        }
    };
}

test('mobile alert banner bounds and viewport matching reject off-map alerts', () => {
    const feature = alertFeature('near', 'Flood Warning', 'Moderate', -98, 34, -96, 36);
    assert.deepEqual(featureBounds(feature), { west: -98, east: -96, south: 34, north: 36 });
    assert.equal(featureIntersectsBounds(feature, { west: -100, east: -95, south: 33, north: 37 }), true);
    assert.equal(featureIntersectsBounds(feature, { west: -90, east: -80, south: 33, north: 37 }), false);
});

test('mobile alert banner prioritizes severe threats and advances after dismissal', () => {
    const viewport = { west: -100, east: -90, south: 30, north: 40 };
    const flood = alertFeature('flood', 'Flood Warning', 'Moderate', -98, 34, -96, 36, '2026-07-25T18:00:00Z');
    const tornado = alertFeature('tornado', 'Tornado Warning', 'Extreme', -97, 35, -95, 37, '2026-07-25T17:00:00Z');
    const offMap = alertFeature('off-map', 'Tornado Warning', 'Extreme', -80, 35, -79, 36, '2026-07-25T19:00:00Z');

    const initial = selectMobileAlert([flood, offMap, tornado], viewport);
    assert.equal(initial.count, 2);
    assert.equal(alertBannerIdentifier(initial.feature), 'tornado');

    const dismissed = selectMobileAlert([flood, offMap, tornado], viewport, new Set(['tornado']));
    assert.equal(dismissed.count, 1);
    assert.equal(dismissed.id, 'flood');
});
