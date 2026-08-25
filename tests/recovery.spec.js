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
    localStorage.setItem('stormview_bookmarks', JSON.stringify([
      { id: 1, name: 'Wichita, Kansas', lat: 37.6872, lng: -97.3301 },
      { id: 2, name: 'Norman, Oklahoma', lat: 35.2226, lng: -97.4395 }
    ]));
    localStorage.setItem('stormview_welcomed_v5', '1');
  });
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    json: {
      model_init_utc: '2026-07-25T12:00:00Z',
      model_forecast_utc: '2026-07-25T14:00:00Z'
    }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));
});

test('bookmark quota failure preserves the prior list and gives recovery guidance', async ({ page }) => {
  await page.addInitScript(() => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === 'stormview_bookmarks') {
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    };
  });
  await page.goto('/');
  await page.locator('#bookmarksBtn').click();
  await page.locator('#bmClear').click();

  await expect(page.getByText(/Export your current list.*clear browser storage/i)).toBeVisible();
  await expect(page.locator('.bm-item-name')).toHaveText(['Wichita, Kansas', 'Norman, Oklahoma']);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('stormview_bookmarks')));
  expect(stored.map(location => location.name)).toEqual(['Wichita, Kansas', 'Norman, Oklahoma']);
});

test('bookmark deletion is keyboard-operable and undoable', async ({ page }) => {
  await page.goto('/');
  await page.locator('#bookmarksBtn').click();

  const removeWichita = page.getByRole('button', { name: 'Remove Wichita, Kansas' });
  await removeWichita.focus();
  await removeWichita.press('Enter');
  await expect(page.locator('.bm-item-name')).toHaveText('Norman, Oklahoma');
  await page.getByRole('button', { name: 'Undo' }).click();

  await expect(page.locator('.bm-item-name')).toHaveText(['Wichita, Kansas', 'Norman, Oklahoma']);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('stormview_bookmarks')));
  expect(stored.map(location => location.name)).toEqual(['Wichita, Kansas', 'Norman, Oklahoma']);
});

test('denied geolocation explains recovery without prompting repeatedly', async ({ page }) => {
  await page.addInitScript(() => {
    window.__locationPromptCount = 0;
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(_success, failure) {
          window.__locationPromptCount += 1;
          failure({ code: 1, message: 'Permission denied' });
        }
      }
    });
  });
  await page.goto('/');

  await page.locator('#locBtn').click();
  await expect(page.locator('#locBtn')).toHaveAttribute('data-location-state', 'denied');
  await expect(page.locator('#locBtn')).toHaveAttribute('aria-label', /Enable it in browser site settings/);
  await page.locator('#locBtn').click();

  await expect.poll(() => page.evaluate(() => window.__locationPromptCount)).toBe(1);
  await expect(page.getByText(/Enable it in browser site settings, then reload StormView/).last()).toBeVisible();
});

test('rejected OpenWeatherMap key disables only the requested layer with repair guidance', async ({ page }) => {
  await page.addInitScript(() => {
    const settings = JSON.parse(localStorage.getItem('stormview_pro_v3'));
    settings.owmKey = 'expired-test-key';
    localStorage.setItem('stormview_pro_v3', JSON.stringify(settings));
  });
  await page.route('https://api.openweathermap.org/data/2.5/weather**', route => route.fulfill({
    status: 401,
    json: { cod: 401, message: 'Invalid API key' }
  }));
  await page.goto('/');

  await page.locator('.sidebar [data-layer="temp"]').evaluate(element => element.click());
  await expect(page.locator('.sidebar [data-layer="temp"]')).toHaveAttribute('data-load-state', 'failed');
  await expect(page.getByText(/rejected this API key.*Settings > API Keys/i)).toBeVisible();

  const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('stormview_settings')).settings);
  expect(settings.layers.temp).toBe(false);
  expect(settings.layers.radar).toBe(true);
  await expect(page.locator('.sidebar [data-layer="radar"]')).toHaveClass(/active/);
  await expect(page.locator('.leaflet-tile-pane img[src*="tile.openweathermap.org"]')).toHaveCount(0);
});
