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
  await page.route('https://mesonet.agron.iastate.edu/archive/data/**', route => route.fulfill({
    status: 200,
    headers: { 'access-control-allow-origin': '*' },
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

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];

async function violations(page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return results.violations.map(violation => `${violation.id}: ${violation.nodes.map(node => node.target.join(' ')).join(', ')}`);
}

// The desktop sweep above missed a mobile-only defect because responsive CSS
// can change names, contrast, and target sizes inside a breakpoint the test
// never enters. Sweep the narrow layout in both themes and every palette.
for (const [layout, width, height] of [['narrow', 390, 844], ['wide', 1280, 800]]) {
  for (const theme of ['dark', 'light']) {
    for (const palette of ['standard', 'highContrast', 'colorblind']) {
      test(`${layout} ${theme} layout passes accessibility checks with the ${palette} palette`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.addInitScript(([themeValue, paletteValue]) => {
          const stored = JSON.parse(localStorage.getItem('stormview_pro_v3') || '{}');
          stored.theme = themeValue;
          stored.visualPalette = paletteValue;
          localStorage.setItem('stormview_pro_v3', JSON.stringify(stored));
        }, [theme, palette]);

        await page.goto('/');
        await expect(page.locator('#dataStatusText')).toHaveText('HRRR: current');
        await expect(page.locator('body')).toHaveAttribute('data-visual-palette', palette);
        expect(await violations(page)).toEqual([]);
      });
    }
  }
}

test('toolbar icons hand themselves back to the system palette in forced colors', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#dataStatusText')).toHaveText('HRRR: current');

  // A light high-contrast theme paints Canvas white. The layer icons are
  // tinted with an inline colour, and forced colors preserves the parent
  // colour on SVG, so yellow and cyan strokes used to disappear entirely.
  await page.emulateMedia({ forcedColors: 'active', colorScheme: 'light' });

  const icons = await page.locator('#quickToolbar .qt-btn svg').evaluateAll(elements => elements.map(el => {
    const style = getComputedStyle(el);
    return { stroke: style.stroke, opacity: style.opacity };
  }));
  expect(icons.length).toBeGreaterThan(6);

  // Nothing may render at partial alpha in forced colors.
  expect([...new Set(icons.map(icon => icon.opacity))]).toEqual(['1']);

  // Six authored tints must collapse onto the system palette, so the whole
  // toolbar can only show the system text colour and the active highlight.
  const strokes = [...new Set(icons.map(icon => icon.stroke))];
  expect(strokes.length).toBeLessThanOrEqual(2);
});

test('the quick toolbar stays identifiable when its labels collapse', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#dataStatusText')).toHaveText('HRRR: current');

  const buttons = page.locator('#quickToolbar .qt-btn');
  const count = await buttons.count();
  expect(count).toBeGreaterThan(6);

  const shapes = new Set();
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    // The visible label is hidden below 768px, so the name has to survive on
    // its own and the icon has to carry the identity.
    await expect(button.locator('.qt-label')).toBeHidden();
    const name = await button.getAttribute('aria-label');
    expect(name?.trim()).toBeTruthy();
    const icon = button.locator('svg').first();
    await expect(icon).toBeVisible();
    shapes.add(await icon.innerHTML());
  }
  expect(shapes.size).toBe(count);
});

