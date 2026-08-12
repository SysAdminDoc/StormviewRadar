export const MAX_ANIMATION_FRAMES = 24;
export const MAX_ANIMATION_DIMENSION = 960;
export const MAX_ANIMATION_PIXELS = 600_000;

function finitePositive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

export function sampledFrameIndices(total, maxFrames = MAX_ANIMATION_FRAMES) {
  const count = Math.max(0, Math.trunc(Number(total) || 0));
  const limit = Math.max(1, Math.min(MAX_ANIMATION_FRAMES, Math.trunc(Number(maxFrames) || 1)));
  if (count <= limit) return Array.from({ length: count }, (_, index) => index);
  if (limit === 1) return [0];
  const indices = [];
  for (let index = 0; index < limit; index += 1) {
    indices.push(Math.round(index * (count - 1) / (limit - 1)));
  }
  return [...new Set(indices)];
}

export function animationDimensions(width, height) {
  const sourceWidth = finitePositive(width);
  const sourceHeight = finitePositive(height);
  if (!sourceWidth || !sourceHeight) return { width: 2, height: 2, scale: 1 };
  const scale = Math.min(
    1,
    MAX_ANIMATION_DIMENSION / Math.max(sourceWidth, sourceHeight),
    Math.sqrt(MAX_ANIMATION_PIXELS / (sourceWidth * sourceHeight))
  );
  const outputWidth = Math.max(2, Math.floor(sourceWidth * scale / 2) * 2);
  const outputHeight = Math.max(2, Math.floor(sourceHeight * scale / 2) * 2);
  return { width: outputWidth, height: outputHeight, scale };
}

export function animationFilename(source, product, frameTime, extension = 'gif') {
  const date = frameTime instanceof Date ? frameTime : new Date(frameTime);
  const safeDate = Number.isFinite(date.getTime()) ? date : new Date(0);
  const timestamp = safeDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'z');
  const descriptor = [source, product]
    .map(value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    .filter(Boolean)
    .join('-');
  const safeExtension = extension === 'mp4' ? 'mp4' : 'gif';
  return `stormview-${descriptor || 'radar'}-animation-${timestamp}.${safeExtension}`;
}

export function supportedMp4MimeType(MediaRecorderConstructor = globalThis.MediaRecorder) {
  if (typeof MediaRecorderConstructor?.isTypeSupported !== 'function') return null;
  return [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4;codecs=avc1.424028',
    'video/mp4'
  ].find(type => MediaRecorderConstructor.isTypeSupported(type)) || null;
}

function gifPalette() {
  const palette = new Uint8Array(256 * 3);
  for (let index = 0; index < 256; index += 1) {
    const offset = index * 3;
    palette[offset] = Math.round(((index >> 5) & 7) * 255 / 7);
    palette[offset + 1] = Math.round(((index >> 2) & 7) * 255 / 7);
    palette[offset + 2] = Math.round((index & 3) * 255 / 3);
  }
  return palette;
}

export function rgbaToGifIndices(rgba) {
  const source = rgba instanceof Uint8Array || rgba instanceof Uint8ClampedArray
    ? rgba
    : new Uint8ClampedArray(rgba || []);
  const indices = new Uint8Array(Math.floor(source.length / 4));
  for (let input = 0, output = 0; output < indices.length; input += 4, output += 1) {
    indices[output] = ((source[input] >> 5) << 5)
      | ((source[input + 1] >> 5) << 2)
      | (source[input + 2] >> 6);
  }
  return indices;
}

function littleEndian16(value) {
  return [value & 255, (value >> 8) & 255];
}

function lzwEncode(indices) {
  const minimumCodeSize = 8;
  const clearCode = 1 << minimumCodeSize;
  const endCode = clearCode + 1;
  let nextCode = endCode + 1;
  let codeSize = minimumCodeSize + 1;
  let bitBuffer = 0;
  let bitCount = 0;
  const bytes = [];
  let dictionary = new Map();

  const emit = code => {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      bytes.push(bitBuffer & 255);
      bitBuffer >>>= 8;
      bitCount -= 8;
    }
  };
  const reset = () => {
    dictionary = new Map();
    nextCode = endCode + 1;
    codeSize = minimumCodeSize + 1;
  };

  emit(clearCode);
  if (indices.length) {
    let prefix = indices[0];
    for (let index = 1; index < indices.length; index += 1) {
      const symbol = indices[index];
      const key = prefix * 256 + symbol;
      const existing = dictionary.get(key);
      if (existing !== undefined) {
        prefix = existing;
        continue;
      }
      emit(prefix);
      if (nextCode < 4096) {
        dictionary.set(key, nextCode);
        nextCode += 1;
        if (nextCode === (1 << codeSize) && codeSize < 12) codeSize += 1;
      } else {
        emit(clearCode);
        reset();
      }
      prefix = symbol;
    }
    emit(prefix);
  }
  emit(endCode);
  if (bitCount > 0) bytes.push(bitBuffer & 255);
  return new Uint8Array(bytes);
}

