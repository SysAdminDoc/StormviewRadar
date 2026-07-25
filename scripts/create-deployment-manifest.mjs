import { readFile, writeFile } from 'node:fs/promises';

const commit = process.argv[2];
if (!/^[0-9a-f]{40}$/.test(commit || '')) throw new Error('Expected a full Git commit SHA');
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
await writeFile(
  new URL('../deployment.json', import.meta.url),
  `${JSON.stringify({ commit, version: manifest.version, deployedAt: new Date().toISOString() }, null, 2)}\n`,
  'utf8'
);
console.log(`Prepared deployment manifest for ${commit.slice(0, 12)}.`);