test('custom switches and dialogs support keyboard state and focus return', async ({ page }) => {
  await page.goto('/');
  const opener = page.locator('#settingsBtn');
  await opener.focus();
  await opener.press('Enter');

  const panel = page.locator('#settingsPanel');
  await expect(panel).toHaveAttribute('aria-hidden', 'false');
  await expect(panel.locator(':focus')).toHaveCount(1);
  await expect(page.locator('#map')).toHaveAttribute('inert', '');
  await expect(page.locator('.header')).toHaveAttribute('inert', '');

  const themeSwitch = page.locator('#themeToggle');
  await themeSwitch.focus();
  const initialState = await themeSwitch.getAttribute('aria-checked');
  await themeSwitch.press('Space');
  await expect(themeSwitch).not.toHaveAttribute('aria-checked', initialState);

  const displayTab = page.locator('#settingsTabDisplay');
  await displayTab.focus();
  await displayTab.press('ArrowRight');
  await expect(page.locator('#settingsTabRadar')).toBeFocused();
  await expect(page.locator('#settingsTabRadar')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#settingsPanelRadar')).not.toHaveAttribute('hidden', '');
  await expect(page.locator('#settingsPanelDisplay')).toHaveAttribute('hidden', '');

  await page.keyboard.press('Escape');
  await expect(panel).toHaveAttribute('aria-hidden', 'true');
  await expect(opener).toBeFocused();
  await expect(page.locator('#map')).not.toHaveAttribute('inert', '');
  await expect(page.locator('.header')).not.toHaveAttribute('inert', '');
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

test('the named map opens a point forecast from its keyboard shortcut', async ({ page }) => {
  await page.route('https://api.open-meteo.com/v1/forecast**', route => route.fulfill({
    json: {
      timezone: 'UTC',
      current: {
        temperature_2m: 70,
        apparent_temperature: 70,
        relative_humidity_2m: 50,
        weather_code: 0,
        wind_speed_10m: 5,
        wind_direction_10m: 180,
        wind_gusts_10m: 8,
        surface_pressure: 1012,
        precipitation: 0,
        is_day: 1
      },
      hourly: {
        time: ['2026-07-25T21:00'],
        temperature_2m: [70],
        weather_code: [0],
        precipitation_probability: [0],
        is_day: [1]
      },
      daily: {
        time: ['2026-07-25'],
        weather_code: [0],
        temperature_2m_max: [75],
        temperature_2m_min: [60],
        precipitation_probability_max: [0],
        wind_speed_10m_max: [8]
      }
    }
  }));
  await page.route('https://api.weather.gov/points/**', route => route.fulfill({
    json: { properties: { relativeLocation: { properties: { city: 'Map Center', state: 'TS' } } } }
  }));
  await page.route('https://api.weather.gov/alerts/active?point=**', route => route.fulfill({
    json: { type: 'FeatureCollection', features: [] }
  }));
  await page.goto('/');

  const map = page.getByRole('region', { name: /Interactive weather map/ });
  await expect(map).toHaveAttribute('aria-keyshortcuts', 'F');
  await map.focus();
  await map.press('f');
  await expect(page.locator('#fcPanel')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#fcLocation')).toHaveText('Map Center, TS');
  await expect(map).toHaveAttribute('inert', '');

  await page.locator('#fcClose').click();
  await expect(page.locator('#fcPanel')).toHaveAttribute('aria-hidden', 'true');
  await expect(map).toBeFocused();
  await expect(map).not.toHaveAttribute('inert', '');
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
  await expect(page.locator('#sheetClose')).toBeVisible();
  await expect(page.locator('#map')).toHaveAttribute('inert', '');
  await expect(page.locator('#mobileFab')).toHaveCSS('border-style', 'solid');

  const layersTab = page.locator('#sheetTabLayers');
  await layersTab.focus();
  await layersTab.press('ArrowRight');
  await expect(page.locator('#sheetTabSources')).toBeFocused();
  await expect(page.locator('#sheetTabSources')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#mobileSourcesTab')).not.toHaveAttribute('hidden', '');
  await expect(page.locator('#mobileLayersTab')).toHaveAttribute('hidden', '');

  const targetSizes = await page.locator(
    'button:visible, [role="button"]:visible, [role="switch"]:visible, [role="checkbox"]:visible, [role="radio"]:visible, [role="tab"]:visible'
  ).evaluateAll(elements => elements.map(element => {
    const bounds = element.getBoundingClientRect();
    return { label: element.getAttribute('aria-label') || element.textContent.trim(), width: bounds.width, height: bounds.height };
  }));
  expect(targetSizes.filter(target => target.width < 24 || target.height < 24)).toEqual([]);
  const primaryMobileTargets = await page.locator(
    '#bookmarksBtn, #themeBtn, #settingsBtn, #mobileFab, #locBtn, #centerForecastBtn, .ctrl-btn, .play-btn, #speedBtn, #sheetClose, .sheet-tab'
  ).evaluateAll(elements => elements.filter(element => element.getClientRects().length).map(element => {
    const bounds = element.getBoundingClientRect();
    return { id: element.id || element.textContent.trim(), width: bounds.width, height: bounds.height };
  }));
  expect(primaryMobileTargets.filter(target => target.width < 44 || target.height < 44)).toEqual([]);

  await page.locator('#sheetClose').click();
  await expect(sheet).toHaveAttribute('aria-hidden', 'true');
  await expect(opener).toBeFocused();
  await expect(page.locator('#map')).not.toHaveAttribute('inert', '');

  await opener.click();
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveAttribute('aria-hidden', 'true');
  await expect(opener).toBeFocused();
});

test('narrow layouts keep saved locations onscreen and synchronize duplicate controls', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_bookmarks', JSON.stringify([
      { id: 1, name: 'Wichita, Kansas', lat: 37.6872, lng: -97.3301 }
    ]));
  });
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/USCOMP/n0q_0.json', route => route.fulfill({
    json: { meta: { valid: '2026-07-25T20:55:00Z', product: 'N0Q' } }
  }));

  const assertNoHorizontalOverflow = async width => {
    expect(await page.evaluate(() => ({
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      bodyOverflow: document.body.scrollWidth - document.body.clientWidth
    }))).toEqual({ documentOverflow: 0, bodyOverflow: 0 });
    const panelBounds = await page.locator('#bookmarksPanel').boundingBox();
    expect(panelBounds).not.toBeNull();
    expect(panelBounds.x).toBeGreaterThanOrEqual(0);
    expect(panelBounds.x + panelBounds.width).toBeLessThanOrEqual(width);
  };
  const assertRadioGroupState = async (selector, selectedValue, dataName) => {
    const states = await page.locator(selector).evaluateAll((elements, { selectedValue: value, dataName: name }) =>
      elements.map(element => ({
        value: element.dataset[name],
        active: element.classList.contains('active'),
        checked: element.getAttribute('aria-checked')
      })), { selectedValue, dataName });
    expect(states.length).toBeGreaterThan(1);
    expect(states.every(state =>
      state.active === (state.value === selectedValue)
      && state.checked === String(state.value === selectedValue)
    )).toBe(true);
  };
  const assertLayerState = async (layer, active) => {
    const states = await page.locator(`[data-layer="${layer}"], [data-qt="${layer}"]`).evaluateAll(elements =>
      elements.map(element => ({
        active: element.classList.contains('active'),
        checked: element.getAttribute('aria-checked')
      })));
    expect(states.length).toBeGreaterThan(1);
    expect(states.every(state => state.active === active && state.checked === String(active))).toBe(true);
  };

  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  await expect(page.locator('#dataStatusText')).toHaveText('HRRR: current');
  await page.locator('#bookmarksBtn').click();
  await expect(page.locator('#bookmarksPanel')).toHaveClass(/open/);
  await assertNoHorizontalOverflow(320);
  await expect(page.locator('.bm-item-name')).toHaveText('Wichita, Kansas');
  await page.locator('#bookmarksBtn').click();

  await page.locator('#quickToolbar [data-qt="radar"]').evaluate(element => element.click());
  await assertLayerState('radar', false);
  await page.locator('#mobileFab').click();
  await page.locator('#mobileContent [data-layer="radar"]').click();
  await assertLayerState('radar', true);

  await page.locator('[data-sheet-tab="sources"]').click();
  await page.locator('#mobileContent [data-source="mrms"]').click();
  await expect(page.locator('#dataStatusText')).toHaveText('MRMS: current');
  await assertRadioGroupState('.source-tab[data-source]', 'mrms', 'source');
  await page.locator('#mobileContent [data-product="velocity"]').click();
  await expect(page.locator('#dataStatusText')).toHaveText('MRMS: current');
  await assertRadioGroupState('.layer-chip[data-product]', 'velocity', 'product');

  await page.locator('[data-sheet-tab="map"]').click();
  await page.locator('#mobileContent [data-basemap="light"]').click();
  await assertRadioGroupState('.basemap-btn[data-basemap]', 'light', 'basemap');

  await page.locator('.sidebar [data-layer="radar"]').evaluate(element => element.click());
  await assertLayerState('radar', false);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#sheetClose').click();
  await page.locator('#bookmarksBtn').click();
  await assertNoHorizontalOverflow(390);
});