function appendSubBlocks(output, bytes) {
  for (let offset = 0; offset < bytes.length; offset += 255) {
    const block = bytes.subarray(offset, offset + 255);
    output.push(Uint8Array.of(block.length), block);
  }
  output.push(Uint8Array.of(0));
}

export function encodeAnimatedGif({ width, height, frames, delayMs = 500, loop = true }) {
  const safeWidth = Math.trunc(finitePositive(width));
  const safeHeight = Math.trunc(finitePositive(height));
  if (!safeWidth || !safeHeight || safeWidth > MAX_ANIMATION_DIMENSION || safeHeight > MAX_ANIMATION_DIMENSION) {
    throw new Error('GIF dimensions are invalid or exceed the export limit');
  }
  const pixels = safeWidth * safeHeight;
  if (pixels > MAX_ANIMATION_PIXELS) throw new Error('GIF frame exceeds the pixel limit');
  const safeFrames = Array.isArray(frames) ? frames.slice(0, MAX_ANIMATION_FRAMES) : [];
  if (!safeFrames.length || safeFrames.some(frame => frame?.length !== pixels)) {
    throw new Error('GIF frames do not match the export dimensions');
  }

  const output = [
    new TextEncoder().encode('GIF89a'),
    Uint8Array.of(...littleEndian16(safeWidth), ...littleEndian16(safeHeight), 0xf7, 0, 0),
    gifPalette()
  ];
  if (loop) {
    output.push(Uint8Array.of(
      0x21, 0xff, 0x0b,
      ...new TextEncoder().encode('NETSCAPE2.0'),
      0x03, 0x01, 0, 0, 0
    ));
  }
  const delayCentiseconds = Math.max(2, Math.min(65535, Math.round(finitePositive(delayMs) / 10) || 50));
  safeFrames.forEach(frame => {
    output.push(Uint8Array.of(0x21, 0xf9, 0x04, 0x00, ...littleEndian16(delayCentiseconds), 0x00, 0x00));
    output.push(Uint8Array.of(0x2c, 0, 0, 0, 0, ...littleEndian16(safeWidth), ...littleEndian16(safeHeight), 0));
    output.push(Uint8Array.of(8));
    appendSubBlocks(output, lzwEncode(frame));
  });
  output.push(Uint8Array.of(0x3b));
  return new Blob(output, { type: 'image/gif' });
}

function abortableDelay(delayMs, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason || new DOMException('Export cancelled', 'AbortError'));
      return;
    }
    const timeout = setTimeout(resolve, delayMs);
    signal?.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(signal.reason || new DOMException('Export cancelled', 'AbortError'));
    }, { once: true });
  });
}

export async function recordCanvasMp4(canvas, {
  mimeType,
  frameCount,
  delayMs = 500,
  drawFrame,
  signal,
  MediaRecorderConstructor = globalThis.MediaRecorder
} = {}) {
  if (typeof HTMLCanvasElement === 'undefined' || !(canvas instanceof HTMLCanvasElement)
    || typeof canvas.captureStream !== 'function') {
    throw new Error('Canvas video capture is unavailable');
  }
  if (!mimeType || !supportedMp4MimeType(MediaRecorderConstructor)) {
    throw new Error('MP4 recording is unavailable in this browser');
  }
  const count = Math.max(1, Math.min(MAX_ANIMATION_FRAMES, Math.trunc(Number(frameCount) || 0)));
  if (typeof drawFrame !== 'function') throw new Error('An MP4 frame renderer is required');
  const frameRate = Math.max(1, Math.min(30, Math.round(1000 / Math.max(100, delayMs))));
  const stream = canvas.captureStream(frameRate);
  const track = stream.getVideoTracks()[0];
  const chunks = [];
  let recorder;
  try {
    recorder = new MediaRecorderConstructor(stream, {
      mimeType,
      videoBitsPerSecond: Math.min(8_000_000, Math.max(1_500_000, canvas.width * canvas.height * frameRate * 0.5))
    });
    const stopped = new Promise((resolve, reject) => {
      recorder.addEventListener('dataavailable', event => {
        if (event.data?.size) chunks.push(event.data);
      });
      recorder.addEventListener('stop', resolve, { once: true });
      recorder.addEventListener('error', event => reject(event.error || new Error('MP4 recording failed')), { once: true });
    });
    recorder.start();
    for (let index = 0; index < count; index += 1) {
      if (signal?.aborted) throw signal.reason || new DOMException('Export cancelled', 'AbortError');
      await drawFrame(index);
      track?.requestFrame?.();
      await abortableDelay(delayMs, signal);
    }
    recorder.stop();
    await stopped;
    if (!chunks.length) throw new Error('The browser produced an empty MP4 recording');
    return new Blob(chunks, { type: recorder.mimeType || mimeType });
  } finally {
    if (recorder?.state && recorder.state !== 'inactive') recorder.stop();
    stream.getTracks().forEach(streamTrack => streamTrack.stop());
  }
}
