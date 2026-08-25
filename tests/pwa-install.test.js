import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  INSTALL_DISMISSAL_MS,
  installPromptDismissed,
  normalizeOfflineAvailability,
  shouldOfferInstall
} from '../src/pwa-install.js';

test('offline install readiness requires a cached shell and a non-empty completed radar frame', () => {
  assert.deepEqual(normalizeOfflineAvailability({ shell: true, radarFrame: true, radarEntries: 12 }), {
    shell: true,
    radarFrame: true,
    radarEntries: 12,
    ready: true
  });
  assert.equal(normalizeOfflineAvailability({ shell: true, radarFrame: true, radarEntries: 0 }).ready, false);
  assert.equal(normalizeOfflineAvailability({ shell: false, radarFrame: true, radarEntries: 12 }).ready, false);
});

test('install offers require browser eligibility and respect a bounded dismissal', () => {
  const now = Date.parse('2026-08-12T12:00:00Z');
  const eligible = { hasInstallEvent: true, offlineReady: true, now };
  assert.equal(shouldOfferInstall(eligible), true);
  assert.equal(shouldOfferInstall({ ...eligible, standalone: true }), false);
  assert.equal(shouldOfferInstall({ ...eligible, embed: true }), false);
  assert.equal(shouldOfferInstall({ ...eligible, dismissedAt: now - 1000 }), false);
  assert.equal(installPromptDismissed(now - INSTALL_DISMISSAL_MS - 1, now), false);
});

test('web app manifest exposes standalone identity and install-sized local icons', async () => {
  const manifest = JSON.parse(await readFile(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.deepEqual(manifest.icons.map(icon => icon.sizes), ['192x192', '512x512']);
  assert.ok(manifest.icons.every(icon => icon.src.startsWith('logo/') && icon.type === 'image/png'));
});
