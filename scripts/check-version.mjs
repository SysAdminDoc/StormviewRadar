import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [manifest, html, readme, changelog, claude] = await Promise.all([
  readFile(new URL('package.json', root), 'utf8').then(JSON.parse),
  readFile(new URL('index.html', root), 'utf8'),
  readFile(new URL('README.md', root), 'utf8'),
  readFile(new URL('CHANGELOG.md', root), 'utf8'),
  readFile(new URL('CLAUDE.md', root), 'utf8').catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  })
]);

const version = manifest.version;
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Invalid package version: ${version}`);

const surfaces = [
  ['HTML application metadata', html, `<meta name="application-version" content="${version}">`],
  ['HTML title', html, `<title>StormView Radar ${version}</title>`],
  ['loading UI', html, `<div class="loading-sub">v${version}</div>`],
  ['README badge', readme, `version-${version}-blue`],
  ['changelog release', changelog, `## [v${version}]`]
];
if (claude) {
  surfaces.push(
    ['CLAUDE heading', claude, `# StormviewRadar v${version}`],
    ['CLAUDE status', claude, `- Version: v${version}`]
  );
}

for (const [label, content, expected] of surfaces) {
  if (!content.includes(expected)) throw new Error(`${label} is not synchronized to ${version}`);
}

console.log(`Version checks passed (${version}).`);
