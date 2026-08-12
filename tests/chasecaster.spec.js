import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

async function prepareChasecaster(page, orientationPermission = 'granted') {
  await page.addInitScript(({ permission }) => {
    localStorage.setItem('stormview_welcomed', '1');
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 9,
      settings: {
        source: 'hrrr',
        basemap: 'dark',
        autoRefresh: false,
        units: 'metric',
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
    const state = { success: null, error: null, cleared: [], options: null };
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition(success, error, options) {
          state.success = success;
          state.error = error;
          state.options = options;
          queueMicrotask(() => success({
            timestamp: 1000,
            coords: { latitude: 41.5868, longitude: -93.625, accuracy: 8, speed: 10, heading: 45 }
          }));
          return 77;
        },
        clearWatch(id) { state.cleared.push(id); },
        getCurrentPosition() {}
      }
    });
    class MockDeviceOrientationEvent extends Event {
      static requestPermission() { return Promise.resolve(permission); }
    }
    Object.defineProperty(window, 'DeviceOrientationEvent', { configurable: true, value: MockDeviceOrientationEvent });
    window.__chaseSensorMock = {
      emitPosition(position) { state.success?.(position); },
      emitError(error) { state.error?.(error); },
      emitHeading(heading, accuracy = 10) {
        const event = new Event('deviceorientation');
        Object.defineProperties(event, {
          webkitCompassHeading: { value: heading },
          webkitCompassAccuracy: { value: accuracy },
          absolute: { value: true }
        });
        window.dispatchEvent(event);
      },
      state
    };
  }, { permission: orientationPermission });
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

test('chasecaster follows high-accuracy GPS, presents compass heading, and releases sensors', async ({ page }) => {
  await prepareChasecaster(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');

  await page.locator('#pipRadarBtn').click();
  await expect(page.locator('#pipRadarPanel')).toBeVisible();
  await page.locator('#chasecasterBtn').click();
  await expect(page.locator('body')).toHaveClass(/chasecaster-mode/);
  await expect(page.locator('#chasecasterPanel')).toBeVisible();
  await expect(page.locator('#pipRadarPanel')).toBeHidden();
  await expect(page.locator('#chasecasterBtn')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#map')).toHaveAttribute('data-latitude', '41.5868');
  await expect(page.locator('#map')).toHaveAttribute('data-longitude', '-93.6250');
  await expect(page.locator('#chasecasterAccuracy')).toHaveText('8 m');
  await expect(page.locator('#chasecasterSpeed')).toHaveText('36 km/h');
  await expect(page.locator('#chasecasterSafety')).toContainText('Do not interact');
  await expect(page.locator('.chasecaster-location-icon')).toHaveCount(1);
  await expect(page.locator('.user-position-accuracy')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__chaseSensorMock.state.options)).toEqual({
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 15000
  });

  await page.evaluate(() => window.__chaseSensorMock.emitHeading(87));
  await expect(page.locator('#chasecasterHeading')).toHaveText('056° NE');
  await expect(page.locator('#chasecasterStatus')).toContainText('absolute compass');
  await expect(page.locator('.chasecaster-location-arrow')).toHaveCSS('transform', /matrix/);

  const mapBox = await page.locator('#map').boundingBox();
  await page.mouse.move(mapBox.x + 80, mapBox.y + 380);
  await page.mouse.down();
  await page.mouse.move(mapBox.x + 145, mapBox.y + 380, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator('#chasecasterFollow')).toHaveText('Recenter and follow');
  await expect(page.locator('#chasecasterFollow')).toHaveAttribute('aria-pressed', 'false');

  await page.evaluate(() => window.__chaseSensorMock.emitPosition({
    timestamp: 2000,
    coords: { latitude: 41.7, longitude: -93.7, accuracy: 6, speed: 0, heading: 90 }
  }));
  await expect(page.locator('#chasecasterSpeed')).toHaveText('0 km/h');
  await page.locator('#chasecasterFollow').click();
  await expect.poll(() => page.locator('#map').getAttribute('data-latitude').then(Number)).toBeCloseTo(41.7, 3);
  await expect.poll(() => page.locator('#map').getAttribute('data-longitude').then(Number)).toBeCloseTo(-93.7, 3);

  await page.locator('#chasecasterStop').click();
  await expect(page.locator('#chasecasterPanel')).toBeHidden();
  await expect(page.locator('body')).not.toHaveClass(/chasecaster-mode/);
  await expect(page.locator('.chasecaster-location-icon')).toHaveCount(0);
  await expect(page.locator('#pipRadarPanel')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__chaseSensorMock.state.cleared)).toEqual([77]);
});

test('chasecaster remains useful as GPS-only mode when compass permission is denied', async ({ page }) => {
  await prepareChasecaster(page, 'denied');
  await page.goto('/');
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');
  await page.locator('#chasecasterBtn').click();
  await expect(page.locator('#chasecasterPanel')).toBeVisible();
  await expect(page.locator('#chasecasterStatus')).toContainText('compass unavailable');
  await expect(page.locator('#chasecasterHeading')).toHaveText('045° NE');
  await page.evaluate(() => window.__chaseSensorMock.emitError({ code: 1 }));
  await expect(page.locator('#chasecasterPanel')).toBeHidden();
  await expect(page.getByText(/Location permission is required for chasecaster mode/)).toBeVisible();
});
