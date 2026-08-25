import { expect, test } from '@playwright/test';
import { syntheticLevel2Volume, syntheticMeshArchive } from './worker-fixtures.js';

test('bundled Level II and module MESH workers decode deterministic fixtures', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 4,
      settings: {
        source: 'hrrr',
        autoRefresh: false,
        layers: {
          radar: false,
          alerts: false,
          spcOutlook: false,
          states: false,
          counties: false,
          labels: false
        }
      }
    }));
    localStorage.setItem('stormview_welcomed', '1');
  });
  await page.goto('/');

  const level2Bytes = [...syntheticLevel2Volume()];
  const meshBytes = [...syntheticMeshArchive()];
  const result = await page.evaluate(async ({ level2Bytes: level2Fixture, meshBytes: meshFixture }) => {
    function request(worker, message, transfer = []) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Worker request ${message.type} timed out`)), 10000);
        const onMessage = event => {
          if (event.data?.id !== message.id) return;
          clearTimeout(timeout);
          worker.removeEventListener('message', onMessage);
          if (event.data.type === 'error') reject(new Error(event.data.message));
          else resolve(event.data);
        };
        worker.addEventListener('message', onMessage);
        worker.postMessage(message, transfer);
      });
    }

    const level2Worker = new Worker('vendor/nexrad/level2-worker.js');
    const level2Buffer = Uint8Array.from(level2Fixture).buffer;
    const loaded = await request(
      level2Worker,
      { id: 1, type: 'load', buffer: level2Buffer },
      [level2Buffer]
    );
    const rendered = await request(level2Worker, {
      id: 2,
      type: 'render',
      product: 'reflectivity',
      palette: 'colorblind'
    });
    const level2 = {
      loadedType: loaded.type,
      renderedType: rendered.type,
      site: rendered.site,
      width: rendered.bitmap.width,
      height: rendered.bitmap.height,
      maxRangeKm: rendered.maxRangeKm,
      palette: rendered.palette
    };
    rendered.bitmap.close();
    level2Worker.terminate();

    const meshWorker = new Worker('src/mesh-worker.js', { type: 'module' });
    const meshBuffer = Uint8Array.from(meshFixture).buffer;
    const meshRendered = await request(
      meshWorker,
      { id: 3, type: 'render', buffer: meshBuffer, palette: 'highContrast' },
      [meshBuffer]
    );
    const mesh = {
      type: meshRendered.type,
      blobType: meshRendered.blob.type,
      width: meshRendered.bounds?.length,
      hailPixels: meshRendered.hailPixels,
      maximumMm: meshRendered.maximumMm,
      palette: meshRendered.palette
    };
    meshWorker.terminate();
    return { level2, mesh };
  }, { level2Bytes, meshBytes });

  expect(result.level2).toEqual({
    loadedType: 'loaded',
    renderedType: 'rendered',
    site: 'KTWX',
    width: 900,
    height: 900,
    maxRangeKm: 4,
    palette: 'colorblind'
  });
  expect(result.mesh).toEqual({
    type: 'rendered',
    blobType: 'image/png',
    width: 2,
    hailPixels: 2,
    maximumMm: 63.5,
    palette: 'highContrast'
  });
});
