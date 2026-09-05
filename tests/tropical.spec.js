import { expect, test } from '@playwright/test';

// AT1 starts at layer 4 and every storm slot occupies 26 ids, so EP3 (the
// eighth slot) starts at 186 and its forecast points, track, cone, and
// watch/warning layers are 188, 189, 190, and 191.
const EP3_ROOT = 186;
const EP3_POINTS = 188;
const EP3_TRACK = 189;
const AT1_POINTS = 6;

function countResponse(count) {
  return { contentType: 'application/json', body: JSON.stringify({ count }) };
}

function emptyCollection() {
  return {
    contentType: 'application/geo+json',
    body: JSON.stringify({ type: 'FeatureCollection', features: [] })
  };
}

test('tropical overlay draws East Pacific storms and skips empty basins', async ({ page }) => {
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
          tropical: false
        }
      }
    }));
    localStorage.setItem('stormview_welcomed', '1');
  });

  const requestedLayers = [];
  await page.route('https://mapservices.weather.noaa.gov/tropical/**', route => {
    const url = new URL(route.request().url());
    const layerId = Number(url.pathname.split('/').at(-2));
    requestedLayers.push(layerId);

    if (url.searchParams.get('returnCountOnly') === 'true') {
      return route.fulfill(countResponse(layerId === EP3_POINTS ? 2 : 0));
    }

    if (layerId === EP3_POINTS) {
      return route.fulfill({
        contentType: 'application/geo+json',
        body: JSON.stringify({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: { STORMNAME: 'Hurricane Marie', STORMTYPE: 'HU', MAXWIND: '85' },
            geometry: { type: 'Point', coordinates: [-119, 20.8] }
          }]
        })
      });
    }

    if (layerId === EP3_TRACK) {
      return route.fulfill({
        contentType: 'application/geo+json',
        body: JSON.stringify({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: { STORMNAME: 'Hurricane Marie' },
            geometry: { type: 'LineString', coordinates: [[-119, 20.8], [-121, 22.4]] }
          }]
        })
      });
    }

    return route.fulfill(emptyCollection());
  });

  await page.goto('/');
  await page.locator('.sidebar [data-layer="tropical"]').evaluate(element => element.click());

  await expect(page.locator('.sidebar [data-layer="tropical"]')).toHaveAttribute('data-feature-count', '2');

  // Every basin is probed, but only the slot holding a storm is drawn in full.
  await expect.poll(() => requestedLayers.filter(id => id === AT1_POINTS).length).toBe(1);
  expect(requestedLayers).toContain(EP3_POINTS);
  expect(requestedLayers).toContain(EP3_TRACK);
  // A slot with no forecast points never issues its geometry queries.
  expect(requestedLayers).not.toContain(AT1_POINTS + 1);
  // The active slot's root is a group layer and must never be queried, so
  // assert against EP3's root rather than a slot that is skipped anyway.
  expect(requestedLayers).not.toContain(EP3_ROOT);
  expect(requestedLayers).not.toContain(EP3_ROOT + 1);
});
