import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const inlineScripts = [...html.matchAll(/<script(?<attributes>\s[^>]*)?>(?<source>[\s\S]*?)<\/script>/gi)]
  .map(match => ({
    module: /\btype\s*=\s*["']module["']/i.test(match.groups.attributes || ''),
    source: match.groups.source
  }))
  .filter(script => script.source.trim());

if (!inlineScripts.length) throw new Error('No inline application script found');
for (const script of inlineScripts) {
  if (script.module) await transform(script.source, { loader: 'js', format: 'esm' });
  else new Function(script.source);
}

const checks = [
  [/<script(?:\s|>)/gi, /<\/script>/gi, 'script'],
  [/<style(?:\s|>)/gi, /<\/style>/gi, 'style']
];
for (const [openPattern, closePattern, label] of checks) {
  const opened = html.match(openPattern)?.length || 0;
  const closed = html.match(closePattern)?.length || 0;
  if (opened !== closed) throw new Error(`Unbalanced ${label} tags: ${opened} open, ${closed} closed`);
}

// Leaflet renders bindPopup and bindTooltip string content as HTML, and
// CVE-2025-69993 has no upstream fix. safeText only truncates and strips
// control characters; it sits one line above escapeHTML in index.html and reads
// as though it sanitises. That resemblance is how three tooltips shipped
// unescaped, so no Leaflet content boundary may receive its output.
function leafletContentArguments(source) {
  const found = [];
  for (const method of ['bindPopup', 'bindTooltip']) {
    for (const match of source.matchAll(new RegExp(method + '\\(', 'g'))) {
      const openIndex = match.index + method.length;
      let depth = 0;
      let quote = null;
      for (let index = openIndex; index < source.length; index += 1) {
        const character = source[index];
        if (quote) {
          if (character === '\\') index += 1;
          else if (character === quote) quote = null;
          continue;
        }
        if (character === "'" || character === '"' || character === '`') { quote = character; continue; }
        if (character === '(') { depth += 1; continue; }
        if (character === ')') depth -= 1;
        if (depth === 0 || (character === ',' && depth === 1)) {
          found.push({
            method,
            line: source.slice(0, match.index).split('\n').length,
            argument: source.slice(openIndex + 1, index).trim(),
            before: source.slice(Math.max(0, match.index - 4000), match.index)
          });
          break;
        }
      }
    }
  }
  return found;
}

// Spans already inside escapeHTML(...) are safe, and a property name that
// happens to match an unrelated local is not a reference to that local.
function unguardedText(argument) {
  let result = argument;
  for (;;) {
    const start = result.indexOf('escapeHTML(');
    if (start === -1) break;
    let depth = 0;
    let end = start + 'escapeHTML'.length;
    for (; end < result.length; end += 1) {
      if (result[end] === '(') depth += 1;
      else if (result[end] === ')') { depth -= 1; if (depth === 0) break; }
    }
    result = result.slice(0, start) + result.slice(end + 1);
  }
  return result.replace(/\.\s*[A-Za-z_$][\w$]*/g, '');
}

const unescapedBindings = [];
for (const { method, line, argument, before } of leafletContentArguments(html)) {
  if (/\bsafeText\s*\(/.test(argument)) {
    unescapedBindings.push(`${method} at line ${line} passes safeText output straight to Leaflet`);
    continue;
  }
  // The same defect one step removed: a variable built by safeText.
  for (const identifier of new Set(unguardedText(argument).match(/[A-Za-z_$][\w$]*/g) || [])) {
    if (new RegExp(`\\b(?:const|let|var)\\s+${identifier}\\s*=\\s*safeText\\s*\\(`).test(before)) {
      unescapedBindings.push(`${method} at line ${line} passes ${identifier}, which safeText produced`);
    }
  }
}
if (unescapedBindings.length) {
  throw new Error('Unescaped Leaflet content:\n  ' + unescapedBindings.join('\n  '));
}

console.log(`Static checks passed (${inlineScripts.length} inline script, ${leafletContentArguments(html).length} Leaflet content boundaries).`);
