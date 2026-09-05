import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

async function routeLevel2Data(page) {
  await page.route('https://mesonet.agron.iastate.edu/geojson/network/NEXRAD.geojson', route => route.fulfill({
    json: {
      features: [{
        type: 'Feature',
        id: 'TWX',
        properties: { sid: 'TWX', sname: 'Topeka', state: 'KS', online: true },
        geometry: { type: 'Point', coordinates: [-96.232, 38.997] }
      }]
    }
  }));
  await page.route('https://unidata-nexrad-level2.s3.amazonaws.com/**', route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('list-type') === '2') {
      return route.fulfill({
        contentType: 'application/xml',
        body: `<?xml version="1.0"?>
          <ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
            <Contents><Key>2026/07/25/KTWX/KTWX20260725_210000_V06</Key></Contents>
          </ListBucketResult>`
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/octet-stream',
      headers: { 'content-length': '4' },
      body: Buffer.from([1, 2, 3, 4])
    });
  });
}

test('Level II mode selects the nearest site and renders all native base products off-thread', async ({ page }) => {
  const requestedPrefixes = [];
  await page.addInitScript(() => {
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 4,
      settings: {
        source: 'level2',
        radarProduct: 'reflectivity',
        level2Site: '',
        autoRefresh: false,
        layers: {
          radar: true,
          alerts: false,
          spcOutlook: false,
          states: false,
          counties: false,
          labels: false
        }
      }
    }));
    localStorage.setItem('stormview_welcomed', '1');
    window.__level2Products = [];

    class FakeLevel2Worker {
      listeners = new Map();

      addEventListener(type, listener) {
        this.listeners.set(type, listener);
      }

      postMessage(message) {
        queueMicrotask(() => {
          if (message.type === 'load') {
            this.listeners.get('message')?.({ data: { id: message.id, type: 'loaded', site: 'KTWX' } });
            return;
          }
          window.__level2Products.push(message.product);
          const canvas = new OffscreenCanvas(8, 8);
          const context = canvas.getContext('2d');
          context.fillStyle = '#00c800';
          context.fillRect(0, 0, 8, 8);
          this.listeners.get('message')?.({
            data: {
              id: message.id,
              type: 'rendered',
              bitmap: canvas.transferToImageBitmap(),
              latitude: 38.997,
              longitude: -96.232,
              maxRangeKm: 230,
              elevationAngle: 0.5,
              site: 'KTWX',
              hasGaps: false,
              isTruncated: false,
              couplets: [{
                latitude: 39.1,
                longitude: -96.1,
                shearMs: 42,
                rangeKm: 18.4,
                reflectivityDbz: 48,
                bearing: 45
              }]
            }
          });
        });
      }

      terminate() {}
    }

    window.Worker = FakeLevel2Worker;
  });

  await page.route('https://mesonet.agron.iastate.edu/geojson/network/NEXRAD.geojson', route => route.fulfill({
    json: {
      features: [
        {
          type: 'Feature',
          id: 'TWX',
          properties: { sid: 'TWX', sname: 'Topeka', state: 'KS', online: true },
          geometry: { type: 'Point', coordinates: [-96.232, 38.997] }
        },
        {
          type: 'Feature',
          id: 'TLX',
          properties: { sid: 'TLX', sname: 'Oklahoma City', state: 'OK', online: true },
          geometry: { type: 'Point', coordinates: [-97.2779, 35.3334] }
        }
      ]
    }
  }));

  await page.route('https://unidata-nexrad-level2.s3.amazonaws.com/**', route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('list-type') === '2') {
      const prefix = url.searchParams.get('prefix');
      requestedPrefixes.push(prefix);
      const site = prefix.split('/').filter(Boolean).at(-1);
      return route.fulfill({
        contentType: 'application/xml',
        body: `<?xml version="1.0"?>
          <ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
            <Contents><Key>2026/07/25/${site}/${site}20260725_210000_V06</Key></Contents>
          </ListBucketResult>`
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/octet-stream',
      headers: { 'content-length': '4' },
      body: Buffer.from([1, 2, 3, 4])
    });
  });

  await page.goto('/');

  await expect(page.locator('#dataStatusText')).toHaveText('NEXRAD Level II: current');
  await expect(page.locator('.sidebar .level2-site-row')).toHaveClass(/visible/);
  await expect(page.locator('.leaflet-image-layer.level2-radar')).toBeVisible();
  await expect(page.locator('.sidebar [data-layer="couplets"]')).toHaveAttribute('data-feature-count', '1');
  await expect(page.locator('#timestampBox')).toHaveAttribute('data-provider-time', '2026-07-25T21:00:00.000Z');
  expect(requestedPrefixes[0]).toContain('/KTWX/');

  await page.locator('.sidebar [data-product="differentialReflectivity"]').evaluate(element => element.click());
  await expect.poll(() => page.evaluate(() => window.__level2Products)).toContain('differentialReflectivity');
  await expect(page.locator('.sidebar [data-source="level2"]')).toHaveClass(/active/);
  await expect(page.locator('.legend-labels')).toContainText('+8 dB');

  await page.locator('.sidebar .level2-site-select').selectOption('KTLX');
  await expect.poll(() => requestedPrefixes.some(prefix => prefix.includes('/KTLX/'))).toBe(true);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('stormview_settings')));
  expect(stored.settings.level2Site).toBe('KTLX');
});

