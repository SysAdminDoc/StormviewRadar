import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const pairs = [
  ['vendor/leaflet/leaflet.css', 'node_modules/leaflet/dist/leaflet.css'],
  ['vendor/leaflet/leaflet.js', 'node_modules/leaflet/dist/leaflet.js'],
  ['vendor/leaflet/LICENSE.txt', 'node_modules/leaflet/LICENSE'],
  ['vendor/topojson/topojson-client.min.js', 'node_modules/topojson-client/dist/topojson-client.min.js'],
  ['vendor/topojson/LICENSE.txt', 'node_modules/topojson-client/LICENSE'],
  ['vendor/nexrad/LICENSE-nexrad-level-2-data.txt', 'node_modules/nexrad-level-2-data/license'],
  ['vendor/nexrad/LICENSE-seek-bzip.txt', 'node_modules/seek-bzip/LICENSE'],
  ['vendor/nexrad/LICENSE-buffer.txt', 'node_modules/buffer/LICENSE'],
  ['vendor/nexrad/LICENSE-base64-js.txt', 'node_modules/base64-js/LICENSE'],
  ['vendor/nexrad/LICENSE-ieee754.txt', 'node_modules/ieee754/LICENSE']
];

function digest(content) {
  return createHash('sha256').update(content).digest('hex');
}

for (const [vendoredPath, installedPath] of pairs) {
  const [vendored, installed] = await Promise.all([
    readFile(new URL(`../${vendoredPath}`, import.meta.url)),
    readFile(new URL(`../${installedPath}`, import.meta.url))
  ]);
  if (digest(vendored) !== digest(installed)) {
    throw new Error(`${vendoredPath} does not match the locked package asset ${installedPath}`);
  }
}

const [manifest, html] = await Promise.all([
  readFile(new URL('../package.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../index.html', import.meta.url), 'utf8')
]);
for (const dependency of ['buffer', 'leaflet', 'nexrad-level-2-data', 'topojson-client']) {
  if (!/^\d+\.\d+\.\d+$/.test(manifest.dependencies?.[dependency] || '')) {
    throw new Error(`${dependency} must use an exact version in package.json`);
  }
}
if (!html.includes('http-equiv="Content-Security-Policy"')) throw new Error('Content Security Policy meta tag is missing');
if (/<(?:script|link)[^>]+(?:src|href)="https:\/\//i.test(html)) {
  throw new Error('Remote script or stylesheet dependency found in index.html');
}

console.log(`Vendor checks passed (${pairs.length} locked assets).`);
