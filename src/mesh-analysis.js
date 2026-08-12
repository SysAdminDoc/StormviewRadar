import { meshPaletteStops } from './visual-palette.js';

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

function signedInt16(view, offset) {
    return view.getInt16(offset, false);
}

function scaledCoordinate(view, offset, scale) {
    return view.getInt32(offset, false) * scale;
}

function normalizeLongitude(longitude) {
    return longitude > 180 ? longitude - 360 : longitude;
}

export function meshColor(valueMm, palette = 'standard', stops = meshPaletteStops(palette)) {
    if (!Number.isFinite(valueMm) || valueMm < 6.35) return [0, 0, 0, 0];
    for (let index = 1; index < stops.length; index += 1) {
        if (valueMm < stops[index][0]) return stops[index - 1][1];
    }
    return stops.at(-1)[1];
}

export function parseMeshGrib(buffer) {
    if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 32) {
        throw new Error('MESH payload is too small to be GRIB2');
    }
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    if (String.fromCharCode(...bytes.slice(0, 4)) !== 'GRIB' || bytes[7] !== 2) {
        throw new Error('MESH payload is not GRIB2');
    }
    if (bytes[6] !== 209) throw new Error(`Unexpected MRMS discipline ${bytes[6]}`);

    let grid = null;
    let representation = null;
    let product = null;
    let validTime = null;
    let png = null;
    let offset = 16;
    while (offset + 5 <= bytes.length) {
        if (String.fromCharCode(...bytes.slice(offset, offset + 4)) === '7777') break;
        const length = view.getUint32(offset, false);
        const section = bytes[offset + 4];
        if (length < 5 || offset + length > bytes.length) throw new Error(`Invalid GRIB2 section ${section}`);

        if (section === 1 && length >= 21) {
            validTime = Date.UTC(
                view.getUint16(offset + 12, false),
                bytes[offset + 14] - 1,
                bytes[offset + 15],
                bytes[offset + 16],
                bytes[offset + 17],
                bytes[offset + 18]
            ) / 1000;
        } else if (section === 3 && length >= 72) {
            const template = view.getUint16(offset + 12, false);
            if (template !== 0) throw new Error(`Unsupported MESH grid template ${template}`);
            const basicAngle = view.getUint32(offset + 38, false);
            const subdivisions = view.getUint32(offset + 42, false);
            const scale = !basicAngle || basicAngle === 0xffffffff || !subdivisions || subdivisions === 0xffffffff
                ? 1e-6
                : basicAngle / subdivisions;
            grid = {
                width: view.getUint32(offset + 30, false),
                height: view.getUint32(offset + 34, false),
                north: scaledCoordinate(view, offset + 46, scale),
                west: normalizeLongitude(scaledCoordinate(view, offset + 50, scale)),
                south: scaledCoordinate(view, offset + 55, scale),
                east: normalizeLongitude(scaledCoordinate(view, offset + 59, scale)),
                dx: view.getUint32(offset + 63, false) * scale,
                dy: view.getUint32(offset + 67, false) * scale,
                scanningMode: bytes[offset + 71]
            };
        } else if (section === 4 && length >= 11) {
            product = {
                category: bytes[offset + 9],
                parameter: bytes[offset + 10]
            };
        } else if (section === 5 && length >= 21) {
            const template = view.getUint16(offset + 9, false);
            if (template !== 41) throw new Error(`Unsupported MESH packing template ${template}`);
            representation = {
                pointCount: view.getUint32(offset + 5, false),
                referenceValue: view.getFloat32(offset + 11, false),
                binaryScale: signedInt16(view, offset + 15),
                decimalScale: signedInt16(view, offset + 17),
                bitsPerValue: bytes[offset + 19]
            };
        } else if (section === 7) {
            const payload = bytes.slice(offset + 5, offset + length);
            if (PNG_SIGNATURE.every((value, index) => payload[index] === value)) png = payload.buffer;
        }
        offset += length;
    }

    if (product?.category !== 3 || product?.parameter !== 28) {
        throw new Error('GRIB2 payload is not the MRMS MESH product');
    }
    if (!grid || !representation || !png || !Number.isFinite(validTime)) {
        throw new Error('MESH GRIB2 payload is missing required sections');
    }
    if (grid.width < 1 || grid.height < 1 || grid.width * grid.height > 30000000) {
        throw new Error('MESH grid dimensions exceed the safety limit');
    }
    if (representation.pointCount !== grid.width * grid.height || representation.bitsPerValue !== 16) {
        throw new Error('MESH grid packing does not match the expected 16-bit grid');
    }
    if (grid.scanningMode !== 0) throw new Error(`Unsupported MESH scanning mode ${grid.scanningMode}`);
    return { grid, representation, validTime, png };
}

export function parsePngChunks(buffer) {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    if (bytes.length < 33 || !PNG_SIGNATURE.every((value, index) => bytes[index] === value)) {
        throw new Error('MESH field is not a PNG');
    }
    let offset = 8;
    let header = null;
    const idat = [];
    while (offset + 12 <= bytes.length) {
        const length = view.getUint32(offset, false);
        const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
        const dataStart = offset + 8;
        const dataEnd = dataStart + length;
        if (dataEnd + 4 > bytes.length) throw new Error(`Invalid PNG ${type} chunk`);
        if (type === 'IHDR') {
            header = {
                width: view.getUint32(dataStart, false),
                height: view.getUint32(dataStart + 4, false),
                bitDepth: bytes[dataStart + 8],
                colorType: bytes[dataStart + 9],
                compression: bytes[dataStart + 10],
                filter: bytes[dataStart + 11],
                interlace: bytes[dataStart + 12]
            };
        } else if (type === 'IDAT') {
            idat.push(bytes.slice(dataStart, dataEnd));
        } else if (type === 'IEND') {
            break;
        }
        offset = dataEnd + 4;
    }
    if (!header || !idat.length) throw new Error('MESH PNG is missing image data');
    if (header.bitDepth !== 16 || header.colorType !== 0 || header.compression !== 0
        || header.filter !== 0 || header.interlace !== 0) {
        throw new Error('MESH PNG uses an unsupported encoding');
    }
    const compressedLength = idat.reduce((total, chunk) => total + chunk.length, 0);
    const compressed = new Uint8Array(compressedLength);
    let writeOffset = 0;
    idat.forEach(chunk => {
        compressed.set(chunk, writeOffset);
        writeOffset += chunk.length;
    });
    return { header, compressed };
}
