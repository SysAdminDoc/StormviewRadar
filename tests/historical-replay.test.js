import assert from 'node:assert/strict';
import test from 'node:test';

import {
  archiveRadarUrl,
  buildReplayFrames,
  warningActiveAt
} from '../src/historical-replay.js';

test('historical replay builds bounded five-minute IEM archive frames', () => {
  const frames = buildReplayFrames('2024-05-26T19:45:00Z', '2024-05-26T20:00:00Z');
  assert.equal(frames.length, 4);
  assert.equal(frames[0].time, Date.parse('2024-05-26T19:45:00Z') / 1000);
  assert.equal(
    frames.at(-1).path,
    'https://mesonet.agron.iastate.edu/archive/data/2024/05/26/GIS/uscomp/n0q_202405262000.png'
  );
  assert.equal(
    archiveRadarUrl(Date.parse('2026-07-25T00:05:00Z')),
    'https://mesonet.agron.iastate.edu/archive/data/2026/07/25/GIS/uscomp/n0q_202607250005.png'
  );
  assert.throws(
    () => buildReplayFrames('2024-05-26T10:00:00Z', '2024-05-26T17:00:00Z'),
    /limited to 6 hours/
  );
});

test('historical warnings are active only during their polygon validity', () => {
  const warning = {
    properties: {
      issue: '2024-05-26T19:40:00Z',
      polygon_begin: '2024-05-26T19:50:00Z',
      polygon_end: '2024-05-26T20:05:00Z'
    }
  };
  assert.equal(warningActiveAt(warning, Date.parse('2024-05-26T19:49:59Z')), false);
  assert.equal(warningActiveAt(warning, Date.parse('2024-05-26T20:00:00Z')), true);
  assert.equal(warningActiveAt(warning, Date.parse('2024-05-26T20:05:00Z')), false);
});
