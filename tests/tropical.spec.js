import { expect, test } from '@playwright/test';

const SERVICE = 'https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather/MapServer';
const SLOTS = [
  'AT1', 'AT2', 'AT3', 'AT4', 'AT5',
  'EP1', 'EP2', 'EP3', 'EP4', 'EP5',
  'CP1', 'CP2', 'CP3', 'CP4', 'CP5'
];
const PRODUCTS = ['Forecast Points', 'Forecast Track', 'Forecast Cone', 'Watch-Warning'];
const OUTLOOK = ['Seven-Day: Current Location', 'Seven-Day: Potential Development Region'];

// Mirrors the live service: ids are deliberately shuffled and the outlook
// layers sit at the front under a group parent, so nothing here rewards code
// that computes ids arithmetically instead of resolving them by name.
function serviceDescription() {
  const layers = [
    { id: 900, name: 'Seven-Day Outlook', subLayerIds: [2, 3] },
    { id: 2, name: OUTLOOK[0], subLayerIds: null },
    { id: 3, name: OUTLOOK[1], subLayerIds: null }
  ];
  let nextId = 500;
  // A group layer whose name shadows a product layer, declared after it. The
  // service already publishes group layers named "<slot> Forecast Information",
  // so a rename that collides is a live hazard: without the subLayerIds guard
  // the group's id wins the lookup and the query comes back as an error body.
  const shadow = { id: 990, name: `EP3 ${PRODUCTS[2]}`, subLayerIds: [991, 992] };
  for (const slot of SLOTS) {
    layers.push({ id: nextId, name: slot, subLayerIds: [] });
    layers[layers.length - 1].subLayerIds = [];
    const rootId = nextId;
    nextId += 1;
    const children = [];
    for (const product of PRODUCTS) {
      layers.push({ id: nextId, name: `${slot} ${product}`, subLayerIds: null });
      children.push(nextId);
      nextId += 1;
    }
    layers.find(layer => layer.id === rootId).subLayerIds = children;
  }
  layers.push(shadow);
  return { layers };
}

function layerIdFor(name) {
  return serviceDescription().layers.find(layer => layer.name === name && !(Array.isArray(layer.subLayerIds) && layer.subLayerIds.length > 0)).id;
}

function collection(features) {
  return {
    contentType: 'application/geo+json',
    body: JSON.stringify({ type: 'FeatureCollection', features })
  };
}

function pointFeature(name) {
  return {
    type: 'Feature',
    properties: { STORMNAME: name, STORMTYPE: 'HU', MAXWIND: '85' },
    geometry: { type: 'Point', coordinates: [-119, 20.8] }
  };
}

function polygonFeature() {
  return {
    type: 'Feature',
    properties: { Basin: 'Pacific', 'Seven-Day Probability Forecast': '60%' },
    geometry: { type: 'Polygon', coordinates: [[[-125, 15], [-115, 15], [-115, 25], [-125, 25], [-125, 15]]] }
  };
}

// Slots that hold a storm in the fixture. One East Pacific and one Central
// Pacific, so dropping either basin from the implementation fails the test.
const STORM_SLOTS = { EP3: 'Hurricane Marie', CP4: 'Hurricane Kiko' };

async function routeService(page, requested) {
  await page.route('https://mapservices.weather.noaa.gov/tropical/**', route => {
    const url = new URL(route.request().url());

    if (url.pathname.endsWith('/MapServer')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(serviceDescription()) });
    }

    const layerId = Number(url.pathname.split('/').at(-2));
    const layer = serviceDescription().layers.find(entry => entry.id === layerId);
    requested.push({ id: layerId, name: layer?.name ?? null, count: url.searchParams.get('returnCountOnly') === 'true' });

    // A group layer answers a query with an error body, never features.
    if (!layer || (Array.isArray(layer.subLayerIds) && layer.subLayerIds.length > 0)) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ error: { code: 400, message: 'Invalid or missing input parameters.' } }) });
    }

    const storm = Object.keys(STORM_SLOTS).find(slot => layer.name.startsWith(`${slot} `));
    if (url.searchParams.get('returnCountOnly') === 'true') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ count: storm ? 3 : 0 }) });
    }
    if (storm) return route.fulfill(collection([pointFeature(STORM_SLOTS[storm])]));
    if (layer.name === OUTLOOK[1]) return route.fulfill(collection([polygonFeature()]));
    return route.fulfill(collection([]));
  });
}

