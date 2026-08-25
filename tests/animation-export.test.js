import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_ANIMATION_FRAMES,
  MAX_ANIMATION_PIXELS,
  animationDimensions,
  animationFilename,
  encodeAnimatedGif,
  rgbaToGifIndices,
  sampledFrameIndices,
  supportedMp4MimeType
} from '../src/animation-export.js';

test('animation sampling preserves first and last frames within a fixed budget', () => {
  const indices = sampledFrameIndices(73);
  assert.equal(indices.length, MAX_ANIMATION_FRAMES);
  assert.equal(indices[0], 0);
  assert.equal(indices.at(-1), 72);
  assert.equal(new Set(indices).size, indices.length);
  assert.deepEqual(sampledFrameIndices(4), [0, 1, 2, 3]);
  assert.deepEqual(sampledFrameIndices(4, 1), [0]);
});

test('animation dimensions remain even and bounded for video encoders', () => {
  const size = animationDimensions(2560, 1440);
  assert.equal(size.width % 2, 0);
  assert.equal(size.height % 2, 0);
  assert.ok(size.width * size.height <= MAX_ANIMATION_PIXELS);
  assert.ok(Math.max(size.width, size.height) <= 960);
});

test('GIF writer emits a looping GIF89a animation with quantized frames', async () => {
  const red = rgbaToGifIndices(new Uint8ClampedArray([255, 0, 0, 255, 255, 0, 0, 255]));
  const blue = rgbaToGifIndices(new Uint8ClampedArray([0, 0, 255, 255, 0, 0, 255, 255]));
  const blob = encodeAnimatedGif({ width: 2, height: 1, frames: [red, blue], delayMs: 250 });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.equal(new TextDecoder().decode(bytes.subarray(0, 6)), 'GIF89a');
  assert.equal(bytes[6] | (bytes[7] << 8), 2);
  assert.equal(bytes[8] | (bytes[9] << 8), 1);
  assert.equal(bytes.filter(byte => byte === 0x2c).length, 2);
  assert.equal(bytes.at(-1), 0x3b);
});

test('MP4 MIME and filename follow runtime support without relabeling formats', () => {
  const Recorder = { isTypeSupported: type => type === 'video/mp4' };
  assert.equal(supportedMp4MimeType(Recorder), 'video/mp4');
  assert.equal(supportedMp4MimeType({ isTypeSupported: () => false }), null);
  assert.equal(
    animationFilename('HRRR', 'Reflectivity', '2026-08-12T13:05:00Z', 'mp4'),
    'stormview-hrrr-reflectivity-animation-20260812T130500z.mp4'
  );
});
