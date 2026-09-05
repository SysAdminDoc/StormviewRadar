import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

// Walked rather than listed. A hand-kept list goes stale the first time
// somebody adds a module and forgets to edit package.json, and a syntax check
// that quietly stops covering a file is worse than no check at all.
const WALKED = ['src', 'scripts'];
const ROOT_FILES = ['service-worker.js', 'playwright.config.js'];
const EXTENSIONS = new Set(['.js', '.mjs']);

function walk(directory) {
  const found = [];
  for (const entry of readdirSync(join(root, directory))) {
    const relativePath = `${directory}/${entry}`;
    if (statSync(join(root, relativePath)).isDirectory()) {
      found.push(...walk(relativePath));
      continue;
    }
    const dot = entry.lastIndexOf('.');
    if (dot > 0 && EXTENSIONS.has(entry.slice(dot))) found.push(relativePath);
  }
  return found;
}

const files = [...WALKED.flatMap(walk), ...ROOT_FILES].sort();
if (files.length < 40) {
  throw new Error(`Syntax check found only ${files.length} files; the walk has lost its target`);
}

const failures = [];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', join(root, file)], { encoding: 'utf8' });
  if (result.status !== 0) failures.push(`${file}${String.fromCharCode(10)}${result.stderr.trim()}`);
}

if (failures.length) {
  throw new Error(`Syntax check failed for ${failures.length} file(s):${String.fromCharCode(10)}${failures.join(String.fromCharCode(10))}`);
}

console.log(`Syntax checks passed for ${files.length} files under ${WALKED.map(directory => `${relative('', directory)}/`).join(', ')} plus ${ROOT_FILES.join(' and ')}.`);
