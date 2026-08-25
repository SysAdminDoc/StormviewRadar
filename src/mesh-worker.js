import { meshColor, parseMeshGrib, parsePngChunks } from './mesh-analysis.js';
import { meshPaletteStops, normalizeVisualPalette } from './visual-palette.js';

function paethPredictor(left, up, upperLeft) {
    const prediction = left + up - upperLeft;
    const leftDistance = Math.abs(prediction - left);
    const upDistance = Math.abs(prediction - up);
    const upperLeftDistance = Math.abs(prediction - upperLeft);
    if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
    return upDistance <= upperLeftDistance ? up : upperLeft;
}

async function decompress(buffer, format) {
    if (typeof DecompressionStream !== 'function') {
        throw new Error('This browser cannot decompress MRMS data');
    }
    const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream(format));
    return new Response(stream).arrayBuffer();
}

async function renderMesh(compressedBuffer, requestedPalette = 'standard') {
    const palette = normalizeVisualPalette(requestedPalette);
    const gribBuffer = await decompress(compressedBuffer, 'gzip');
    const parsed = parseMeshGrib(gribBuffer);
    const { header, compressed } = parsePngChunks(parsed.png);
    if (header.width !== parsed.grid.width || header.height !== parsed.grid.height) {
        throw new Error('MESH PNG dimensions do not match its GRIB2 grid');
    }
    const raw = new Uint8Array(await decompress(compressed, 'deflate'));
    const sourceStride = header.width * 2;
    const expectedLength = (sourceStride + 1) * header.height;
    if (raw.length !== expectedLength) throw new Error('MESH PNG decompressed to an unexpected size');

    const sampleStep = Math.max(1, Math.ceil(header.width / 1750));
    const outputWidth = Math.ceil(header.width / sampleStep);
    const outputHeight = Math.ceil(header.height / sampleStep);
    const rgba = new Uint8ClampedArray(outputWidth * outputHeight * 4);
    let previous = new Uint8Array(sourceStride);
    let current = new Uint8Array(sourceStride);
    let rawOffset = 0;
    let outputOffset = 0;
    let hailPixels = 0;
    let maximumMm = 0;
    const binaryMultiplier = 2 ** parsed.representation.binaryScale;
    const decimalDivisor = 10 ** parsed.representation.decimalScale;
    const colorStops = meshPaletteStops(palette);

    for (let y = 0; y < header.height; y += 1) {
        const filter = raw[rawOffset++];
        for (let index = 0; index < sourceStride; index += 1) {
            const encoded = raw[rawOffset++];
            const left = index >= 2 ? current[index - 2] : 0;
            const up = previous[index];
            const upperLeft = index >= 2 ? previous[index - 2] : 0;
            if (filter === 0) current[index] = encoded;
            else if (filter === 1) current[index] = (encoded + left) & 255;
            else if (filter === 2) current[index] = (encoded + up) & 255;
            else if (filter === 3) current[index] = (encoded + Math.floor((left + up) / 2)) & 255;
            else if (filter === 4) current[index] = (encoded + paethPredictor(left, up, upperLeft)) & 255;
            else throw new Error(`Unsupported MESH PNG filter ${filter}`);
        }

        if (y % sampleStep === 0) {
            for (let x = 0; x < header.width; x += sampleStep) {
                const packedValue = (current[x * 2] << 8) | current[x * 2 + 1];
                const valueMm = (parsed.representation.referenceValue + packedValue * binaryMultiplier) / decimalDivisor;
                const color = meshColor(valueMm, palette, colorStops);
                rgba.set(color, outputOffset);
                outputOffset += 4;
                if (color[3]) {
                    hailPixels += 1;
                    maximumMm = Math.max(maximumMm, valueMm);
                }
            }
        }
        [previous, current] = [current, previous];
    }

    const canvas = new OffscreenCanvas(outputWidth, outputHeight);
    canvas.getContext('2d').putImageData(new ImageData(rgba, outputWidth, outputHeight), 0, 0);
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return {
        blob,
        validTime: parsed.validTime,
        bounds: [
            [parsed.grid.south, parsed.grid.west],
            [parsed.grid.north, parsed.grid.east]
        ],
        hailPixels,
        maximumMm: Math.round(maximumMm * 10) / 10,
        sampleStep,
        palette
    };
}

self.addEventListener('message', async event => {
    const { id, type, buffer, palette } = event.data || {};
    if (!id || type !== 'render' || !(buffer instanceof ArrayBuffer)) return;
    try {
        const result = await renderMesh(buffer, palette);
        self.postMessage({ id, type: 'rendered', ...result });
    } catch (error) {
        self.postMessage({ id, type: 'error', message: error?.message || String(error) });
    }
});