test('aborting Level II work terminates stale computation and recreates clean worker state', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 4,
      settings: {
        source: 'level2',
        radarProduct: 'reflectivity',
        autoRefresh: false,
        layers: {
          radar: true,
          alerts: false,
          spcOutlook: false,
          states: false,
          counties: false,
          labels: false
        }
      }
    }));
    localStorage.setItem('stormview_welcomed', '1');
    window.__level2WorkerInstances = [];
    window.__level2Terminations = 0;
    window.__level2LoadRequests = 0;

    class ControlledLevel2Worker {
      listeners = new Map();

      constructor() {
        this.instance = window.__level2WorkerInstances.length + 1;
        window.__level2WorkerInstances.push(this.instance);
      }

      addEventListener(type, listener) {
        this.listeners.set(type, listener);
      }

      postMessage(message) {
        if (message.type === 'load') {
          window.__level2LoadRequests += 1;
          const delay = this.instance === 1 ? 250 : 0;
          setTimeout(() => {
            this.listeners.get('message')?.({ data: { id: message.id, type: 'loaded', site: 'KTWX' } });
          }, delay);
          return;
        }
        queueMicrotask(() => {
          const canvas = new OffscreenCanvas(8, 8);
          canvas.getContext('2d').fillRect(0, 0, 8, 8);
          this.listeners.get('message')?.({
            data: {
              id: message.id,
              type: 'rendered',
              bitmap: canvas.transferToImageBitmap(),
              latitude: 38.997,
              longitude: -96.232,
              maxRangeKm: 230,
              elevationAngle: 0.5,
              site: 'KTWX',
              hasGaps: false,
              isTruncated: false,
              couplets: []
            }
          });
        });
      }

      terminate() {
        window.__level2Terminations += 1;
      }
    }

    window.Worker = ControlledLevel2Worker;
  });
  await routeLevel2Data(page);
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    json: { model_init_utc: '2026-07-25T12:00:00Z' }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));

  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.__level2LoadRequests)).toBe(1);
  await page.locator('.sidebar [data-source="hrrr"]').evaluate(element => element.click());
  await expect(page.locator('#dataStatusText')).toHaveText('HRRR: current');
  await expect.poll(() => page.evaluate(() => window.__level2Terminations)).toBe(1);
  await page.waitForTimeout(300);
  await expect(page.locator('#dataStatusText')).toHaveText('HRRR: current');
  await expect(page.locator('.leaflet-image-layer.level2-radar')).toHaveCount(0);

  await page.locator('.sidebar [data-source="level2"]').evaluate(element => element.click());
  await expect(page.locator('#dataStatusText')).toHaveText('NEXRAD Level II: current');
  await expect(page.locator('.leaflet-image-layer.level2-radar')).toBeVisible();
  expect(await page.evaluate(() => window.__level2WorkerInstances)).toEqual([1, 2]);
});