async function openTropical(page) {
  await page.addInitScript(() => {
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 4,
      settings: {
        source: 'hrrr',
        autoRefresh: false,
        layers: {
          radar: false, alerts: false, spcOutlook: false,
          states: false, counties: false, labels: false, tropical: false
        }
      }
    }));
    localStorage.setItem('stormview_welcomed', '1');
  });
  await page.goto('/');
  await page.locator('.sidebar [data-layer="tropical"]').evaluate(element => element.click());
}

test('every basin with a storm is drawn, and empty basins cost one probe', async ({ page }) => {
  const requested = [];
  await routeService(page, requested);
  await openTropical(page);

  // The fixture answers each of a storm slot's four products with one feature,
  // and adds the outlook polygon: 2 slots * 4 products + 1.
  const expectedFeatures = Object.keys(STORM_SLOTS).length * PRODUCTS.length + 1;
  await expect(page.locator('.sidebar [data-layer="tropical"]')).toHaveAttribute('data-feature-count', String(expectedFeatures));

  const names = requested.map(entry => entry.name);

  // Every slot in every basin is probed, including the Central Pacific.
  for (const slot of SLOTS) {
    expect(requested.filter(entry => entry.name === `${slot} ${PRODUCTS[0]}` && entry.count)).toHaveLength(1);
  }

  // Each storm slot fetches all four of its products.
  for (const slot of Object.keys(STORM_SLOTS)) {
    for (const product of PRODUCTS) {
      expect(names).toContain(`${slot} ${product}`);
    }
  }

  // A slot with no forecast point never issues a geometry query.
  const quiet = requested.filter(entry => entry.name === 'AT1 Forecast Track');
  expect(quiet).toHaveLength(0);

  // Group layers are never queried.
  for (const slot of SLOTS) expect(names).not.toContain(slot);
  expect(names).not.toContain('Seven-Day Outlook');
});

test('the seven-day outlook is drawn even when no basin holds a storm', async ({ page }) => {
  const requested = [];
  await page.route('https://mapservices.weather.noaa.gov/tropical/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/MapServer')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(serviceDescription()) });
    }
    const layerId = Number(url.pathname.split('/').at(-2));
    const layer = serviceDescription().layers.find(entry => entry.id === layerId);
    requested.push(layer?.name ?? null);
    if (url.searchParams.get('returnCountOnly') === 'true') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ count: 0 }) });
    }
    if (layer?.name === OUTLOOK[1]) return route.fulfill(collection([polygonFeature()]));
    return route.fulfill(collection([]));
  });
  await openTropical(page);

  await expect(page.locator('.sidebar [data-layer="tropical"]')).toHaveAttribute('data-feature-count', '1');
  expect(requested).toContain(OUTLOOK[0]);
  expect(requested).toContain(OUTLOOK[1]);
});

test('a failed probe is reported instead of reading as an empty basin', async ({ page }) => {
  await page.route('https://mapservices.weather.noaa.gov/tropical/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/MapServer')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(serviceDescription()) });
    }
    const layerId = Number(url.pathname.split('/').at(-2));
    if (layerId === layerIdFor(`EP3 ${PRODUCTS[0]}`)) {
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'upstream failure' }) });
    }
    if (url.searchParams.get('returnCountOnly') === 'true') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ count: 0 }) });
    }
    return route.fulfill(collection([]));
  });
  await openTropical(page);

  await expect(page.locator('#tileStatusText')).toContainText('Tropical data incomplete');
});
