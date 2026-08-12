import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BASEMAP_MAX_AGE_MS,
  DEFAULT_MAX_AGE_MS,
  IndexedDbTileCache,
  isCacheableTileUrl,
  tileCacheMaxAge
} from '../src/tile-cache.js';

test('tile cache rejects local, malformed, and credential-bearing URLs', () => {
  assert.equal(isCacheableTileUrl('https://tiles.example.test/4/2/3.png'), true);
  assert.equal(isCacheableTileUrl('https://tiles.example.test/4/2/3.png?style=dark'), true);
  assert.equal(isCacheableTileUrl('https://tiles.example.test/4/2/3.png?appid=secret'), false);
  assert.equal(isCacheableTileUrl('https://tiles.example.test/4/2/3.png?ACCESS_TOKEN=secret'), false);
  assert.equal(isCacheableTileUrl('data:image/png;base64,abc'), false);
  assert.equal(isCacheableTileUrl('not a url'), false);
});

test('tile cache disables itself when IndexedDB is unavailable', async () => {
  const cache = new IndexedDbTileCache({ indexedDB: null });
  assert.deepEqual(await cache.snapshot(), {
    available: false,
    count: 0,
    bytes: 0,
    maxEntries: 1200,
    maxBytes: 96 * 1024 * 1024
  });
});

test('stable basemaps outlive frequently changing weather tiles', () => {
  assert.equal(
    tileCacheMaxAge('https://a.basemaps.cartocdn.com/dark_all/4/2/3.png'),
    BASEMAP_MAX_AGE_MS
  );
  assert.equal(
    tileCacheMaxAge('https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad/4/2/3.png'),
    DEFAULT_MAX_AGE_MS
  );
});
