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

const packageManifest = JSON.parse(await (await fetch(new URL(`package.json?${cacheBust}`, baseUrl))).text());
if (deployed.version !== packageManifest.version) {
  throw new Error(`Hosted version mismatch: deployment ${deployed.version}, package ${packageManifest.version}`);
}

const requiredAssets = [
  ['index.html', 'text/html'],
  ['logo/StormView-512x512.png', 'image/png'],
  ['vendor/leaflet/leaflet.css', 'text/css'],
  ['vendor/leaflet/leaflet.js', 'javascript'],
  ['vendor/nexrad/level2-worker.js', 'javascript']
];
for (const [path, expectedType] of requiredAssets) {
  const response = await fetch(new URL(`${path}?${cacheBust}`, baseUrl), { cache: 'no-store' });
  if (!response.ok) throw new Error(`Hosted asset failed: ${path} returned ${response.status}`);
  if (!response.headers.get('content-type')?.includes(expectedType)) {
    throw new Error(`Hosted asset has wrong content type: ${path}`);
  }
}

console.log(`Hosted commit ${expectedCommit.slice(0, 12)} verified at ${baseUrl}`);