test('failed Level II refresh restores a live object URL and revokes it once after replacement', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 4,
      settings: {
        source: 'level2',
        radarProduct: 'reflectivity',
        autoRefresh: false,
        layers: {
          radar: true,
          alerts: false,
          spcOutlook: false,
          states: false,
          counties: false,
          labels: false
        }
      }
    }));
    localStorage.setItem('stormview_welcomed', '1');
    window.__level2RenderRequests = 0;
    window.__revokedRadarUrls = [];
    const revokeObjectUrl = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = url => {
      window.__revokedRadarUrls.push(url);
      revokeObjectUrl(url);
    };

    class FailingRefreshWorker {
      listeners = new Map();

      addEventListener(type, listener) {
        this.listeners.set(type, listener);
      }

      postMessage(message) {
        queueMicrotask(() => {
          if (message.type === 'load') {
            this.listeners.get('message')?.({ data: { id: message.id, type: 'loaded', site: 'KTWX' } });
            return;
          }
          window.__level2RenderRequests += 1;
          if (window.__level2RenderRequests > 1) {
            this.listeners.get('message')?.({
              data: { id: message.id, type: 'error', message: 'forced render failure' }
            });
            return;
          }
          const canvas = new OffscreenCanvas(8, 8);
          canvas.getContext('2d').fillRect(0, 0, 8, 8);
          this.listeners.get('message')?.({
            data: {
              id: message.id,
              type: 'rendered',
              bitmap: canvas.transferToImageBitmap(),
              latitude: 38.997,
              longitude: -96.232,
              maxRangeKm: 230,
              elevationAngle: 0.5,
              site: 'KTWX',
              hasGaps: false,
              isTruncated: false,
              couplets: []
            }
          });
        });
      }

      terminate() {}
    }

    window.Worker = FailingRefreshWorker;
  });
  await routeLevel2Data(page);
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/USCOMP/n0q_0.json', route => route.fulfill({
    status: 503,
    json: { error: 'forced fallback failure' }
  }));
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    json: { model_init_utc: '2026-07-25T12:00:00Z' }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));

  await page.goto('/');
  const radarImage = page.locator('.leaflet-image-layer.level2-radar');
  await expect(radarImage).toBeVisible();
  const originalUrl = await radarImage.getAttribute('src');

  await page.locator('.sidebar [data-product="differentialReflectivity"]').evaluate(element => element.click());
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'stale');
  await expect(radarImage).toBeVisible();
  await expect(radarImage).toHaveAttribute('src', originalUrl);
  await expect(page.locator('.sidebar [data-product="reflectivity"]')).toHaveClass(/active/);
  expect(await page.evaluate(url => window.__revokedRadarUrls.filter(value => value === url).length, originalUrl)).toBe(0);

  await page.locator('.sidebar [data-source="hrrr"]').evaluate(element => element.click());
  await expect(page.locator('#dataStatusText')).toHaveText('HRRR: current');
  await expect.poll(() => page.evaluate(url => (
    window.__revokedRadarUrls.filter(value => value === url).length
  ), originalUrl)).toBe(1);
});

