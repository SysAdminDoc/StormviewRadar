import assert from 'node:assert/strict';
import test from 'node:test';
import { meshColor, parseMeshGrib, parsePngChunks } from '../src/mesh-analysis.js';

function section(number, length) {
  const bytes = new Uint8Array(length);
  new DataView(bytes.buffer).setUint32(0, length, false);
  bytes[4] = number;
  return bytes;
}

function pngChunk(type, data = new Uint8Array()) {
  const bytes = new Uint8Array(12 + data.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, data.length, false);
  bytes.set(new TextEncoder().encode(type), 4);
  bytes.set(data, 8);
  return bytes;
}

function syntheticPng() {
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, 2, false);
  view.setUint32(4, 1, false);
  header[8] = 16;
  return Uint8Array.from([
    137, 80, 78, 71, 13, 10, 26, 10,
    ...pngChunk('IHDR', header),
    ...pngChunk('IDAT', Uint8Array.of(1, 2, 3)),
    ...pngChunk('IEND')
  ]);
}

function syntheticMeshGrib() {
  const identification = section(1, 21);
  const identificationView = new DataView(identification.buffer);
  identificationView.setUint16(12, 2026, false);
  identification[14] = 7;
  identification[15] = 25;
  identification[16] = 22;
  identification[17] = 10;
  identification[18] = 42;

  const grid = section(3, 72);
  const gridView = new DataView(grid.buffer);
  gridView.setUint32(6, 2, false);
  gridView.setUint16(12, 0, false);
  gridView.setUint32(30, 2, false);
  gridView.setUint32(34, 1, false);
  gridView.setInt32(46, 54995000, false);
  gridView.setInt32(50, 230005000, false);
  gridView.setInt32(55, 54995000, false);
  gridView.setInt32(59, 230015000, false);
  gridView.setUint32(63, 10000, false);
  gridView.setUint32(67, 10000, false);

  const product = section(4, 11);
  product[9] = 3;
  product[10] = 28;

  const representation = section(5, 21);
  const representationView = new DataView(representation.buffer);
  representationView.setUint32(5, 2, false);
  representationView.setUint16(9, 41, false);
  representationView.setFloat32(11, -30, false);
  representationView.setInt16(15, 0, false);
  representationView.setInt16(17, 1, false);
  representation[19] = 16;

  const png = syntheticPng();
  const data = section(7, 5 + png.length);
  data.set(png, 5);
  const end = new TextEncoder().encode('7777');
  const total = 16 + identification.length + grid.length + product.length
    + representation.length + data.length + end.length;
  const grib = new Uint8Array(total);
  grib.set(new TextEncoder().encode('GRIB'));
  grib[6] = 209;
  grib[7] = 2;
  let offset = 16;
  [identification, grid, product, representation, data, end].forEach(part => {
    grib.set(part, offset);
    offset += part.length;
  });
  return grib.buffer;
}

test('MESH parser validates NOAA product metadata and packing', () => {
  const parsed = parseMeshGrib(syntheticMeshGrib());
  assert.deepEqual(parsed.grid, {
    width: 2,
    height: 1,
    north: 54.995,
    west: -129.995,
    south: 54.995,
    east: -129.985,
    dx: 0.01,
    dy: 0.01,
    scanningMode: 0
  });
  assert.equal(parsed.representation.referenceValue, -30);
  assert.equal(parsed.validTime, Date.UTC(2026, 6, 25, 22, 10, 42) / 1000);
  assert.deepEqual(parsePngChunks(parsed.png).header, {
    width: 2,
    height: 1,
    bitDepth: 16,
    colorType: 0,
    compression: 0,
    filter: 0,
    interlace: 0
  });
});

test('MESH color ramp hides sub-quarter-inch estimates and escalates larger hail', () => {
  assert.equal(meshColor(6)[3], 0);
  assert.deepEqual(meshColor(25.4), [34, 197, 94, 165]);
  assert.deepEqual(meshColor(110), [239, 68, 68, 230]);
});
