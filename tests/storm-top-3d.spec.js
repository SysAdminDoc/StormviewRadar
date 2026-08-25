import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

function stormFeature(id, longitude, latitude, properties = {}) {
  return {
    type: 'Feature',
    properties: {
      nexrad: 'TLX',
      storm_id: id,
      valid: '2026-07-25T22:00:00Z',
      tvs: 'NONE',
      meso: 'NONE',
      posh: 20,
      poh: 30,
      max_size: 0.5,
      vil: 35,
      max_dbz: 55,
      max_dbz_height: 25,
      top: 45,
      drct: 90,
      sknt: 25,
      ...properties
    },
    geometry: { type: 'Point', coordinates: [longitude, latitude] }
  };
}

function relativeLuminance([red, green, blue]) {
  const channel = value => {
    const normalized = value / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function contrastRatio(foreground, background) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

test('3D storm-top mode renders measured columns from local Cesium assets and releases WebGL state', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
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
          stormTracks: false
        }
      }
    }));
    localStorage.setItem('stormview_welcomed', '1');
  });
  await page.route('https://mesonet.agron.iastate.edu/geojson/nexrad_attr.py*', route => route.fulfill({
    contentType: 'application/geo+json',
    body: JSON.stringify({
      type: 'FeatureCollection',
      generated_at: '2026-07-25T22:00:00Z',
      features: [
        stormFeature('A1', -97, 35, { top: 50, tvs: 'TVS', max_dbz: 62 }),
        stormFeature('B2', -96, 36, { top: 38, posh: 70, max_size: 1.5 })
      ]
    })
  }));

  await page.goto('/');
  const toggle = page.locator('#stormTop3dBtn');
  await toggle.click();

  const view = page.locator('#cesiumView');
  await expect(view).toBeVisible({ timeout: 20_000 });
  await expect(view).toHaveAttribute('data-entity-count', '2', { timeout: 20_000 });
  await expect(page.locator('#storm3dStatus')).toHaveText('2 storm tops in the current map view');
  await expect(page.locator('#cesiumContainer canvas')).toHaveCount(1);
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('body')).toHaveClass(/storm-3d-mode/);

  const assertStormInfoContrast = async () => {
    const colors = await page.locator('.storm-3d-info').evaluate(panel => {
      const parse = value => (value.match(/\d+(?:\.\d+)?/g) || []).slice(0, 3).map(Number);
      const background = parse(getComputedStyle(panel).backgroundColor);
      return [...panel.querySelectorAll('strong, .storm-3d-info-status, .storm-3d-info-note, .storm-3d-legend')].map(element => ({
        label: element.className || element.tagName,
        foreground: parse(getComputedStyle(element).color),
        background
      }));
    });
    for (const color of colors) {
      expect(contrastRatio(color.foreground, color.background), color.label).toBeGreaterThanOrEqual(4.5);
    }
    const results = await new AxeBuilder({ page })
      .include('#cesiumView')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  };

  await assertStormInfoContrast();
  await page.locator('#themeBtn').click();
  await expect(page.locator('body')).toHaveClass(/light-theme/);
  await assertStormInfoContrast();

  await page.keyboard.press('Escape');
  await expect(view).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#cesiumContainer canvas')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveClass(/storm-3d-mode/);
});
