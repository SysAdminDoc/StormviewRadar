import { expect, test } from '@playwright/test';

const basemapSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="#172554"/><path d="M0 64h128M64 0v128" stroke="#64748b" stroke-width="2"/></svg>');
const radarSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="32" height="128" fill="#0064ff"/><rect x="32" width="32" height="128" fill="#00c800"/><rect x="64" width="32" height="128" fill="#ffff00"/><rect x="96" width="32" height="128" fill="#ff0000"/></svg>');

test('one-click map snapshot exports the visible frame with a branded attribution footer', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_welcomed', '1');
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 9,
      settings: {
        source: 'hrrr',
        basemap: 'dark',
        autoRefresh: false,
        layers: {
          radar: true,
          alerts: true,
          spcOutlook: false,
          couplets: false,
          states: false,
          counties: false,
          labels: false
        }
      }
    }));
  });
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    json: { model_init_utc: '2026-08-12T12:00:00Z', forecast_minute: 180 }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    contentType: 'image/svg+xml',
    body: radarSvg
  }));
  await page.route('https://*.basemaps.cartocdn.com/**', route => route.fulfill({
    status: 200,
    contentType: 'image/svg+xml',
    body: basemapSvg
  }));
  await page.route('https://api.weather.gov/alerts/active?status=actual', route => route.fulfill({
    json: {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        id: 'snapshot-warning',
        properties: {
          id: 'snapshot-warning',
          event: 'Severe Thunderstorm Warning',
          severity: 'Severe',
          sent: '2026-08-12T14:55:00Z',
          expires: '2026-08-12T16:00:00Z'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[[-105, 32], [-87, 32], [-87, 45], [-105, 45], [-105, 32]]]
        }
      }]
    }
  }));

  await page.goto('/');
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');
  await expect(page.locator('#snapshotBtn')).toHaveAttribute('aria-label', 'Save attributed map snapshot');
  const mapBox = await page.locator('#map').boundingBox();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#snapshotBtn').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^stormview-hrrr.*-reflectivity-\d{8}T\d{6}z\.png$/);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const png = Buffer.concat(chunks);
  expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(png.length).toBeGreaterThan(10_000);

  const decoded = await page.evaluate(async ({ encoded, mapHeight }) => {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Exported PNG could not be decoded'));
      image.src = `data:image/png;base64,${encoded}`;
    });
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const footer = [...context.getImageData(20, canvas.height - 60, 1, 1).data];
    const accent = [...context.getImageData(20, Math.round(mapHeight * 2 + 2), 1, 1).data];
    const mapSamples = [];
    for (let y = 100; y < Math.round(mapHeight * 2) - 100; y += 160) {
      for (let x = 100; x < canvas.width - 100; x += 200) {
        mapSamples.push([...context.getImageData(x, y, 1, 1).data]);
      }
    }
    return { width: canvas.width, height: canvas.height, footer, accent, mapSamples };
  }, { encoded: png.toString('base64'), mapHeight: mapBox.height });

  expect(decoded.width).toBe(Math.round(mapBox.width * 2));
  expect(decoded.height).toBe(Math.round((mapBox.height + 88) * 2));
  expect(decoded.footer[0]).toBeLessThan(30);
  expect(decoded.footer[1]).toBeLessThan(40);
  expect(decoded.accent[2]).toBeGreaterThan(decoded.accent[0]);
  expect(new Set(decoded.mapSamples.map(pixel => pixel.slice(0, 3).join(','))).size).toBeGreaterThan(3);
  await expect(page.getByText('Map snapshot saved', { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const narrowLayout = await page.evaluate(() => {
    const button = document.getElementById('snapshotBtn').getBoundingClientRect();
    const header = document.querySelector('.header').getBoundingClientRect();
    return {
      buttonLeft: button.left,
      buttonRight: button.right,
      headerLeft: header.left,
      headerRight: header.right,
      viewportWidth: innerWidth,
      scrollWidth: document.documentElement.scrollWidth
    };
  });
  expect(narrowLayout.buttonLeft).toBeGreaterThanOrEqual(narrowLayout.headerLeft);
  expect(narrowLayout.buttonRight).toBeLessThanOrEqual(narrowLayout.headerRight);
  expect(narrowLayout.headerRight).toBeLessThanOrEqual(narrowLayout.viewportWidth);
  expect(narrowLayout.scrollWidth).toBeLessThanOrEqual(narrowLayout.viewportWidth);
});
