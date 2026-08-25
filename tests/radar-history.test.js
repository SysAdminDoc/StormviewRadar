import test from 'node:test';
import assert from 'node:assert/strict';

import {
  archiveReflectivityUrl,
  buildRadarHistoryFrames,
  MAX_RADAR_HISTORY_FRAMES,
  radarHistoryHours,
  radarHistoryTickIndices
} from '../src/radar-history.js';

test('radar history builds six hours of immutable five-minute frames behind the live tile', () => {
  const validTime = Date.parse('2026-08-12T18:03:40Z') / 1000;
  const frames = buildRadarHistoryFrames(validTime);

  assert.equal(frames.length, MAX_RADAR_HISTORY_FRAMES);
  assert.equal(frames[0].time, Date.parse('2026-08-12T12:00:00Z') / 1000);
  assert.equal(frames[0].path, 'https://mesonet.agron.iastate.edu/archive/data/2026/08/12/GIS/uscomp/n0q_202608121200.png');
  assert.equal(frames.at(-1).time, Date.parse('2026-08-12T18:00:00Z') / 1000);
  assert.equal(frames.at(-1).path, 'mrms-current');
  assert.equal(frames.at(-1).kind, 'latest');
  assert.equal(new Set(frames.map(frame => frame.cacheKey)).size, frames.length);
});

test('Reduced Data bounds radar history to one hour', () => {
  const frames = buildRadarHistoryFrames(Date.parse('2026-08-12T18:00:00Z') / 1000, { reducedData: true });
  assert.equal(radarHistoryHours(false), 6);
  assert.equal(radarHistoryHours(true), 1);
  assert.equal(frames.length, 13);
  assert.equal(frames[0].time, Date.parse('2026-08-12T17:00:00Z') / 1000);
});

test('radar history URLs and hour ticks are UTC-aligned and deterministic', () => {
  assert.equal(
    archiveReflectivityUrl(Date.parse('2026-08-13T00:02:59Z') / 1000),
    'https://mesonet.agron.iastate.edu/archive/data/2026/08/13/GIS/uscomp/n0q_202608130000.png'
  );
  const frames = buildRadarHistoryFrames(Date.parse('2026-08-12T18:00:00Z') / 1000);
  assert.deepEqual(
    radarHistoryTickIndices(frames).map(tick => tick.hoursAgo),
    [6, 5, 4, 3, 2, 1, 0]
  );
  assert.throws(() => buildRadarHistoryFrames('invalid'), /valid provider time/);
});
