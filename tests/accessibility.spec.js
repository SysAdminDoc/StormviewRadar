import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_pro_v3', JSON.stringify({
      source: 'hrrr',
      autoRefresh: false,
      layers: {
        radar: true,
        alerts: false,
        spcOutlook: false,
        states: false,
        counties: false,
        labels: false
      }
    }));
    localStorage.setItem('stormview_welcomed_v5', '1');
  });
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    json: {
      model_init_utc: '2026-07-25T12:00:00Z',
      forecast_minute: 120,
      model_forecast_utc: '2026-07-25T14:00:00Z'
    }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));
});

test('desktop controls pass automated accessibility checks', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#dataStatusText')).toHaveText('HRRR: current');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);

  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
  const forcedColorsResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(forcedColorsResults.violations).toEqual([]);
});

test('custom switches and dialogs support keyboard state and focus return', async ({ page }) => {
  await page.goto('/');
  const opener = page.locator('#settingsBtn');
  await opener.focus();
  await opener.press('Enter');

  const panel = page.locator('#settingsPanel');
  await expect(panel).toHaveAttribute('aria-hidden', 'false');
  await expect(panel.locator(':focus')).toHaveCount(1);

  const themeSwitch = page.locator('#themeToggle');
  await themeSwitch.focus();
  const initialState = await themeSwitch.getAttribute('aria-checked');
  await themeSwitch.press('Space');
  await expect(themeSwitch).not.toHaveAttribute('aria-checked', initialState);

  await page.keyboard.press('Escape');
  await expect(panel).toHaveAttribute('aria-hidden', 'true');
  await expect(opener).toBeFocused();
});

test('search combobox supports arrow selection and Enter', async ({ page }) => {
  await page.route('https://nominatim.openstreetmap.org/search**', route => route.fulfill({
    json: [
      { lat: '39', lon: '-96', display_name: 'First Place, Test County, TS' },
      { lat: '40', lon: '-95', display_name: 'Second Place, Test County, TS' }
    ]
  }));
  await page.goto('/');

  const search = page.locator('#searchInput');
  await search.fill('place');
  await expect(search).toHaveAttribute('aria-expanded', 'true');
  await search.press('ArrowDown');
  await expect(search).toHaveAttribute('aria-activedescendant', 'search-option-0');
  await search.press('ArrowDown');
  await expect(search).toHaveAttribute('aria-activedescendant', 'search-option-1');
  await search.press('Enter');
  await expect(search).toHaveAttribute('aria-expanded', 'false');
});

test('mobile sheet traps focus, closes with Escape, and honors contrast preferences', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('#themeBtn').click();
  await expect(page.locator('body')).toHaveClass(/light-theme/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);

  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });

  const opener = page.locator('#mobileFab');
  await opener.click();
  const sheet = page.locator('#bottomSheet');
  await expect(sheet).toHaveAttribute('aria-hidden', 'false');
  await expect(sheet.locator(':focus')).toHaveCount(1);
  await expect(page.locator('#mobileFab')).toHaveCSS('border-style', 'solid');

  await page.keyboard.press('Escape');
  await expect(sheet).toHaveAttribute('aria-hidden', 'true');
  await expect(opener).toBeFocused();
});
