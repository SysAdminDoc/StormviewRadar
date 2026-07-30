import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const nextVersion = process.argv[2];
const semverPattern = /^(\d+)\.(\d+)\.(\d+)$/;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, args, options = {}) {
  const executable = process.platform === 'win32' && command === 'npm' ? 'npm.cmd' : command;
  const result = spawnSync(executable, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit'
  });
  if (result.status !== 0) fail(options.failure || `${command} ${args.join(' ')} failed`);
  return (result.stdout || '').trim();
}

function compareSemver(left, right) {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
  }
  return 0;
}

function replaceRequired(content, pattern, replacement, label) {
  if (!pattern.test(content)) fail(`Could not find ${label} version field`);
  return content.replace(pattern, replacement);
}

if (!semverPattern.test(nextVersion || '')) fail('Usage: npm run release -- <major.minor.patch>');

const branch = run('git', ['branch', '--show-current'], {
  capture: true,
  failure: 'Release must run in a Git checkout'
});
if (branch !== 'main') fail(`Release must run on main, not ${branch || 'detached HEAD'}`);
if (run('git', ['status', '--porcelain'], { capture: true })) fail('Release requires a clean working tree');

const manifest = JSON.parse(await readFile('package.json', 'utf8'));
if (compareSemver(nextVersion, manifest.version) <= 0) {
  fail(`Release version ${nextVersion} must be greater than ${manifest.version}`);
}
if (spawnSync('git', ['rev-parse', '--verify', '--quiet', `refs/tags/v${nextVersion}`], {
  cwd: process.cwd(),
  stdio: 'ignore'
}).status === 0) {
  fail(`Tag v${nextVersion} already exists`);
}

const lockfile = JSON.parse(await readFile('package-lock.json', 'utf8'));
manifest.version = nextVersion;
lockfile.version = nextVersion;
lockfile.packages[''].version = nextVersion;

let html = await readFile('index.html', 'utf8');
let readme = await readFile('README.md', 'utf8');
let claude = await readFile('CLAUDE.md', 'utf8');
let changelog = await readFile('CHANGELOG.md', 'utf8');
const releaseDate = new Date().toISOString().slice(0, 10);

html = replaceRequired(html, /<meta name="application-version" content="[^"]+">/, `<meta name="application-version" content="${nextVersion}">`, 'HTML metadata');
html = replaceRequired(html, /<title>StormView Radar [^<]+<\/title>/, `<title>StormView Radar ${nextVersion}</title>`, 'HTML title');
html = replaceRequired(html, /<div class="loading-sub">v[^<]+<\/div>/, `<div class="loading-sub">v${nextVersion}</div>`, 'loading UI');
readme = replaceRequired(readme, /version-[\d.]+-blue/, `version-${nextVersion}-blue`, 'README badge');
claude = replaceRequired(claude, /^# StormviewRadar v[\d.]+/m, `# StormviewRadar v${nextVersion}`, 'CLAUDE heading');
claude = replaceRequired(claude, /^- Version: v[\d.]+/m, `- Version: v${nextVersion}`, 'CLAUDE status');

const unreleasedMatch = changelog.match(/^## \[Unreleased\]\r?\n\r?\n([\s\S]*?)(?=^## \[v)/m);
if (!unreleasedMatch || !unreleasedMatch[1].trim()) fail('CHANGELOG Unreleased section is empty');
const releasedNotes = unreleasedMatch[1].trimEnd();
changelog = changelog.replace(
  unreleasedMatch[0],
  `## [Unreleased]\n\n## [v${nextVersion}] - ${releaseDate}\n\n${releasedNotes}\n\n`
);

await Promise.all([
  writeFile('package.json', `${JSON.stringify(manifest, null, 2)}\n`),
  writeFile('package-lock.json', `${JSON.stringify(lockfile, null, 2)}\n`),
  writeFile('index.html', html),
  writeFile('README.md', readme),
  writeFile('CLAUDE.md', claude),
  writeFile('CHANGELOG.md', changelog)
]);

run('npm', ['run', 'release:check'], {
  failure: 'Release gate failed; inspect and revert the synchronized version edits'
});
run('git', ['add', 'package.json', 'package-lock.json', 'index.html', 'README.md', 'CLAUDE.md', 'CHANGELOG.md']);
run('git', ['commit', '-m', `chore(release): v${nextVersion}`]);
run('git', ['tag', '-a', `v${nextVersion}`, '-m', `StormView Radar v${nextVersion}`]);
console.log(`Created release commit and tag v${nextVersion}. Push with: git push origin main --follow-tags`);
