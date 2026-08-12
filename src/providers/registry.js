const RADAR_DEFINITIONS = Object.freeze({
  hrrr: {
    label: 'HRRR',
    products: ['reflectivity'],
    note: 'Analysis plus hourly forecast guidance through +18 hours.',
    animation: true,
    coverage: { label: 'CONUS', bounds: [-125, 24, -66, 50] },
    attribution: 'Iowa Environmental Mesonet'
  },
  rainviewer: {
    label: 'RainViewer',
    products: ['reflectivity'],
    note: 'Past radar only: approximately 2 hours, Universal Blue palette, native zoom 7.',
    animation: true,
    coverage: { label: 'Global' },
    attribution: 'RainViewer'
  },
  mrms: {
    label: 'MRMS',
    products: ['reflectivity', 'velocity', 'echoTops', 'precipAccum'],
    note: 'Latest US radar products from Iowa Environmental Mesonet.',
    animation: false,
    coverage: { label: 'CONUS', bounds: [-125, 24, -66, 50] },
    attribution: 'NOAA MRMS / Iowa Environmental Mesonet'
  },
  nowcoast: {
    label: 'NOAA WMS',
    products: ['reflectivity'],
    note: 'Latest NOAA nowCOAST CONUS radar mosaic; single frame.',
    animation: false,
    coverage: { label: 'CONUS', bounds: [-125, 24, -66, 50] },
    attribution: 'NOAA nowCOAST'
  },
  level2: {
    label: 'NEXRAD Level II',
    products: ['reflectivity', 'velocity', 'differentialReflectivity', 'correlationCoefficient'],
    note: 'Latest native single-site base data from the NOAA/Unidata AWS archive.',
    animation: false,
    coverage: { label: 'selected radar range' },
    attribution: 'NOAA / NSF Unidata'
  }
});

const OVERLAY_DEFINITIONS = Object.freeze({
  radar: ['Radar', 'radar', 'provider'],
  couplets: ['Rotation candidates', 'analysis', 'selected radar range'],
  alerts: ['NWS alerts', 'hazards', 'United States'],
  spcOutlook: ['SPC outlook', 'hazards', 'CONUS'],
  stormReports: ['Storm reports', 'observations', 'United States'],
  stormTracks: ['Storm tracks', 'analysis', 'current map view'],
  hailMesh: ['MRMS MESH', 'analysis', 'CONUS'],
  lightning: ['Lightning', 'observations', 'CONUS'],
  satellite: ['Visible satellite', 'imagery', 'GOES-East coverage'],
  satelliteIR: ['Infrared satellite', 'imagery', 'GOES-East coverage'],
  satelliteWV: ['Water vapor satellite', 'imagery', 'GOES-East coverage'],
  satelliteGeoColor: ['GeoColor satellite', 'imagery', 'GOES-East coverage'],
  satelliteSandwich: ['IR sandwich satellite', 'imagery', 'GOES-East coverage'],
  satelliteMesoscale: ['Mesoscale satellite', 'imagery', 'active GOES-East sectors'],
  riverGauges: ['River gauges', 'observations', 'current map view'],
  surfaceObs: ['Surface observations', 'observations', 'CONUS'],
  spcWatches: ['SPC watches', 'hazards', 'United States'],
  spcMCD: ['SPC discussions', 'hazards', 'CONUS'],
  spcTornado: ['SPC tornado probability', 'hazards', 'CONUS'],
  spcWind: ['SPC wind probability', 'hazards', 'CONUS'],
  spcHail: ['SPC hail probability', 'hazards', 'CONUS'],
  tropical: ['Tropical systems', 'hazards', 'Atlantic and eastern Pacific'],
  sigmets: ['Aviation hazards', 'hazards', 'United States'],
  temp: ['Temperature', 'weather', 'current map view'],
  wind: ['Wind', 'weather', 'current map view'],
  clouds: ['Clouds', 'weather', 'current map view'],
  pressure: ['Pressure', 'weather', 'current map view'],
  states: ['State boundaries', 'boundaries', 'United States'],
  counties: ['County boundaries', 'boundaries', 'United States'],
  labels: ['Map labels', 'reference', 'provider coverage'],
  highways: ['Iowa road events', 'hazards', 'Iowa only'],
  geofences: ['Local geofences', 'local', 'browser profile']
});

export const RADAR_CAPABILITIES = RADAR_DEFINITIONS;
export const OVERLAY_PROVIDER_IDS = Object.freeze(Object.keys(OVERLAY_DEFINITIONS));

function lifecycleRecord(id, kind, definition, adapter, runtime) {
  if (!adapter?.load || !adapter?.dispose) throw new Error(`Provider ${id} is missing load/dispose lifecycle methods`);
  return Object.freeze({
    id,
    kind,
    capabilities: kind === 'radar'
      ? Object.freeze({ products: definition.products, animation: definition.animation })
      : Object.freeze({ category: definition[1] }),
    coverage: definition.coverage || Object.freeze({ label: definition[2] }),
    attribution: definition.attribution || adapter.attribution || 'See map data credits',
    load: adapter.load,
    cancel: adapter.cancel || (() => runtime.cancel(id)),
    status: adapter.status || (() => runtime.status(id)),
    dispose: adapter.dispose
  });
}

export function createProviderRegistry({ radar, overlays, cancel, status }) {
  const runtime = { cancel, status };
  const radarProviders = new Map(Object.entries(RADAR_DEFINITIONS).map(([id, definition]) => [
    id,
    lifecycleRecord(id, 'radar', definition, radar[id], runtime)
  ]));
  const overlayProviders = new Map(Object.entries(OVERLAY_DEFINITIONS).map(([id, definition]) => [
    id,
    lifecycleRecord(id, 'overlay', definition, overlays[id], runtime)
  ]));

  return Object.freeze({
    radar(id) {
      const provider = radarProviders.get(id);
      if (!provider) throw new Error(`Unknown radar provider: ${id}`);
      return provider;
    },
    overlay(id) {
      const provider = overlayProviders.get(id);
      if (!provider) throw new Error(`Unknown overlay provider: ${id}`);
      return provider;
    },
    setOverlayEnabled(id, enabled) {
      const provider = this.overlay(id);
      return enabled ? provider.load() : provider.dispose();
    },
    list(kind) {
      return [...(kind === 'radar' ? radarProviders : overlayProviders).values()];
    }
  });
}
