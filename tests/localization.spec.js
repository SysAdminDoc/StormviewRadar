import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

test('Spanish and metric preferences localize UI, dates, and weather units with English fallback', async ({ page }) => {
  let forecastRequest;
  await page.addInitScript(() => {
    localStorage.setItem('stormview_pro_v3', JSON.stringify({
      source: 'hrrr',
      language: 'es',
      units: 'metric',
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
    localStorage.setItem('stormview_welcomed', '1');
  });
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    json: { model_init_utc: '2026-07-25T12:00:00Z' }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));
  await page.route('https://api.open-meteo.com/v1/forecast**', route => {
    forecastRequest = new URL(route.request().url());
    return route.fulfill({
      json: {
        timezone: 'America/Chicago',
        current: {
          temperature_2m: 20,
          apparent_temperature: 19,
          relative_humidity_2m: 55,
          weather_code: 77,
          wind_speed_10m: 16,
          wind_direction_10m: 180,
          wind_gusts_10m: 24,
          surface_pressure: 1012,
          precipitation: 1.5,
          is_day: 1
        },
        hourly: {
          time: ['2026-07-25T21:00', '2026-07-25T22:00'],
          temperature_2m: [20, 19],
          weather_code: [77, 3],
          precipitation_probability: [20, 10],
          is_day: [1, 1]
        },
        daily: {
          time: ['2026-07-25', '2026-07-26'],
          weather_code: [77, 3],
          temperature_2m_max: [22, 21],
          temperature_2m_min: [14, 13],
          precipitation_probability_max: [30, 20],
          wind_speed_10m_max: [24, 20]
        }
      }
    });
  });
  await page.route('https://api.weather.gov/points/**', route => route.fulfill({
    json: { properties: { relativeLocation: { properties: { city: 'Prueba', state: 'TS' } } } }
  }));
  await page.route('https://api.weather.gov/alerts/active?point=**', route => route.fulfill({
    json: { type: 'FeatureCollection', features: [] }
  }));

  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.locator('#dataStatusText')).toHaveText('HRRR: actual');
  await expect(page.locator('#map')).toHaveAttribute('aria-label', /Mapa meteorológico interactivo/);
  await expect(page.locator('#searchInput')).toHaveAttribute('placeholder', 'Buscar ubicación…');
  await expect(page.locator('#settingsBtn')).toHaveAttribute('aria-label', 'Configuración');
  await expect(page.locator('#locBtn')).toHaveAttribute('aria-label', 'Mi ubicación');
  await expect(page.locator('#mobileFab')).toHaveAttribute('aria-label', 'Abrir controles de capas');
  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsTitle')).toHaveText('Configuración');
  await expect(page.locator('.settings-tab[data-tab="display"]')).toHaveText('Pantalla');
  await expect(page.locator('#languageSelect')).toHaveValue('es');
  await expect(page.locator('#unitsSelect')).toHaveValue('metric');
  await expect(page.locator('#settingsClose')).toHaveAttribute('aria-label', 'Cerrar configuración');
  await page.locator('#settingsClose').click();

  await page.locator('#map').click({ position: { x: 640, y: 400 } });
  await expect(page.locator('#fcLocation')).toHaveText('Prueba, TS');
  await expect(page.locator('.fc-condition')).toHaveText('Snow Grains');
  await expect(page.locator('.fc-current-temp')).toHaveText('20°C');
  await expect(page.locator('.fc-stats')).toContainText('Sensación 19°C');
  await expect(page.locator('.fc-stats')).toContainText('16 km/h');
  await expect(page.locator('.fc-stats')).toContainText('1012 hPa');
  await expect(page.locator('.fc-stats')).toContainText('1.50 mm/h');
  await expect(page.locator('.fc-section-title').first()).toHaveText('Pronóstico por hora');
  await expect(page.locator('.fc-section-title').last()).toHaveText('Pronóstico de 7 días');
  await expect(page.locator('.fc-day-name').first()).toHaveText('Hoy');

  expect(forecastRequest.searchParams.get('temperature_unit')).toBe('celsius');
  expect(forecastRequest.searchParams.get('wind_speed_unit')).toBe('kmh');
  expect(forecastRequest.searchParams.get('precipitation_unit')).toBe('mm');
});
