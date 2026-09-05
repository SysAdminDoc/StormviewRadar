import { deflateSync, gzipSync } from 'node:zlib';

function writeText(buffer, offset, value) {
  buffer.write(value, offset, value.length, 'ascii');
}

export function syntheticLevel2Volume() {
  const buffer = Buffer.alloc(24 + 2432);
  writeText(buffer, 0, 'AR2V0006.001');
  buffer.writeUInt32BE(20000, 12);
  buffer.writeUInt32BE(3600000, 16);
  writeText(buffer, 20, 'KTWX');

  const message = 24 + 12;
  buffer.writeUInt16BE(1210, message);
  buffer[message + 2] = 1;
  buffer[message + 3] = 31;
  buffer.writeUInt16BE(1, message + 4);
  buffer.writeUInt16BE(20000, message + 6);
  buffer.writeUInt32BE(3600000, message + 8);
  buffer.writeUInt16BE(1, message + 12);
  buffer.writeUInt16BE(1, message + 14);

  const radial = message + 16;
  writeText(buffer, radial, 'KTWX');
  buffer.writeUInt32BE(3600000, radial + 4);
  buffer.writeUInt16BE(20000, radial + 8);
  buffer.writeUInt16BE(1, radial + 10);
  buffer.writeFloatBE(0, radial + 12);
  buffer.writeUInt16BE(146, radial + 18);
  buffer[radial + 22] = 1;
  buffer.writeFloatBE(0.5, radial + 24);
  buffer.writeUInt16BE(2, radial + 30);
  buffer.writeUInt32BE(68, radial + 32);
  buffer.writeUInt32BE(114, radial + 36);

  const volume = radial + 68;
  writeText(buffer, volume, 'RVOL');
  buffer.writeUInt16BE(46, volume + 4);
  buffer[volume + 6] = 1;
  buffer.writeFloatBE(38.997, volume + 8);
  buffer.writeFloatBE(-96.232, volume + 12);
  buffer.writeUInt16BE(300, volume + 16);
  buffer.writeUInt16BE(10, volume + 18);
  buffer.writeUInt16BE(212, volume + 40);

  const reflectivity = radial + 114;
  writeText(buffer, reflectivity, 'DREF');
  buffer.writeUInt16BE(4, reflectivity + 8);
  buffer.writeUInt16BE(0, reflectivity + 10);
  buffer.writeUInt16BE(1000, reflectivity + 12);
  buffer[reflectivity + 18] = 0;
  buffer[reflectivity + 19] = 8;
  buffer.writeFloatBE(2, reflectivity + 20);
  buffer.writeFloatBE(66, reflectivity + 24);
  buffer.set([86, 106, 126, 146], reflectivity + 28);
  return buffer;
}

// NWS SCN26-54 adds an hourly LTR message to the Level II stream from RPG
// build 25.0. A decoder that chokes on a message type it does not know would
// lose every sweep behind it, so the volume is built with an unprocessed
// record sitting in front of real radial data.
export function volumeWithUnknownMessageType(messageType = 20) {
  const base = syntheticLevel2Volume();
  const headerLength = 24;
  const unknown = Buffer.from(base.subarray(headerLength));
  // Byte 3 of the message header, which follows the 12-byte legacy CTM block.
  unknown[12 + 3] = messageType;
  return Buffer.concat([
    base.subarray(0, headerLength),
    unknown,
    Buffer.from(base.subarray(headerLength))
  ]);
}

function section(number, length) {
  const bytes = Buffer.alloc(length);
  bytes.writeUInt32BE(length, 0);
  bytes[4] = number;
  return bytes;
}

function pngChunk(type, data = Buffer.alloc(0)) {
  const bytes = Buffer.alloc(12 + data.length);
  bytes.writeUInt32BE(data.length, 0);
  writeText(bytes, 4, type);
  data.copy(bytes, 8);
  return bytes;
}

function syntheticMeshPng() {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(2, 0);
  header.writeUInt32BE(1, 4);
  header[8] = 16;
  const pixels = Buffer.from([0, 1, 28, 2, 153]);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(pixels)),
    pngChunk('IEND')
  ]);
}

export function syntheticMeshArchive() {
  const identification = section(1, 21);
  identification.writeUInt16BE(2026, 12);
  identification[14] = 7;
  identification[15] = 25;
  identification[16] = 22;
  identification[17] = 10;
  identification[18] = 42;

  const grid = section(3, 72);
  grid.writeUInt32BE(2, 6);
  grid.writeUInt16BE(0, 12);
  grid.writeUInt32BE(2, 30);
  grid.writeUInt32BE(1, 34);
  grid.writeInt32BE(54995000, 46);
  grid.writeInt32BE(230005000, 50);
  grid.writeInt32BE(54995000, 55);
  grid.writeInt32BE(230015000, 59);
  grid.writeUInt32BE(10000, 63);
  grid.writeUInt32BE(10000, 67);

  const product = section(4, 11);
  product[9] = 3;
  product[10] = 28;

  const representation = section(5, 21);
  representation.writeUInt32BE(2, 5);
  representation.writeUInt16BE(41, 9);
  representation.writeFloatBE(-30, 11);
  representation.writeInt16BE(0, 15);
  representation.writeInt16BE(1, 17);
  representation[19] = 16;

  const png = syntheticMeshPng();
  const data = section(7, 5 + png.length);
  png.copy(data, 5);
  const header = Buffer.alloc(16);
  writeText(header, 0, 'GRIB');
  header[6] = 209;
  header[7] = 2;
  const grib = Buffer.concat([
    header,
    identification,
    grid,
    product,
    representation,
    data,
    Buffer.from('7777')
  ]);
  return gzipSync(grib);
}
