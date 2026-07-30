import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createMessageFormatter } from '../src/i18n.js';

test('message formatter enforces locale parity and locale-aware plurals', () => {
  let locale = 'en';
  const formatter = createMessageFormatter({
    en: { alerts_one: '{count} alert', alerts_other: '{count} alerts' },
    es: { alerts_one: '{count} alerta', alerts_other: '{count} alertas' }
  }, () => locale);

  assert.equal(formatter.message('alerts', { count: 1 }), '1 alert');
  assert.equal(formatter.message('alerts', { count: 2 }), '2 alerts');
  locale = 'es';
  assert.equal(formatter.message('alerts', { count: 2 }), '2 alertas');
  assert.equal(formatter.number(1234.5), '1234,5');
});

test('message formatter rejects incomplete catalogs and unknown keys', () => {
  assert.throws(() => createMessageFormatter({
    en: { ready: 'Ready' },
    es: {}
  }, () => 'es'), /catalog mismatch/);
  assert.throws(() => createMessageFormatter({
    en: { ready: 'Ready' },
    es: { ready: 'Listo', extra: 'Extra' }
  }, () => 'es'), /extra: extra/);
  const formatter = createMessageFormatter({ en: { ready: 'Ready' } }, () => 'en');
  assert.throws(() => formatter.message('missing'), /Unknown message key/);
});

test('supported render paths only call catalogued message keys', () => {
  const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const englishCatalog = source
    .match(/const MESSAGE_CATALOG = \{\s*en: \{([\s\S]*?)\n\s*\},\s*\n\s*es: \{/u)?.[1];
  assert.ok(englishCatalog, 'English message catalog is readable');
  const keys = new Set(
    [...englishCatalog.matchAll(/^\s{16}([A-Za-z][A-Za-z0-9_]*):/gmu)].map(match => match[1])
  );
  const calls = [...source.matchAll(/\bt\('([A-Za-z][A-Za-z0-9_]*)'/gu)].map(match => match[1]);
  const missing = [...new Set(calls)].filter(key =>
    !keys.has(key) && ![...keys].some(candidate => candidate.startsWith(`${key}_`))
  );
  assert.deepEqual(missing, []);
  assert.doesNotMatch(source, /\btranslatedExact\b/);
});
