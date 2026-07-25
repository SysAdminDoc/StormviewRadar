import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildStormTopColumns,
    stormTopDisplayScale,
    stormTopHeightMeters
} from '../src/storm-top-3d.js';

test('storm-top columns preserve measured echo-top height and reject invalid cells', () => {
    assert.equal(stormTopHeightMeters({ topKft: 50 }), 15240);
    assert.equal(stormTopHeightMeters({ topKft: 0 }), 0);
    assert.equal(stormTopHeightMeters({ topKft: 101 }), 0);

    const columns = buildStormTopColumns([
        { radar: 'KTLX', id: 'A1', latitude: 35, longitude: -97, topKft: 50, maxDbz: 60 },
        { radar: 'KTLX', id: 'BAD', latitude: NaN, longitude: -97, topKft: 40 }
    ]);
    assert.equal(columns.length, 1);
    assert.equal(columns[0].heightMeters, 15240);
    assert.equal(columns[0].id, 'KTLX-A1');
});

test('storm-top display scale remains legible while preserving measured labels', () => {
    assert.equal(stormTopDisplayScale(4), 20);
    assert.equal(stormTopDisplayScale(6), 8);
    assert.equal(stormTopDisplayScale(9), 2);
});

test('storm-top columns prioritize threat markers and enforce the render budget', () => {
    const ordinary = { radar: 'KOUN', id: 'LOW', latitude: 35, longitude: -97, topKft: 55, maxDbz: 55 };
    const tornado = { radar: 'KOUN', id: 'TVS', latitude: 35.2, longitude: -97.2, topKft: 40, maxDbz: 50, tvs: 'TVS' };
    const columns = buildStormTopColumns([ordinary, tornado], 1);
    assert.equal(columns.length, 1);
    assert.equal(columns[0].id, 'KOUN-TVS');
    assert.equal(columns[0].color, '#ef4444');
});
