import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1])
  .filter(script => script.trim());

if (!inlineScripts.length) throw new Error('No inline application script found');
for (const script of inlineScripts) new Function(script);

const checks = [
  [/<script(?:\s|>)/gi, /<\/script>/gi, 'script'],
  [/<style(?:\s|>)/gi, /<\/style>/gi, 'style']
];
for (const [openPattern, closePattern, label] of checks) {
  const opened = html.match(openPattern)?.length || 0;
  const closed = html.match(closePattern)?.length || 0;
  if (opened !== closed) throw new Error(`Unbalanced ${label} tags: ${opened} open, ${closed} closed`);
}

console.log(`Static checks passed (${inlineScripts.length} inline script).`);
