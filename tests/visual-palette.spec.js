import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);
const radarSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="32" height="128" fill="#0064ff"/><rect x="32" width="32" height="128" fill="#00c800"/><rect x="64" width="32" height="128" fill="#ffff00"/><rect x="96" width="32" height="128" fill="#ff0000"/></svg>');

test('visual palettes persist and restyle provider radar, alerts, legends, and UI', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_welcomed', '1');
    if (localStorage.getItem('stormview_settings')) return;
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 9,
      settings: {
        source: 'hrrr',
        basemap: 'dark',
        autoRefresh: false,
        visualPalette: 'standard',
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
    contentType: 'image/png',
    body: transparentPng
  }));
  await page.route('https://api.weather.gov/alerts/active?status=actual', route => route.fulfill({
    json: {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        id: 'palette-severe',
        properties: {
          id: 'palette-severe',
          event: 'Severe Thunderstorm Warning',
          severity: 'Severe',
          sent: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          expires: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[[-125, 24], [-66, 24], [-66, 50], [-125, 50], [-125, 24]]]
        }
      }]
    }
  }));

  await page.goto('/');
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');
  await expect(page.locator('.sidebar [data-layer="alerts"]')).toHaveAttribute('data-feature-count', '1');
  await page.locator('#settingsBtn').click();
  await page.locator('.settings-tab[data-tab="radar"]').click();
  await page.locator('#colorSchemes [data-visual-palette="colorblind"]').click();

  await expect(page.locator('body')).toHaveAttribute('data-visual-palette', 'colorblind');
  await expect(page.locator('#colorSchemes [data-visual-palette="colorblind"]')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.locator('#map .radar-layer').first().evaluate(element => getComputedStyle(element).filter)).toContain('radar-cividis-filter');
  const alertPixel = await page.locator('#map canvas.leaflet-zoom-animated').evaluate(canvas => {
    const context = canvas.getContext('2d');
    return [...context.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data];
  });
  expect(Math.abs(alertPixel[0] - 230)).toBeLessThanOrEqual(2);
  expect(Math.abs(alertPixel[1] - 159)).toBeLessThanOrEqual(2);
  expect(alertPixel[2]).toBe(0);
  expect(alertPixel[3]).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('stormview_settings')))).toMatchObject({
    schemaVersion: 9,
    settings: { visualPalette: 'colorblind' }
  });

  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-visual-palette', 'colorblind');
  await page.locator('#settingsBtn').click();
  await page.locator('.settings-tab[data-tab="radar"]').click();
  await page.locator('#colorSchemes [data-visual-palette="highContrast"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-visual-palette', 'highContrast');
  const highContrast = await page.evaluate(() => ({
    panel: getComputedStyle(document.body).getPropertyValue('--panel-bg').trim(),
    border: getComputedStyle(document.body).getPropertyValue('--glass-border').trim(),
    radarFilter: getComputedStyle(document.querySelector('#map .radar-layer')).filter,
    legend: getComputedStyle(document.querySelector('.legend-gradient')).backgroundImage
  }));
  expect(highContrast.panel).toBe('#000');
  expect(highContrast.border).toContain('0.72');
  expect(highContrast.radarFilter).toContain('radar-high-contrast-filter');
  expect(highContrast.legend).toContain('rgb(255, 23, 68)');
});

test('the legend reads at 390px and stays clear of the middle of the map', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('stormview_welcomed', '1');
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 9,
      settings: {
        source: 'hrrr',
        basemap: 'dark',
        autoRefresh: false,
        showLegend: true,
        layers: { radar: true, alerts: false, spcOutlook: false, states: false, counties: false, labels: false }
      }
    }));
  });
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    json: { model_init_utc: '2026-08-12T12:00:00Z', forecast_minute: 180 }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200, contentType: 'image/svg+xml', body: radarSvg
  }));
  await page.route('https://*.basemaps.cartocdn.com/**', route => route.fulfill({
    status: 200, contentType: 'image/png', body: transparentPng
  }));

  await page.goto('/');
  await expect(page.locator('#legend')).toBeVisible();

  const report = await page.evaluate(() => {
    const legend = document.getElementById('legend');
    const spans = [...legend.querySelectorAll('.legend-labels span')];
    const map = document.getElementById('map').getBoundingClientRect();
    const box = legend.getBoundingClientRect();
    const centre = {
      left: map.left + map.width * 0.25,
      right: map.left + map.width * 0.75,
      top: map.top + map.height * 0.25,
      bottom: map.top + map.height * 0.75
    };
    const rects = spans.map(span => span.getBoundingClientRect());
    let overlapping = 0;
    for (let i = 1; i < rects.length; i += 1) if (rects[i].top < rects[i - 1].bottom - 0.5) overlapping += 1;
    return {
      // A wrapped inline element reports one client rect per line.
      wrapped: spans.filter(span => span.getClientRects().length !== 1).map(span => span.textContent),
      clipped: spans.filter(span => span.scrollWidth > span.clientWidth + 1).map(span => span.textContent),
      overlapping,
      labelCount: spans.length,
      intersectsCentre: !(box.right <= centre.left || centre.right <= box.left || box.bottom <= centre.top || centre.bottom <= box.top)
    };
  });

  expect(report.labelCount).toBeGreaterThan(4);
  expect(report.wrapped).toEqual([]);
  expect(report.clipped).toEqual([]);
  expect(report.overlapping).toBe(0);
  expect(report.intersectsCentre).toBe(false);

  // The visibility toggle must hide the legend without dictating its layout.
  await page.locator('#settingsBtn').click();
  await page.locator('#legendToggle').click();
  await expect(page.locator('#legend')).toBeHidden();
  await page.locator('#legendToggle').click();
  await expect(page.locator('#legend')).toBeVisible();
  expect(await page.locator('#legend').evaluate(el => getComputedStyle(el).display)).toBe('flex');
});
