const [baseUrl, expectedCommit] = process.argv.slice(2);
if (!baseUrl || !/^[0-9a-f]{40}$/.test(expectedCommit || '')) {
  throw new Error('Usage: node scripts/check-hosted.mjs <pages-url> <full-commit-sha>');
}

const cacheBust = `verify=${Date.now()}`;
const deploymentUrl = new URL(`deployment.json?${cacheBust}`, baseUrl);
let deployed;
for (let attempt = 1; attempt <= 12; attempt += 1) {
  const response = await fetch(deploymentUrl, { cache: 'no-store' });
  if (response.ok) {
    deployed = await response.json();
    if (deployed.commit === expectedCommit) break;
  }
  if (attempt < 12) await new Promise(resolve => setTimeout(resolve, 5000));
}
if (deployed?.commit !== expectedCommit) {
  throw new Error(`Hosted commit mismatch: expected ${expectedCommit}, received ${deployed?.commit || 'none'}`);
}

const [packageResponse, indexResponse] = await Promise.all([
  fetch(new URL(`package.json?${cacheBust}`, baseUrl), { cache: 'no-store' }),
  fetch(new URL(`index.html?${cacheBust}`, baseUrl), { cache: 'no-store' })
]);
if (!packageResponse.ok || !indexResponse.ok) {
  throw new Error(`Hosted manifests unavailable: package ${packageResponse.status}, index ${indexResponse.status}`);
}
const packageManifest = JSON.parse(await packageResponse.text());
const indexHtml = await indexResponse.text();
if (deployed.version !== packageManifest.version) {
  throw new Error(`Hosted version mismatch: deployment ${deployed.version}, package ${packageManifest.version}`);
}

const requiredAssets = [
  ['index.html', 'text/html'],
  ['service-worker.js', 'javascript'],
  ['manifest.webmanifest', 'application/manifest+json'],
  ['src/app.js', 'javascript'],
  ['src/frame-preload.js', 'javascript'],
  ['src/picture-in-picture.js', 'javascript'],
  ['src/split-view.js', 'javascript'],
  ['src/visual-palette.js', 'javascript'],
  ['src/map-snapshot.js', 'javascript'],
  ['src/embed-mode.js', 'javascript'],
  ['src/chasecaster.js', 'javascript'],
  ['src/training-overlays.js', 'javascript'],
  ['src/pwa-install.js', 'javascript'],
  ['src/animation-export.js', 'javascript'],
  ['src/radar-history.js', 'javascript'],
  ['src/geomet-radar.js', 'javascript'],
  ['logo/StormView-512x512.png', 'image/png'],
  ['vendor/leaflet/leaflet.css', 'text/css'],
  ['vendor/leaflet/leaflet.js', 'javascript'],
  ['vendor/topojson/topojson-client.min.js', 'javascript'],
  ['vendor/nexrad/level2-worker.js', 'javascript'],
  ['src/mesh-worker.js', 'javascript'],
  ['src/mesh-analysis.js', 'javascript'],
  ['vendor/cesium/engine.js', 'javascript'],
  ['vendor/cesium/Widgets/widgets.css', 'text/css'],
  ['vendor/cesium/Workers/createGeometry.js', 'javascript'],
  ['vendor/cesium/Assets/Textures/NaturalEarthII/0/0/0.jpg', 'image/jpeg']
];
const dynamicImports = [...indexHtml.matchAll(/import\(['"]\.\/([^'"]+)['"]\)/g)]
  .map(match => match[1]);
for (const path of dynamicImports) requiredAssets.push([path, 'javascript']);

const uniqueAssets = new Map(requiredAssets.map(asset => [asset[0], asset[1]]));
for (const [path, expectedType] of uniqueAssets) {
  const response = await fetch(new URL(`${path}?${cacheBust}`, baseUrl), { cache: 'no-store' });
  if (!response.ok) throw new Error(`Hosted asset failed: ${path} returned ${response.status}`);
  if (!response.headers.get('content-type')?.includes(expectedType)) {
    throw new Error(`Hosted asset has wrong content type: ${path}`);
  }
}

console.log(`Hosted commit ${expectedCommit.slice(0, 12)} and ${uniqueAssets.size} runtime assets verified at ${baseUrl}`);
