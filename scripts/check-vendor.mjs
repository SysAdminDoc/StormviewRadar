import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';

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
  ['vendor/nexrad/LICENSE-ieee754.txt', 'node_modules/ieee754/LICENSE'],
  ['vendor/cesium/LICENSE.md', 'node_modules/cesium/LICENSE.md'],
  ['vendor/us-atlas/states-10m.json', 'node_modules/us-atlas/states-10m.json'],
  ['vendor/us-atlas/counties-10m.json', 'node_modules/us-atlas/counties-10m.json'],
  ['vendor/us-atlas/LICENSE.txt', 'node_modules/us-atlas/LICENSE']
];

const directoryPairs = [
  ['vendor/cesium/Assets', 'node_modules/cesium/Build/Cesium/Assets'],
  ['vendor/cesium/ThirdParty', 'node_modules/cesium/Build/Cesium/ThirdParty'],
  ['vendor/cesium/Widgets', 'node_modules/cesium/Build/Cesium/Widgets'],
  ['vendor/cesium/Workers', 'node_modules/cesium/Build/Cesium/Workers']
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

async function relativeFiles(root, directory = '') {
  const entries = await readdir(new URL(`${root}/${directory}`, import.meta.url), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = directory ? `${directory}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await relativeFiles(root, relativePath));
    else if (entry.isFile()) files.push(relativePath);
  }
  return files.sort();
}

let directoryAssetCount = 0;
for (const [vendoredRoot, installedRoot] of directoryPairs) {
  const [vendoredFiles, installedFiles] = await Promise.all([
    relativeFiles(`../${vendoredRoot}`),
    relativeFiles(`../${installedRoot}`)
  ]);
  if (JSON.stringify(vendoredFiles) !== JSON.stringify(installedFiles)) {
    throw new Error(`${vendoredRoot} file tree does not match ${installedRoot}`);
  }
  directoryAssetCount += vendoredFiles.length;
  for (const relativePath of vendoredFiles) {
    const [vendored, installed] = await Promise.all([
      readFile(new URL(`../${vendoredRoot}/${relativePath}`, import.meta.url)),
      readFile(new URL(`../${installedRoot}/${relativePath}`, import.meta.url))
    ]);
    if (digest(vendored) !== digest(installed)) {
      throw new Error(`${vendoredRoot}/${relativePath} does not match the locked package asset`);
    }
  }
}

const [manifest, html, cesiumEngine] = await Promise.all([
  readFile(new URL('../package.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../vendor/cesium/engine.js', import.meta.url), 'utf8')
]);
for (const dependency of ['buffer', 'cesium', 'leaflet', 'nexrad-level-2-data', 'topojson-client', 'us-atlas']) {
  if (!/^\d+\.\d+\.\d+$/.test(manifest.dependencies?.[dependency] || '')) {
    throw new Error(`${dependency} must use an exact version in package.json`);
  }
}
if (!html.includes('http-equiv="Content-Security-Policy"')) throw new Error('Content Security Policy meta tag is missing');
if (/<(?:script|link)[^>]+(?:src|href)="https:\/\//i.test(html)) {
  throw new Error('Remote script or stylesheet dependency found in index.html');
}
if (/\beval\s*\(|\bnew\s+Function\s*\(/.test(cesiumEngine)) {
  throw new Error('The Cesium engine bundle contains dynamic code evaluation forbidden by the CSP');
}
if (!/@(?:license|preserve)\b/i.test(cesiumEngine)) {
  throw new Error('The Cesium engine bundle is missing retained dependency license notices');
}

console.log(`Vendor checks passed (${pairs.length + directoryAssetCount} locked assets plus the local Cesium engine bundle).`);
