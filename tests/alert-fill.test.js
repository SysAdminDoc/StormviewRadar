import test from 'node:test';
import assert from 'node:assert/strict';

import {
    alertHazardColor,
    alertIssuedAt,
    alertIssuanceProfile
} from '../src/alert-fill.js';

const NOW = Date.parse('2026-07-25T22:00:00Z');

function alert(event, sent, extra = {}) {
    return { properties: { event, sent, ...extra } };
}

test('warning fill fades continuously from issuance through three hours', () => {
    const newlyIssued = alertIssuanceProfile(alert('Tornado Warning', '2026-07-25T21:55:00Z'), NOW);
    const halfway = alertIssuanceProfile(alert('Severe Thunderstorm Warning', '2026-07-25T20:30:00Z'), NOW);
    const old = alertIssuanceProfile(alert('Flash Flood Warning', '2026-07-25T18:00:00Z'), NOW);

    assert.deepEqual(
        [newlyIssued.bucket, newlyIssued.fillOpacity, newlyIssued.lineWeight],
        ['new', 0.412, 3]
    );
    assert.deepEqual([halfway.bucket, halfway.fillOpacity], ['aging', 0.28]);
    assert.deepEqual([old.bucket, old.fillOpacity], ['old', 0.14]);
});

test('issuance parsing and hazard colors support NWS and IEM warning fields', () => {
    const nws = alert('Tornado Warning', '2026-07-25T21:55:00Z');
    const iem = { properties: { phenomena: 'SV', issue: '2026-07-25T21:45:00Z' } };
    const watch = alert('Tornado Watch', '2026-07-25T20:00:00Z');

    assert.equal(alertIssuedAt(nws), Date.parse('2026-07-25T21:55:00Z'));
    assert.equal(alertIssuedAt(iem), Date.parse('2026-07-25T21:45:00Z'));
    assert.equal(alertHazardColor(nws), '#ff0000');
    assert.equal(alertHazardColor(iem), '#ff6600');
    assert.deepEqual(
        [alertIssuanceProfile(watch, NOW).bucket, alertIssuanceProfile(watch, NOW).fillOpacity],
        ['static', 0.14]
    );
});
