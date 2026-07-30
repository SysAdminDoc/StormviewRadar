import { expect, test } from '@playwright/test';

test('MESH layer discovers the latest NOAA object and renders hail-size guidance off-thread', async ({ page }) => {
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
          labels: false,
          hailMesh: false
        }
      }
    }));
    localStorage.setItem('stormview_welcomed', '1');

    class FakeMeshWorker {
      listeners = new Map();

      addEventListener(type, listener) {
        this.listeners.set(type, listener);
      }

      postMessage(message) {
        queueMicrotask(async () => {
          const canvas = new OffscreenCanvas(8, 4);
          const context = canvas.getContext('2d');
          context.fillStyle = '#f97316';
          context.fillRect(0, 0, 8, 4);
          const blob = await canvas.convertToBlob({ type: 'image/png' });
          this.listeners.get('message')?.({
            data: {
              id: message.id,
              type: 'rendered',
              blob,
              validTime: Date.UTC(2026, 6, 25, 22, 10, 42) / 1000,
              bounds: [[20.005, -129.995], [54.995, -60.005]],
              hailPixels: 14,
              maximumMm: 63.5,
              sampleStep: 4
            }
          });
        });
      }

      terminate() {}
    }

    window.Worker = FakeMeshWorker;
  });

  await page.route(/^https:\/\/noaa-mrms-pds\.s3\.amazonaws\.com\/.*/, route => {
    if (route.request().url().includes('list-type=2')) {
      return route.fulfill({
        contentType: 'application/xml',
        body: `<?xml version="1.0" encoding="UTF-8"?>
          <ListBucketResult>
            <Contents>
              <Key>CONUS/MESH_00.50/20260725/MRMS_MESH_00.50_20260725-220842.grib2.gz</Key>
              <Size>60000</Size>
            </Contents>
            <Contents>
              <Key>CONUS/MESH_00.50/20260725/MRMS_MESH_00.50_20260725-221042.grib2.gz</Key>
              <Size>61000</Size>
            </Contents>
          </ListBucketResult>`
      });
    }
    return route.fulfill({
      contentType: 'application/octet-stream',
      body: Buffer.from('mock-mesh-gzip')
    });
  });

  await page.goto('/');
  await page.locator('.sidebar [data-layer="hailMesh"]').evaluate(element => element.click());

  await expect(page.locator('.hail-mesh-layer')).toBeVisible();
  await expect(page.locator('.mesh-legend')).toContainText('Estimated hail size (MESH)');
  await expect(page.locator('.mesh-legend')).toContainText('Max: 2.5 in');
  await expect(page.locator('.sidebar [data-layer="hailMesh"]')).toHaveAttribute('data-feature-count', '14');
  expect(await page.evaluate(() => localStorage.getItem('stormview_settings'))).toContain('"hailMesh":true');
});

test('disabling MESH terminates active worker computation and ignores its stale result', async ({ page }) => {
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
          labels: false,
          hailMesh: false
        }
      }
    }));
    localStorage.setItem('stormview_welcomed', '1');
    window.__meshRequests = 0;
    window.__meshTerminations = 0;

    class DelayedMeshWorker {
      listeners = new Map();

      addEventListener(type, listener) {
        this.listeners.set(type, listener);
      }

      postMessage(message) {
        window.__meshRequests += 1;
        setTimeout(async () => {
          const canvas = new OffscreenCanvas(8, 4);
          const blob = await canvas.convertToBlob({ type: 'image/png' });
          this.listeners.get('message')?.({
            data: {
              id: message.id,
              type: 'rendered',
              blob,
              validTime: Date.UTC(2026, 6, 25, 22, 10, 42) / 1000,
              bounds: [[20.005, -129.995], [54.995, -60.005]],
              hailPixels: 14,
              maximumMm: 63.5,
              sampleStep: 4
            }
          });
        }, 250);
      }

      terminate() {
        window.__meshTerminations += 1;
      }
    }

    window.Worker = DelayedMeshWorker;
  });

  await page.route(/^https:\/\/noaa-mrms-pds\.s3\.amazonaws\.com\/.*/, route => {
    if (route.request().url().includes('list-type=2')) {
      return route.fulfill({
        contentType: 'application/xml',
        body: `<?xml version="1.0" encoding="UTF-8"?>
          <ListBucketResult>
            <Contents>
              <Key>CONUS/MESH_00.50/20260725/MRMS_MESH_00.50_20260725-221042.grib2.gz</Key>
              <Size>61000</Size>
            </Contents>
          </ListBucketResult>`
      });
    }
    return route.fulfill({
      contentType: 'application/octet-stream',
      body: Buffer.from('mock-mesh-gzip')
    });
  });

  await page.goto('/');
  const control = page.locator('.sidebar [data-layer="hailMesh"]');
  await control.evaluate(element => element.click());
  await expect.poll(() => page.evaluate(() => window.__meshRequests)).toBe(1);
  await control.evaluate(element => element.click());
  await expect.poll(() => page.evaluate(() => window.__meshTerminations)).toBe(1);
  await page.waitForTimeout(300);
  await expect(page.locator('.hail-mesh-layer')).toHaveCount(0);
  await expect(control).not.toHaveClass(/active/);
  await expect(control).toHaveAttribute('data-feature-count', '0');
});
