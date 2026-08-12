import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

async function prepareInstallPage(page) {
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
          alerts: false,
          spcOutlook: false,
          states: false,
          counties: false,
          labels: false
        }
      }
    }));
    window.__pwaTestState = { messages: [], prompts: 0 };
    const active = {
      postMessage(message) { window.__pwaTestState.messages.push(message); }
    };
    navigator.serviceWorker.register = () => Promise.resolve({ active });
    Object.defineProperty(navigator.serviceWorker, 'ready', {
      configurable: true,
      value: Promise.resolve({ active })
    });
    window.__dispatchInstallEvent = outcome => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      Object.defineProperties(event, {
        prompt: {
          value: async () => { window.__pwaTestState.prompts += 1; }
        },
        userChoice: {
          value: Promise.resolve({ outcome: outcome || 'accepted', platform: 'web' })
        }
      });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    window.__dispatchOfflineAvailability = radarEntries => {
      navigator.serviceWorker.dispatchEvent(new MessageEvent('message', {
        data: {
          type: 'stormview-offline-availability',
          shell: true,
          radarFrame: radarEntries > 0,
          radarEntries
        }
      }));
    };
  });
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    json: { model_init_utc: '2026-08-12T12:00:00Z', forecast_minute: 180 }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));
  await page.route('https://*.basemaps.cartocdn.com/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));
}

test('install offer waits for both browser eligibility and verified offline radar readiness', async ({ page }) => {
  await prepareInstallPage(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');
  expect(await page.evaluate(() => window.__dispatchInstallEvent('accepted'))).toBe(true);
  await expect(page.locator('#pwaInstallPrompt')).toBeHidden();

  await page.evaluate(() => window.__dispatchOfflineAvailability(9));
  await expect(page.locator('#pwaInstallPrompt')).toBeVisible();
  await expect(page.locator('#pwaInstallPrompt')).toHaveAttribute('data-offline-radar-entries', '9');
  await expect(page.locator('#pwaInstallDescription')).toContainText('last radar frame');
  await page.locator('#pwaInstallButton').click();
  await expect(page.locator('#pwaInstallPrompt')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__pwaTestState.prompts)).toBe(1);
  await expect(page.getByText('StormView Radar install request opened')).toBeVisible();
});

test('offline readiness may arrive before install eligibility and dismissal suppresses repeat offers', async ({ page }) => {
  await prepareInstallPage(page);
  await page.goto('/');
  await page.evaluate(() => window.__dispatchOfflineAvailability(4));
  await expect(page.locator('#pwaInstallPrompt')).toBeHidden();
  await page.evaluate(() => window.__dispatchInstallEvent('dismissed'));
  await expect(page.locator('#pwaInstallPrompt')).toBeVisible();
  await page.locator('#pwaInstallDismiss').click();
  await expect(page.locator('#pwaInstallPrompt')).toBeHidden();
  await expect.poll(() => page.evaluate(() => Number(localStorage.getItem('stormview_pwa_install_dismissed_at')))).toBeGreaterThan(0);
  await page.evaluate(() => window.__dispatchInstallEvent('accepted'));
  await expect(page.locator('#pwaInstallPrompt')).toBeHidden();
});