// The site inventory carries no health at all, so picking a radar in
// maintenance used to show an old volume with nothing to explain it.
test('the site picker reports operating, offline, and stale radars', async ({ page }) => {
  const now = Date.now();
  const station = (id, status, operability, minutes) => ({
    properties: {
      id,
      latency: { levelTwoLastReceivedTime: new Date(now - minutes * 60000).toISOString() },
      rda: { properties: { status, operabilityStatus: operability, alarmSummary: 'Tower/Utilities' } }
    }
  });

  await page.addInitScript(() => {
    localStorage.setItem('stormview_welcomed', '1');
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 9,
      settings: {
        source: 'hrrr',
        basemap: 'dark',
        autoRefresh: false,
        layers: { radar: true, alerts: false, spcOutlook: false, states: false, counties: false, labels: false }
      }
    }));
  });
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    json: { model_init_utc: '2026-08-12T12:00:00Z', forecast_minute: 180 }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200, contentType: 'image/png', body: transparentPng
  }));
  await page.route('https://mesonet.agron.iastate.edu/geojson/network/NEXRAD.geojson', route => route.fulfill({
    json: {
      type: 'FeatureCollection',
      features: [
        { id: 'DMX', properties: { sid: 'DMX', sname: 'Des Moines', state: 'IA', online: true }, geometry: { type: 'Point', coordinates: [-93.72, 41.73] } },
        { id: 'TLX', properties: { sid: 'TLX', sname: 'Oklahoma City', state: 'OK', online: true }, geometry: { type: 'Point', coordinates: [-97.28, 35.33] } },
        { id: 'OAX', properties: { sid: 'OAX', sname: 'Omaha', state: 'NE', online: true }, geometry: { type: 'Point', coordinates: [-96.37, 41.32] } },
        { id: 'FWS', properties: { sid: 'FWS', sname: 'Fort Worth', state: 'TX', online: true }, geometry: { type: 'Point', coordinates: [-97.30, 32.57] } }
      ]
    }
  }));
  await page.route('https://api.weather.gov/radar/stations**', route => route.fulfill({
    json: {
      type: 'FeatureCollection',
      features: [
        station('KDMX', 'Operate', 'RDA - On-line', 2),
        station('KTLX', 'Operate', 'RDA - Maintenance Action Mandatory', 3),
        station('KOAX', 'Operate', 'RDA - On-line', 45),
        station('KFWS', 'Start-Up', 'RDA - On-line', 1)
      ]
    }
  }));

  await page.goto('/');
  await page.locator('.sidebar [data-source="level2"]').evaluate(element => element.click());
  const select = page.locator('.level2-site-select').first();
  await expect(select.locator('option[value="KDMX"]')).toHaveCount(1);

  // The badge in the option text is what a user sees before choosing.
  const options = await select.locator('option').evaluateAll(items => items.map(item => ({
    value: item.value,
    text: item.textContent,
    state: item.dataset.siteState
  })));
  const byValue = Object.fromEntries(options.filter(option => option.value).map(option => [option.value, option]));
  expect(byValue.KDMX.state).toBe('operating');
  expect(byValue.KDMX.text).not.toMatch(/\(/);
  expect(byValue.KTLX.state).toBe('degraded');
  expect(byValue.KTLX.text).toMatch(/maintenance/);
  expect(byValue.KOAX.state).toBe('stale');
  expect(byValue.KOAX.text).toMatch(/no recent data/);
  expect(byValue.KFWS.state).toBe('down');
  expect(byValue.KFWS.text).toMatch(/offline/);

  // Selecting one explains itself rather than silently showing an old scan.
  // The sidebar is mirrored into the mobile sheet, so this control exists twice.
  const health = page.locator('.level2-site-health').first();
  await select.selectOption('KFWS');
  await expect(health).toHaveAttribute('data-site-state', 'down');
  await expect(health).toContainText(/KFWS/);
  await expect(health).toContainText(/offline \(Start-Up\)/);

  await select.selectOption('KOAX');
  await expect(health).toHaveAttribute('data-site-state', 'stale');
  await expect(health).toContainText(/no recent Level II volume/);
  await expect(health).toContainText(/last volume 45 min ago/);

  await select.selectOption('KDMX');
  await expect(health).toHaveAttribute('data-site-state', 'operating');
  await expect(health).toContainText(/operating/);
});
