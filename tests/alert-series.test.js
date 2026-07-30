import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeAlertSeries, resolveAlertZoneGeometries } from '../src/alert-series.js';

const now = Date.parse('2026-07-29T18:00:00Z');
const future = '2026-07-29T20:00:00Z';
const polygon = {
    type: 'Polygon',
    coordinates: [[[-98, 34], [-96, 34], [-96, 36], [-98, 36], [-98, 34]]]
};

function alert(id, overrides = {}) {
    return {
        type: 'Feature',
        id,
        properties: {
            id,
            event: 'Tornado Warning',
            sent: '2026-07-29T17:00:00Z',
            expires: future,
            messageType: 'Alert',
            ...overrides
        },
        geometry: null
    };
}

test('CAP updates supersede referenced alerts under one stable series identity', () => {
    const original = alert('cap-original');
    const update = alert('cap-update', {
        sent: '2026-07-29T17:30:00Z',
        messageType: 'Update',
        headline: 'Updated warning',
        references: [{ identifier: 'cap-original' }]
    });
    const normalized = normalizeAlertSeries([original, update], { now });
    assert.equal(normalized.length, 1);
    assert.equal(normalized[0].id, 'cap-update');
    assert.equal(normalized[0].properties._stormviewSeriesId, 'cap-original');
    assert.equal(normalized[0].properties._stormviewSeriesSize, 2);
});

test('CAP cancellation or expiry removes the alert series once', () => {
    const original = alert('cap-original');
    const cancellation = alert('cap-cancel', {
        sent: '2026-07-29T17:45:00Z',
        messageType: 'Cancel',
        references: [{ identifier: 'cap-original' }]
    });
    assert.deepEqual(normalizeAlertSeries([original, cancellation], { now }), []);
    assert.deepEqual(normalizeAlertSeries([alert('expired', { expires: '2026-07-29T17:59:00Z' })], { now }), []);
});

test('zone-only alerts share cached NWS geometry and preserve unresolved alerts', async () => {
    const cache = new Map();
    const zoneUrl = 'https://api.weather.gov/zones/forecast/OKZ025';
    const features = [
        alert('zone-a', { affectedZones: [zoneUrl] }),
        alert('zone-b', { affectedZones: [zoneUrl] }),
        alert('unresolved')
    ];
    let fetches = 0;
    const fetchZone = async () => {
        fetches += 1;
        return { type: 'Feature', geometry: polygon };
    };
    const first = await resolveAlertZoneGeometries(features, { fetchZone, cache, now });
    const second = await resolveAlertZoneGeometries(features, { fetchZone, cache, now: now + 1000 });
    assert.equal(fetches, 1);
    assert.equal(first.resolvedCount, 2);
    assert.equal(first.unresolvedCount, 1);
    assert.equal(second.features[0].geometry.type, 'Polygon');
    assert.equal(second.features[0].properties._stormviewGeometrySource, 'affectedZones');
});
