import test from 'node:test';
import assert from 'node:assert/strict';
import level2Data from 'nexrad-level-2-data';
import { syntheticLevel2Volume, volumeWithUnknownMessageType } from './worker-fixtures.js';

const { Level2Radar } = level2Data;

function sweepCount(radar) {
  return radar.listElevations().reduce((total, elevation) => total + (radar.data[elevation]?.length || 0), 0);
}

test('a volume carrying an unprocessed message type still decodes the sweeps behind it', () => {
  const baseline = new Level2Radar(syntheticLevel2Volume(), { logger: false });
  assert.equal(sweepCount(baseline), 1);

  for (const messageType of [15, 20, 29]) {
    const radar = new Level2Radar(volumeWithUnknownMessageType(messageType), { logger: false });
    // The unknown record contributes nothing and must not truncate the file,
    // so the real radial behind it still arrives.
    assert.equal(sweepCount(radar), 1, `message type ${messageType} lost the sweep behind it`);
    assert.equal(radar.isTruncated, false, `message type ${messageType} truncated the volume`);
    assert.deepEqual(radar.listElevations(), [1]);
  }
});

test('hasGaps is not evidence of missing radials in this decoder', () => {
  // nexrad-level-2-data sets hasGaps for any volume containing a message 31,
  // which is every modern volume, so the app must not warn on it.
  const radar = new Level2Radar(syntheticLevel2Volume(), { logger: false });
  assert.equal(radar.hasGaps, true);
  assert.equal(radar.isTruncated, false);
});
