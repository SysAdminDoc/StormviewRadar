import test from 'node:test';
import assert from 'node:assert/strict';

import {
    clusterStormReports,
    stormReportTypeCounts
} from '../src/storm-report-clusters.js';

function report(id, longitude, latitude, typetext = 'HAIL') {
    return {
        type: 'Feature',
        properties: { id, typetext },
        geometry: { type: 'Point', coordinates: [longitude, latitude] }
    };
}

test('nearby storm reports cluster at low zoom and separate at detail zoom', () => {
    const reports = [
        report('a', -97, 35),
        report('b', -96.99, 35.01),
        report('c', -96.98, 35.02)
    ];
    const lowZoom = clusterStormReports(reports, 5);
    const detailZoom = clusterStormReports(reports, 9);

    assert.equal(lowZoom.length, 1);
    assert.deepEqual([lowZoom[0].kind, lowZoom[0].count], ['cluster', 3]);
    assert.equal(detailZoom.length, 3);
    assert.ok(detailZoom.every(item => item.kind === 'report'));
});

test('invalid coordinates are rejected and cluster summaries rank report types', () => {
    const reports = [
        report('a', -97, 35, 'TORNADO'),
        report('b', -96.99, 35.01, 'HAIL'),
        report('c', -96.98, 35.02, 'HAIL'),
        report('bad', 500, 35)
    ];
    const clusters = clusterStormReports(reports, 5);
    assert.equal(clusters[0].count, 3);
    assert.deepEqual(stormReportTypeCounts(clusters[0].features), [
        ['HAIL', 2],
        ['TORNADO', 1]
    ]);
});
