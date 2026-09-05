import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STALE_LEVEL_TWO_MINUTES,
  normalizeRadarSiteHealth,
  normalizeRadarSiteHealthIndex,
  radarSiteHealthBadge,
  radarSiteHealthSummary
} from '../src/radar-sites.js';

const NOW = Date.parse('2026-09-05T04:20:00Z');

function station(id, rda, latencyMinutes = 2) {
  return {
    properties: {
      id,
      latency: latencyMinutes === null ? undefined : {
        levelTwoLastReceivedTime: new Date(NOW - latencyMinutes * 60000).toISOString()
      },
      rda: rda === null ? null : { properties: rda }
    }
  };
}

test('an operating site with no maintenance flag reports as operating', () => {
  const health = normalizeRadarSiteHealth(
    station('KDMX', { status: 'Operate', operabilityStatus: 'RDA - On-line', alarmSummary: 'No Alarms' }),
    { now: NOW }
  );
  assert.equal(health.state, 'operating');
  assert.equal(health.ageMinutes, 2);
  assert.equal(radarSiteHealthBadge(health), '');
  assert.match(radarSiteHealthSummary(health), /Operating/);
  assert.match(radarSiteHealthSummary(health), /last volume 2 min ago/);
});

test('a maintenance flag degrades a site that still says it is operating', () => {
  const health = normalizeRadarSiteHealth(
    station('KTLX', {
      status: 'Operate',
      operabilityStatus: 'RDA - Maintenance Action Mandatory',
      alarmSummary: 'Tower/Utilities'
    }),
    { now: NOW }
  );
  assert.equal(health.state, 'degraded');
  assert.equal(radarSiteHealthBadge(health), ' (maintenance)');
  assert.match(radarSiteHealthSummary(health), /Maintenance Action Mandatory/);
  assert.match(radarSiteHealthSummary(health), /Tower\/Utilities/);
});

test('a site that is not operating reports as down whatever its latency says', () => {
  const health = normalizeRadarSiteHealth(
    station('KFWS', { status: 'Start-Up', operabilityStatus: 'RDA - On-line' }, 1),
    { now: NOW }
  );
  assert.equal(health.state, 'down');
  assert.equal(radarSiteHealthBadge(health), ' (offline)');
  assert.match(radarSiteHealthSummary(health), /Offline: Start-Up/);
});

test('a stale Level II feed outranks an otherwise healthy status', () => {
  const health = normalizeRadarSiteHealth(
    station('KOAX', { status: 'Operate', operabilityStatus: 'RDA - On-line' }, STALE_LEVEL_TWO_MINUTES + 5),
    { now: NOW }
  );
  assert.equal(health.state, 'stale');
  assert.equal(radarSiteHealthBadge(health), ' (no recent data)');
  assert.match(radarSiteHealthSummary(health), /No recent Level II volume/);
});

test('a site one minute inside the staleness window is still operating', () => {
  const health = normalizeRadarSiteHealth(
    station('KLOT', { status: 'Operate', operabilityStatus: 'RDA - On-line' }, STALE_LEVEL_TWO_MINUTES - 1),
    { now: NOW }
  );
  assert.equal(health.state, 'operating');
});

test('a missing RDA block is unknown rather than healthy', () => {
  const health = normalizeRadarSiteHealth(station('KABR', null, null), { now: NOW });
  assert.equal(health.state, 'unknown');
  assert.equal(health.ageMinutes, null);
  assert.equal(radarSiteHealthSummary(health), 'Site status unavailable');
});

test('a timestamp in the future is not treated as evidence of freshness', () => {
  const health = normalizeRadarSiteHealth(
    station('KUEX', { status: 'Operate', operabilityStatus: 'RDA - On-line' }, -30),
    { now: NOW }
  );
  assert.equal(health.ageMinutes, 0);
  assert.equal(health.state, 'operating');
});

test('the index keys four-letter sites and drops anything else', () => {
  const index = normalizeRadarSiteHealthIndex({
    features: [
      station('KDMX', { status: 'Operate', operabilityStatus: 'RDA - On-line' }),
      station('TDJT', { status: 'Operate', operabilityStatus: 'RDA - On-line' }),
      station('BAD', { status: 'Operate' }),
      station('', { status: 'Operate' })
    ]
  }, { now: NOW });
  assert.deepEqual([...index.keys()].sort(), ['KDMX', 'TDJT']);
});

test('a non-object payload yields an empty index rather than throwing', () => {
  assert.equal(normalizeRadarSiteHealthIndex(null).size, 0);
  assert.equal(normalizeRadarSiteHealthIndex({ features: 'nope' }).size, 0);
});

test('an inoperable RDA is down even while the status still says operate', () => {
  const health = normalizeRadarSiteHealth(
    station('KBBX', { status: 'Operate', operabilityStatus: 'RDA - Inoperable' }, 1),
    { now: NOW }
  );
  assert.equal(health.state, 'down');
  assert.equal(radarSiteHealthBadge(health), ' (offline)');
});

test('maintenance action required degrades like mandatory does', () => {
  const health = normalizeRadarSiteHealth(
    station('KEAX', { status: 'Operate', operabilityStatus: 'RDA - Maintenance Action Required' }),
    { now: NOW }
  );
  assert.equal(health.state, 'degraded');
});
