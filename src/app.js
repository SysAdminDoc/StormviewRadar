import { createProviderRegistry, RADAR_CAPABILITIES } from './providers/registry.js';
    import { createMessageFormatter } from './i18n.js';
    import { effectivePreloadWindow, frameWindowIndices, normalizePreloadWindow } from './frame-preload.js';
    import { overviewFromMapView } from './picture-in-picture.js';
    import { COMPARISON_PRODUCTS, DEFAULT_COMPARISON_LOCATION, mrmsProductTileKey, normalizeComparisonLocation, normalizeComparisonProduct, normalizeLocationResults, shortLocationName } from './split-view.js';
    import { alertPaletteDash, meshPaletteStops, normalizeVisualPalette, stormPaletteColor, visualPaletteLabel } from './visual-palette.js';
    import { applyLayerOpacity, normalizeLayerOpacities } from './layer-opacity.js';
    import { LOCAL_OVERLAY_LIMITS, parseLocalOverlay } from './local-overlay.js';
    import { buildIowa511Query, normalizeIowa511Events } from './road-events.js';
    import { captureLeafletSnapshot, renderLeafletSnapshot, snapshotFilename } from './map-snapshot.js';
    import { applyEmbedConfiguration, parseEmbedConfig } from './embed-mode.js';
    import { cardinalDirection, normalizeChasePosition, orientationHeading, smoothHeading } from './chasecaster.js';
    import { getTrainingScenario, trainingFeatureCollection, trainingScenarioCatalog } from './training-overlays.js';
    import { normalizeOfflineAvailability, normalizeStoragePersistence, shouldOfferInstall, storagePersistenceLabel } from './pwa-install.js';
    import { animationDimensions, animationFilename, encodeAnimatedGif, recordCanvasMp4, rgbaToGifIndices, sampledFrameIndices, supportedMp4MimeType } from './animation-export.js';
    import { buildRadarHistoryFrames, radarHistoryHours, radarHistoryTickIndices } from './radar-history.js';
    import { buildGeometRadarFrames, GEOMET_RADAR_ENDPOINT, GEOMET_RADAR_LAYER, GEOMET_RADAR_STYLE, geometCapabilitiesUrl } from './geomet-radar.js';
    import { IndexedDbTileCache, isCacheableTileUrl, tileCacheMaxAge } from './tile-cache.js';
    import { WebGLTileRenderer } from './webgl-tile-renderer.js';

    (function() {
        'use strict';

        const embedConfig = parseEmbedConfig(window.location.search);

        // ==================== CONFIGURATION ====================
        const OSM_CARTO_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
        const IEM_ATTRIBUTION = '<a href="https://mesonet.agron.iastate.edu/">Iowa Environmental Mesonet</a>';
        const NOAA_MRMS_ATTRIBUTION = '<a href="https://registry.opendata.aws/noaa-mrms-pds/">NOAA MRMS</a>';
        const MRMS_MESH_BUCKET = 'https://noaa-mrms-pds.s3.amazonaws.com/';
        const MRMS_MESH_PREFIX = 'CONUS/MESH_00.50/';
        const BASEMAPS = {
            dark: {
                url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                attribution: OSM_CARTO_ATTRIBUTION,
                subdomains: 'abcd'
            },
            light: {
                url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                attribution: OSM_CARTO_ATTRIBUTION,
                subdomains: 'abcd'
            },
            satellite: {
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a> and imagery providers'
            },
            terrain: {
                url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
                attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors; style &copy; <a href="https://opentopomap.org/">OpenTopoMap</a>',
                subdomains: 'abc'
            },
            clean: {
                url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
                attribution: OSM_CARTO_ATTRIBUTION,
                subdomains: 'abcd'
            }
        };

        const DATA_URLS = {
            // Boundaries
            states: 'vendor/us-atlas/states-10m.json',
            counties: 'vendor/us-atlas/counties-10m.json',
            
            // NWS Alerts
            nwsAlerts: 'https://api.weather.gov/alerts/active?status=actual',
            iemStormBasedWarnings: 'https://mesonet.agron.iastate.edu/geojson/sbw.geojson',
            
            // SPC Products - Categorical Outlooks
            spcOutlookDay1: 'https://www.spc.noaa.gov/products/outlook/day1otlk_cat.nolyr.geojson',
            spcOutlookDay2: 'https://www.spc.noaa.gov/products/outlook/day2otlk_cat.nolyr.geojson',
            spcOutlookDay3: 'https://www.spc.noaa.gov/products/outlook/day3otlk_cat.nolyr.geojson',
            
            // SPC Products - Probabilistic (Day 1)
            spcTornado: 'https://www.spc.noaa.gov/products/outlook/day1otlk_torn.nolyr.geojson',
            spcWind: 'https://www.spc.noaa.gov/products/outlook/day1otlk_wind.nolyr.geojson',
            spcHail: 'https://www.spc.noaa.gov/products/outlook/day1otlk_hail.nolyr.geojson',
            
            // SPC Products - Significant
            spcSigTornado: 'https://www.spc.noaa.gov/products/outlook/day1otlk_sigtorn.nolyr.geojson',
            spcSigWind: 'https://www.spc.noaa.gov/products/outlook/day1otlk_sigwind.nolyr.geojson',
            spcSigHail: 'https://www.spc.noaa.gov/products/outlook/day1otlk_sighail.nolyr.geojson',
            
            // SPC watches and official Mesoscale Discussion feed
            spcWatches: 'https://api.weather.gov/alerts/active?event=Tornado%20Watch,Severe%20Thunderstorm%20Watch',
            spcMCD: 'https://www.spc.noaa.gov/products/spcmdrss.xml',
            
            // Storm Reports
            iemLSR: 'https://mesonet.agron.iastate.edu/geojson/lsr.geojson?recent=86400',
            iemStormAttributes: 'https://mesonet.agron.iastate.edu/geojson/nexrad_attr.py',
            
            // Surface Observations
            surfaceObs: 'https://mesonet.agron.iastate.edu/geojson/network/AWOS.geojson',
            surfaceObsASOS: 'https://mesonet.agron.iastate.edu/geojson/network/ASOS.geojson',
            
            // River Gauges
            usgsGauges: 'https://waterservices.usgs.gov/nwis/iv/?format=json&bBox=-130,24,-65,50&parameterCd=00065&siteStatus=active',
            
            // HRRR Model Metadata
            hrrrLatest: 'https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json',
            mrmsLatest: 'https://mesonet.agron.iastate.edu/data/gis/images/4326/USCOMP/n0q_0.json',
            nowcoastCapabilities: 'https://nowcoast.noaa.gov/geoserver/observations/weather_radar/ows?service=WMS&version=1.3.0&request=GetCapabilities',
            geometCapabilities: geometCapabilitiesUrl('en'),
            nexradSites: 'https://mesonet.agron.iastate.edu/geojson/network/NEXRAD.geojson',
            radarStations: 'https://api.weather.gov/radar/stations?stationType=WSR-88D',
            
            // Browser-safe aviation hazards. AviationWeather PIREPs forbid CORS.
            sigmets: 'https://api.weather.gov/alerts/active?event=SIGMET,Convective%20SIGMET,AIRMET'
        };
        
        // HRRR Radar Tile URLs
        const HRRR_TILES = {
            // REFD = standard reflectivity, REFP = precip type colors
            refd: (mins, init) => `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/hrrr::REFD-F${String(mins).padStart(4,'0')}-${init}/{z}/{x}/{y}.png`,
            refp: (mins, init) => `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/hrrr::REFP-F${String(mins).padStart(4,'0')}-${init}/{z}/{x}/{y}.png`,
        };
        
        // Additional Radar Products (Iowa State)
        const RADAR_PRODUCTS = {
            n0q: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png',      // Base reflectivity HD
            n0r: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0r-900913/{z}/{x}/{y}.png',      // Base reflectivity
            n0v: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0v-900913/{z}/{x}/{y}.png',      // Base velocity
            n0s: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0s-900913/{z}/{x}/{y}.png',      // Storm relative velocity
            net: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-net-900913/{z}/{x}/{y}.png',      // Echo tops
            n1p: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n1p-900913/{z}/{x}/{y}.png',      // 1-hr precip
            ntp: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-ntp-900913/{z}/{x}/{y}.png',      // Storm total precip
        };
        
        // Satellite WMS Layers (NowCOAST)
        const SATELLITE_LAYERS = {
            visible: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes_east_conus_ch02/{z}/{x}/{y}.png',
            ir: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes_east_conus_ch13/{z}/{x}/{y}.png',
            waterVapor: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes_east_conus_ch09/{z}/{x}/{y}.png',
            geoColor: 'https://satellitemaps.nesdis.noaa.gov/arcgis/rest/services/MERGEDGC_current/ImageServer/tile/{z}/{y}/{x}',
            enhancedIR: 'https://satellitemaps.nesdis.noaa.gov/arcgis/rest/services/ABI13_current/ImageServer/tile/{z}/{y}/{x}',
            mesoscale1: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes_east_mesoscale-1_ch02/{z}/{x}/{y}.png',
            mesoscale2: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes_east_mesoscale-2_ch02/{z}/{x}/{y}.png'
        };
        
        // NHC tropical cyclones. One service carries every basin: storm slots
        // AT1-AT5, EP1-EP5, and CP1-CP5 each occupy 26 consecutive layer ids
        // starting at 4. A slot's root id is a group layer that answers a
        // query with an error object rather than features, so only the four
        // drawable offsets below are ever requested.
        const NHC_TROPICAL_SERVICE = 'https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather/MapServer';
        const NHC_SLOT_IDS = [
            'AT1', 'AT2', 'AT3', 'AT4', 'AT5',
            'EP1', 'EP2', 'EP3', 'EP4', 'EP5',
            'CP1', 'CP2', 'CP3', 'CP4', 'CP5'
        ];
        // Per-storm products, in draw order. The first is also the layer
        // probed to decide whether a slot holds a storm at all.
        const NHC_SLOT_PRODUCTS = ['Forecast Points', 'Forecast Track', 'Forecast Cone', 'Watch-Warning'];
        // Basin-agnostic outlook layers, drawn whether or not a numbered
        // storm exists. These carry the seven-day development areas.
        const NHC_OUTLOOK_LAYERS = ['Seven-Day: Current Location', 'Seven-Day: Potential Development Region'];

        // ==================== STATE ====================
        let map, baseLayer, locationMarker;
        let chasecasterActive = false;
        let chasecasterWatchId = null;
        let chasecasterMarker = null;
        let chasecasterAccuracyCircle = null;
        let chasecasterPosition = null;
        let chasecasterHeading = null;
        let chasecasterFollowing = true;
        let chasecasterCompassState = 'waiting';
        let chasecasterCompassTimer = null;
        let chasecasterSuspendedViews = null;
        let trainingScenario = null;
        let trainingLayer = null;
        let trainingReturnView = null;
        let trainingSuspendedViews = null;
        let deferredInstallPrompt = null;
        let offlineInstallAvailability = { shell: false, radarFrame: false, radarEntries: 0, ready: false };
        let storagePersistence = 'unknown';
        let offlineFrameMarkPending = false;
        let initialLoadComplete = false;
        let animationExportController = null;
        let compareMap = null;
        let compareBaseLayer = null;
        let compareRadarLayer = null;
        let compareAlertLayer = null;
        let compareRadarSignature = '';
        let compareSearchTimeout = null;
        let compareSearchAbortController = null;
        let compareAlertGeneration = 0;
        let primaryLocationName = '';
        let pipMap = null;
        let pipBaseLayer = null;
        let pipRadarLayer = null;
        let pipAlertLayer = null;
        let pipRadarSignature = '';
        let pipAlertGeneration = 0;
        let pipFollowPrimary = true;
        let syncingPipView = false;
        let rainviewerData = null;
        let frameLayers = [];
        let framesLoaded = 0;
        let framesTotal = 0;
        let framesReady = false;
        let loadAborted = false;
        let frames = [];
        let currentFrame = 0;
        let lastPastFrame = 0;
        let isPlaying = false;
        let animationId = null;
        let lastFrameTime = 0;
        let frameTransitionPending = false;
        let frameTransitionGeneration = 0;
        let speedMult = 1;
        let searchTimeout = null;
        let roadEventReloadTimeout = null;
        let overlayOpacityApplyFrame = null;
        const pendingOpacityLayers = new Set();
        let searchAbortController = null;
        let nextNominatimRequestAt = 0;
        let lastRefreshTime = null;
        let radarLoadGeneration = 0;
        let radarAbortController = null;
        let activeRadarSource = null;
        let activeRadarProduct = null;
        let retainedRadarState = null;
        let level2Worker = null;
        let level2WorkerSequence = 0;
        let level2LoadedKey = null;
        let level2Sites = [];
        let level2SiteHealth = new Map();
        let level2Tilts = [];
        let level2Integrity = null;
        // The mobile sheet is built with cloneNode, which copies a data-* marker
        // but not the listener, so wiring has to be tracked per element object.
        const wiredSelects = new WeakSet();
        let level2Couplets = [];
        let meshWorker = null;
        let meshWorkerSequence = 0;
        let meshLegendControl = null;
        let meshMaximumMm = 0;
        let alertAgeLegendControl = null;
        let alertFillToolsPromise = null;
        let stormTrackToolsPromise = null;
        let stormTrackHistoryHydrated = false;
        let currentStormCells = [];
        const stormTrackHistory = new Map();
        let stormTop3dToolsPromise = null;
        let cesiumRuntimePromise = null;
        let cesiumViewer = null;
        let stormTop3dMode = false;
        let alertAudioToolsPromise = null;
        let alertSeriesToolsPromise = null;
        let alertAudioContext = null;
        let alertAudioUnlocked = false;
        let alertAudioPrimed = false;
        let currentAlertFeatures = [];
        let mobileAlertBannerToolsPromise = null;
        let mobileAlertBannerSelection = null;
        let stormReportPayload = null;
        let stormReportClusterToolsPromise = null;
        let stormReportRenderGeneration = 0;
        const dismissedMobileAlertIds = new Set();
        let geofences = [];
        const seenAlertIds = new Set();
        const alertZoneGeometryCache = new Map();
        let historicalReplayToolsPromise = null;
        let spcMcdToolsPromise = null;
        let replayAbortController = null;
        let replayMode = false;
        let replayWarnings = [];
        const meshWorkerRequests = new Map();
        const level2WorkerRequests = new Map();
        const REQUEST_TIMEOUT_MS = 15000;
        const LEVEL2_MAX_BYTES = 80 * 1024 * 1024;
        const MESH_MAX_BYTES = 5 * 1024 * 1024;
        const NOMINATIM_CONTACT = 'matt_parker@outlook.com';
        const NOMINATIM_REQUEST_INTERVAL_MS = 1500;
        const MAX_ALERT_FEATURES = 750;
        const MAX_POINT_FEATURES = 500;
        const MAX_RIVER_GAUGES = 250;
        const activeRequests = new Map();
        const layerRequests = new Map();
        const layerRequestGenerations = new Map();
        const MAX_SETTINGS_BYTES = 32768;
        const SETTINGS_SCHEMA_VERSION = 9;
        const SETTINGS_STORAGE_KEY = 'stormview_settings';
        const GEOFENCE_STORAGE_KEY = 'stormview_geofences';
        const MAX_GEOFENCES = 20;
        const LEGACY_SETTINGS_KEYS = ['stormview_pro_v3'];
        const WELCOME_STORAGE_KEY = 'stormview_welcomed';
        const LEGACY_WELCOME_KEYS = ['stormview_welcomed_v5'];
        let activeDialog = null;
        const diagnosticsState = {
            provider: { state: 'loading', message: 'Starting radar provider', updatedAt: null, retryable: false },
            requests: [],
            layerCounts: {},
            layerStates: {},
            performance: {
                startupStartedAt: performance.now(),
                firstUsableFrameMs: null,
                loopCompletedAt: null,
                renderedFrames: 0,
                droppedFrames: 0,
                transferredBytes: 0
            }
        };
        const REDUCED_DATA_OPTIONAL_LAYERS = new Set([
            'stormReports', 'stormTracks', 'hailMesh', 'lightning', 'satellite', 'satelliteIR',
            'satelliteWV', 'satelliteGeoColor', 'satelliteSandwich', 'satelliteMesoscale',
            'riverGauges', 'surfaceObs', 'tropical', 'sigmets', 'highways'
        ]);
        const MESSAGE_CATALOG = {
            en: {
                loading: 'Loading...',
                fetchingForecast: 'Fetching forecast...',
                forecastFailed: 'Failed to load forecast. Try another location.',
                feels: 'Feels',
                humidity: 'Humidity',
                wind: 'Wind',
                gusts: 'Gusts',
                pressure: 'Pressure',
                precip: 'Precip',
                hourlyForecast: 'Hourly Forecast',
                sevenDayForecast: '7-Day Forecast',
                now: 'Now',
                today: 'Today',
                localTime: 'Local Time',
                forecast: 'Forecast',
                analysis: 'Analysis',
                past: 'Past',
                latest: 'Latest',
                noRadarFrame: 'No radar frame',
                languageUpdated: 'Language updated',
                unitsUpdated: 'Units updated',
                preloadFrames_one: '{count} frame each side',
                preloadFrames_other: '{count} frames each side',
                preloadReduced: '±{count} cap',
                preloadReducedAria: '{value} · Reduced Data cap',
                offlineUnavailable: 'Offline · cached data may be unavailable',
                offlineCached: 'Offline · cached {resources}',
                cachedFallback: 'Cached fallback · {resources}',
                offlineRadar: 'radar',
                offlineAlerts: 'alerts',
                offlineShell: 'app shell',
                pwaInstallAria: 'Install StormView Radar',
                pwaInstallTitle: 'Install StormView Radar',
                pwaInstallDescription: 'Offline-ready: the app shell and last radar frame are cached on this device.',
                pwaInstallButton: 'Install',
                pwaInstallDismiss: 'Not now',
                pwaInstallAccepted: 'StormView Radar install request opened',
                pwaInstalled: 'StormView Radar installed',
                pwaInstallFailed: 'The install prompt is unavailable. Use your browser menu to install StormView Radar.',
                providerLoading: '{provider}: loading…',
                providerCurrent: '{provider}: current',
                providerFallback: 'MRMS fallback: {provider} failed',
                providerStale: '{provider}: stale; refresh failed',
                providerUnavailable: '{provider}: unavailable',
                invalidProviderTime: '{provider}: invalid provider time',
                validInMinutes: 'Valid in {value}m',
                validInHours: 'Valid in {value}h',
                providerJustNow: 'Provider time: just now',
                minutesOld: '{value}m old',
                hoursOld: '{value}h old',
                fetchedJustNow: 'Fetched just now',
                fetchedMinuteAgo: 'Fetched 1 min ago',
                fetchedMinutesAgo: 'Fetched {value}m ago',
                rotationCandidate: 'Rotation candidate',
                gateShear: 'Gate-to-gate shear',
                radarRange: 'Radar range',
                automationCaution: 'Automated heuristic, not a warning. Confirm threats with official NWS products.',
                hailSize: 'Estimated hail size',
                meshCaution: 'Radar estimate, not a ground report or warning.',
                stormMotion: 'Motion',
                stormHistory: 'Observed history',
                stormProjection: 'Projected path',
                stormTrackCaution: 'Automated NEXRAD cell guidance, not an official warning.',
                alertAudioReady: 'Alert sounds enabled',
                alertAudioUnavailable: 'Audio is unavailable in this browser',
                alertAudioActivation: 'Use Test Sound to activate alert audio in this tab',
                newMatchingAlerts_one: '{count} new matching alert',
                newMatchingAlerts_other: '{count} new matching alerts',
                alertsInMap_one: '{count} alert in map',
                alertsInMap_other: '{count} alerts in map',
                activeWeatherAlert: 'Active weather alert',
                viewAlert: 'View',
                dismissAlert: 'Dismiss alert',
                alertAgeTitle: 'Warning age',
                alertAgeNew: 'New',
                alertAgeOld: '3h+',
                alertAgeNote: 'Fill fades with time since issue; border color identifies the hazard.',
                alertIssuedJustNow: 'just issued',
                alertIssuedMinutesAgo: '{value}m since issue',
                alertIssuedHoursAgo: '{value}h since issue',
                nonMapAlerts_one: '{count} active alert cannot be drawn on the map',
                nonMapAlerts_other: '{count} active alerts cannot be drawn on the map',
                additionalNonMapAlerts_one: '{count} additional alert',
                additionalNonMapAlerts_other: '{count} additional alerts',
                stormTopsLoading: 'Loading storm cells…',
                stormTopsCount_one: '{count} storm top in the current map view',
                stormTopsCount_other: '{count} storm tops in the current map view',
                stormTopsScale: 'Display height scale: {value}×.',
                stormTopsEmpty: 'No current storm tops are available in this map view',
                stormTopsUnavailable: '3D storm tops are unavailable',
                stormTopsToggle: 'Toggle 3D storm-top heights',
                stormTopsViewLabel: 'Three-dimensional storm-top view',
                stormTopsThreatColors: 'Storm-top threat colors',
                mapAria: 'Interactive weather map. Use arrow keys to pan, plus and minus to zoom, and F for the forecast at map center.',
                compareMapAria: 'Comparison city weather map',
                compareSearchPlaceholder: 'Search comparison city…',
                compareSearchAria: 'Search comparison city',
                compareResultsAria: 'Comparison city suggestions',
                splitViewAria: 'Toggle two-city view',
                closeSplitViewAria: 'Close two-city view',
                compareSearchEmpty: 'No comparison cities found',
                compareProductAria: 'Comparison pane radar product',
                compareSameProduct: 'Same product',
                compareProductTitle: '{product} comparison',
                compareProductLocked: 'Both panes follow the primary view while two products are compared',
                compareProductArchived: '{product} comparison resumes on the live frame',
                pipTitle: 'Mini radar',
                pipMapAria: 'Picture-in-picture weather map',
                pipToggleAria: 'Toggle mini radar',
                pipCloseAria: 'Close mini radar',
                pipRecenterAria: 'Follow primary map',
                pipCurrentView: 'Current view',
                visualPaletteUpdated: '{name} visual palette enabled',
                snapshotAria: 'Save attributed map snapshot',
                snapshotCreating: 'Creating map snapshot…',
                snapshotSaved: 'Map snapshot saved',
                snapshotUnavailable: 'Wait for a radar frame before saving a snapshot',
                snapshotMapOnly: 'Exit 3D storm tops before saving a radar snapshot',
                snapshotFailed: 'Map snapshot failed: {message}',
                animationExportAria: 'Export radar animation',
                animationExportClose: 'Close animation export',
                animationExportTitle: 'Export radar animation',
                animationExportCopy: 'Capture the current map and attribution across up to 24 sampled radar frames.',
                animationExportFormat: 'Format',
                animationExportDelay: 'Frame timing',
                animationExportGif: 'Animated GIF',
                animationExportMp4: 'MP4 video',
                animationExportMp4Unavailable: 'MP4 is unavailable in this browser; GIF export remains available.',
                animationExportSummary: '{count} sampled frames · about {seconds} seconds',
                animationExportStart: 'Export',
                animationExportCancel: 'Cancel',
                animationExportCapturing: 'Capturing frame {current} of {total}…',
                animationExportEncoding: 'Encoding {format}…',
                animationExportSaved: '{format} animation saved',
                animationExportCancelled: 'Animation export cancelled',
                animationExportUnavailable: 'At least two ready radar frames are required for animation export',
                animationExportMapOnly: 'Exit 3D storm tops before exporting a radar animation',
                animationExportFailed: 'Animation export failed: {message}',
                embedOpenFullMap: 'Open full StormView Radar map',
                chasecasterToggle: 'Toggle chasecaster field mode',
                chasecasterPanel: 'Chasecaster field orientation',
                chasecasterStop: 'Stop chasecaster mode',
                chasecasterStarting: 'Starting GPS and compass…',
                chasecasterGpsOnly: 'GPS active · compass unavailable',
                chasecasterAbsolute: 'GPS active · absolute compass',
                chasecasterRelative: 'GPS active · relative compass',
                chasecasterUncalibrated: 'GPS active · compass needs calibration',
                chasecasterFollowing: 'Following location',
                chasecasterRecenter: 'Recenter and follow',
                chasecasterAccuracy: 'Accuracy',
                chasecasterSpeed: 'Speed',
                chasecasterSafety: 'For situational awareness only. Do not interact with StormView while driving.',
                chasecasterUnavailable: 'Chasecaster requires browser location support',
                chasecasterDenied: 'Location permission is required for chasecaster mode. Enable it in browser site settings and retry.',
                chasecasterError: 'Live location is unavailable. Check location services and retry.',
                trainingToggle: 'Open annotated storm training',
                trainingPanel: 'Annotated storm training',
                trainingClose: 'Close storm training',
                trainingTitle: 'Storm training',
                trainingDisclosure: 'Archived training example · Not live · Not an official warning',
                trainingScenario: 'Training example',
                trainingLoad: 'Load example',
                trainingExit: 'Return live',
                trainingChoose: 'Choose an archived example to begin.',
                trainingLoading: 'Loading archived training radar…',
                trainingActive: '{count} annotated study cues · Use the radar timeline to inspect change.',
                trainingFailed: 'Training example failed: {message}',
                trainingLoaded: 'Archived training example loaded',
                searchPlaceholder: 'Search location…',
                searchAria: 'Search for a US location',
                searchClearAria: 'Clear location search',
                searchResultsAria: 'Location suggestions',
                layersPanelAria: 'Layers panel',
                savedLocationsAria: 'Saved locations',
                toggleThemeAria: 'Toggle theme',
                refreshDataAria: 'Refresh all data',
                settingsAria: 'Settings',
                myLocationAria: 'My location',
                centerForecastAria: 'Forecast at map center',
                openLayersAria: 'Open layer controls',
                closeSettingsAria: 'Close settings',
                closeLayersAria: 'Close layer controls',
                radarFrameAria: 'Radar frame',
                radarProgressAria: 'Radar frame loading progress',
                geofenceNamePlaceholder: 'Name (for example, Home)',
                locationUnsupported: 'Location is unavailable in this browser. Search for a place or click the map instead.',
                locationDenied: 'Location permission is denied. Enable it in browser site settings, then reload StormView.',
                locationFinding: 'Finding your location…',
                locationFailed: 'Your location could not be determined. Search for a place or click the map instead.',
                owmKeyRequired: 'API key required. Open Settings > API Keys to add your OpenWeatherMap key.',
                owmKeyRejected: 'OpenWeatherMap rejected this API key. Update it in Settings > API Keys.',
                owmValidationFailed: 'OpenWeatherMap credential validation failed. Retry this layer when the provider is available.',
                reducedDataEnabled: 'Reduced Data enabled: optional live overlays paused and radar preload limited',
                apiKeysSaved: 'API keys saved in this browser profile',
                settingsExported: 'Settings exported without API keys',
                diagnosticNoRequests: 'No provider requests recorded yet.',
                diagnosticNone: 'None',
                diagnosticRetryAvailable: 'Retry available',
                diagnosticNoRetry: 'No retry pending',
                diagnosticNoTilePause: 'No tile providers paused',
                roadEventsCurrent_one: '{count} Iowa 511 road event in view · updated {updated} · Iowa only',
                roadEventsCurrent_other: '{count} Iowa 511 road events in view · updated {updated} · Iowa only',
                roadEventsEmpty: 'No Iowa DOT road events in this view · Iowa only',
                roadEventsOutside: 'Outside Iowa DOT road-event coverage',
                roadEventsUnavailable: 'Iowa road events unavailable: {message}',
                level2SiteHealthUnknown: 'Site status unavailable',
                level2TiltLowest: 'Lowest',
                diagnosticLevel2Unused: 'Not used this session',
                roadClosure: 'Road closure',
                laneClosure: 'Lane closure',
                roadRestriction: 'Road restriction',
                roadWork: 'Road work',
                roadEventUpdated: 'Updated: {updated}',
                roadEventRestrictions: 'Restrictions: {value}',
                roadEventAlternateRoute: 'Alternate route: {value}',
                roadEventSource: 'Iowa 511 · Iowa-only coverage',
                roadEventDetails: 'View Iowa 511 details',
                localOverlayLoaded_one: '{count} feature loaded from {name}',
                localOverlayLoaded_other: '{count} features loaded from {name}',
                localOverlayShown: 'Local overlay shown',
                localOverlayHidden: 'Local overlay hidden',
                localOverlayRemoved: 'Local overlay removed',
                localOverlayImportFailed: 'Overlay import failed: {message}',
                localOverlayHide: 'Hide overlay',
                localOverlayShow: 'Show overlay',
                localOverlayNone: 'No local overlay loaded'
            },
            es: {
                loading: 'Cargando...',
                fetchingForecast: 'Obteniendo pronóstico...',
                forecastFailed: 'No se pudo cargar el pronóstico. Prueba otra ubicación.',
                feels: 'Sensación',
                humidity: 'Humedad',
                wind: 'Viento',
                gusts: 'Ráfagas',
                pressure: 'Presión',
                precip: 'Precip.',
                hourlyForecast: 'Pronóstico por hora',
                sevenDayForecast: 'Pronóstico de 7 días',
                now: 'Ahora',
                today: 'Hoy',
                localTime: 'Hora local',
                forecast: 'Pronóstico',
                analysis: 'Análisis',
                past: 'Pasado',
                latest: 'Más reciente',
                noRadarFrame: 'Sin imagen de radar',
                languageUpdated: 'Idioma actualizado',
                unitsUpdated: 'Unidades actualizadas',
                preloadFrames_one: '{count} fotograma a cada lado',
                preloadFrames_other: '{count} fotogramas a cada lado',
                preloadReduced: '±{count} límite',
                preloadReducedAria: '{value} · límite de Datos reducidos',
                offlineUnavailable: 'Sin conexión · los datos almacenados podrían no estar disponibles',
                offlineCached: 'Sin conexión · {resources} en caché',
                cachedFallback: 'Respaldo en caché · {resources}',
                offlineRadar: 'radar',
                offlineAlerts: 'alertas',
                offlineShell: 'aplicación',
                pwaInstallAria: 'Instalar StormView Radar',
                pwaInstallTitle: 'Instalar StormView Radar',
                pwaInstallDescription: 'Listo sin conexión: la aplicación y la última imagen de radar están almacenadas en este dispositivo.',
                pwaInstallButton: 'Instalar',
                pwaInstallDismiss: 'Ahora no',
                pwaInstallAccepted: 'Se abrió la solicitud de instalación de StormView Radar',
                pwaInstalled: 'StormView Radar instalado',
                pwaInstallFailed: 'La solicitud de instalación no está disponible. Usa el menú del navegador para instalar StormView Radar.',
                providerLoading: '{provider}: cargando…',
                providerCurrent: '{provider}: actual',
                providerFallback: 'Respaldo MRMS: falló {provider}',
                providerStale: '{provider}: datos antiguos; falló la actualización',
                providerUnavailable: '{provider}: no disponible',
                invalidProviderTime: '{provider}: hora del proveedor no válida',
                validInMinutes: 'Válido en {value} min',
                validInHours: 'Válido en {value} h',
                providerJustNow: 'Hora del proveedor: ahora',
                minutesOld: 'Hace {value} min',
                hoursOld: 'Hace {value} h',
                fetchedJustNow: 'Obtenido ahora',
                fetchedMinuteAgo: 'Obtenido hace 1 min',
                fetchedMinutesAgo: 'Obtenido hace {value} min',
                rotationCandidate: 'Candidato de rotación',
                gateShear: 'Cizalladura entre compuertas',
                radarRange: 'Distancia del radar',
                automationCaution: 'Heurística automatizada, no es una alerta. Confirma las amenazas con productos oficiales del NWS.',
                hailSize: 'Tamaño estimado del granizo',
                meshCaution: 'Estimación de radar; no es un reporte en tierra ni una alerta.',
                stormMotion: 'Movimiento',
                stormHistory: 'Historial observado',
                stormProjection: 'Trayectoria proyectada',
                stormTrackCaution: 'Guía automatizada de celdas NEXRAD; no es una alerta oficial.',
                alertAudioReady: 'Sonidos de alerta activados',
                alertAudioUnavailable: 'El audio no está disponible en este navegador',
                alertAudioActivation: 'Usa Probar sonido para activar el audio en esta pestaña',
                newMatchingAlerts_one: '{count} alerta nueva coincidente',
                newMatchingAlerts_other: '{count} alertas nuevas coincidentes',
                alertsInMap_one: '{count} alerta en el mapa',
                alertsInMap_other: '{count} alertas en el mapa',
                activeWeatherAlert: 'Alerta meteorológica activa',
                viewAlert: 'Ver',
                dismissAlert: 'Descartar alerta',
                alertAgeTitle: 'Antigüedad de la alerta',
                alertAgeNew: 'Nueva',
                alertAgeOld: '3 h+',
                alertAgeNote: 'El relleno se desvanece desde la emisión; el borde identifica el peligro.',
                alertIssuedJustNow: 'recién emitida',
                alertIssuedMinutesAgo: '{value} min desde la emisión',
                alertIssuedHoursAgo: '{value} h desde la emisión',
                nonMapAlerts_one: '{count} alerta activa no se puede dibujar en el mapa',
                nonMapAlerts_other: '{count} alertas activas no se pueden dibujar en el mapa',
                additionalNonMapAlerts_one: '{count} alerta adicional',
                additionalNonMapAlerts_other: '{count} alertas adicionales',
                stormTopsLoading: 'Cargando celdas de tormenta…',
                stormTopsCount_one: '{count} cima de tormenta en la vista actual',
                stormTopsCount_other: '{count} cimas de tormenta en la vista actual',
                stormTopsScale: 'Escala de altura visual: {value}×.',
                stormTopsEmpty: 'No hay cimas de tormenta actuales en esta vista',
                stormTopsUnavailable: 'Las cimas de tormenta 3D no están disponibles',
                stormTopsToggle: 'Alternar alturas 3D de cimas de tormenta',
                stormTopsViewLabel: 'Vista tridimensional de cimas de tormenta',
                stormTopsThreatColors: 'Colores de amenaza de las cimas',
                mapAria: 'Mapa meteorológico interactivo. Usa las flechas para desplazar, más y menos para acercar, y F para el pronóstico en el centro.',
                compareMapAria: 'Mapa meteorológico de la ciudad comparada',
                compareSearchPlaceholder: 'Buscar ciudad para comparar…',
                compareSearchAria: 'Buscar ciudad para comparar',
                compareResultsAria: 'Sugerencias de ciudades para comparar',
                splitViewAria: 'Alternar vista de dos ciudades',
                closeSplitViewAria: 'Cerrar vista de dos ciudades',
                compareSearchEmpty: 'No se encontraron ciudades para comparar',
                compareProductAria: 'Producto de radar del panel comparado',
                compareSameProduct: 'Mismo producto',
                compareProductTitle: 'Comparación de {product}',
                compareProductLocked: 'Ambos paneles siguen la vista principal mientras se comparan dos productos',
                compareProductArchived: 'La comparación de {product} se reanuda en el cuadro en vivo',
                pipTitle: 'Radar miniatura',
                pipMapAria: 'Mapa meteorológico en imagen dentro de imagen',
                pipToggleAria: 'Alternar radar miniatura',
                pipCloseAria: 'Cerrar radar miniatura',
                pipRecenterAria: 'Seguir el mapa principal',
                pipCurrentView: 'Vista actual',
                visualPaletteUpdated: 'Paleta visual {name} activada',
                snapshotAria: 'Guardar captura de mapa con atribución',
                snapshotCreating: 'Creando captura del mapa…',
                snapshotSaved: 'Captura del mapa guardada',
                snapshotUnavailable: 'Espera una imagen de radar antes de guardar una captura',
                snapshotMapOnly: 'Sal de las cimas de tormenta 3D antes de guardar una captura de radar',
                snapshotFailed: 'Falló la captura del mapa: {message}',
                animationExportAria: 'Exportar animación de radar',
                animationExportClose: 'Cerrar exportación de animación',
                animationExportTitle: 'Exportar animación de radar',
                animationExportCopy: 'Captura el mapa actual y la atribución en hasta 24 cuadros de radar muestreados.',
                animationExportFormat: 'Formato',
                animationExportDelay: 'Tiempo por cuadro',
                animationExportGif: 'GIF animado',
                animationExportMp4: 'Video MP4',
                animationExportMp4Unavailable: 'MP4 no está disponible en este navegador; la exportación GIF sigue disponible.',
                animationExportSummary: '{count} cuadros muestreados · aproximadamente {seconds} segundos',
                animationExportStart: 'Exportar',
                animationExportCancel: 'Cancelar',
                animationExportCapturing: 'Capturando cuadro {current} de {total}…',
                animationExportEncoding: 'Codificando {format}…',
                animationExportSaved: 'Animación {format} guardada',
                animationExportCancelled: 'Exportación de animación cancelada',
                animationExportUnavailable: 'Se requieren al menos dos cuadros de radar listos para exportar una animación',
                animationExportMapOnly: 'Sal de las cimas de tormenta 3D antes de exportar una animación de radar',
                animationExportFailed: 'Falló la exportación de animación: {message}',
                embedOpenFullMap: 'Abrir el mapa completo de StormView Radar',
                chasecasterToggle: 'Alternar modo de campo Chasecaster',
                chasecasterPanel: 'Orientación de campo Chasecaster',
                chasecasterStop: 'Detener modo Chasecaster',
                chasecasterStarting: 'Iniciando GPS y brújula…',
                chasecasterGpsOnly: 'GPS activo · brújula no disponible',
                chasecasterAbsolute: 'GPS activo · brújula absoluta',
                chasecasterRelative: 'GPS activo · brújula relativa',
                chasecasterUncalibrated: 'GPS activo · calibra la brújula',
                chasecasterFollowing: 'Siguiendo ubicación',
                chasecasterRecenter: 'Centrar y seguir',
                chasecasterAccuracy: 'Precisión',
                chasecasterSpeed: 'Velocidad',
                chasecasterSafety: 'Solo para conciencia situacional. No interactúes con StormView mientras conduces.',
                chasecasterUnavailable: 'Chasecaster requiere compatibilidad con ubicación del navegador',
                chasecasterDenied: 'Se requiere permiso de ubicación para Chasecaster. Actívalo en la configuración del sitio y vuelve a intentarlo.',
                chasecasterError: 'La ubicación en vivo no está disponible. Revisa los servicios de ubicación y vuelve a intentarlo.',
                trainingToggle: 'Abrir entrenamiento de tormentas anotado',
                trainingPanel: 'Entrenamiento de tormentas anotado',
                trainingClose: 'Cerrar entrenamiento de tormentas',
                trainingTitle: 'Entrenamiento de tormentas',
                trainingDisclosure: 'Ejemplo de entrenamiento archivado · No está en vivo · No es una alerta oficial',
                trainingScenario: 'Ejemplo de entrenamiento',
                trainingLoad: 'Cargar ejemplo',
                trainingExit: 'Volver en vivo',
                trainingChoose: 'Elige un ejemplo archivado para comenzar.',
                trainingLoading: 'Cargando radar de entrenamiento archivado…',
                trainingActive: '{count} indicaciones de estudio anotadas · Usa la línea de tiempo del radar para observar los cambios.',
                trainingFailed: 'Falló el ejemplo de entrenamiento: {message}',
                trainingLoaded: 'Ejemplo de entrenamiento archivado cargado',
                searchPlaceholder: 'Buscar ubicación…',
                searchAria: 'Buscar una ubicación de Estados Unidos',
                searchClearAria: 'Borrar búsqueda de ubicación',
                searchResultsAria: 'Sugerencias de ubicación',
                layersPanelAria: 'Panel de capas',
                savedLocationsAria: 'Ubicaciones guardadas',
                toggleThemeAria: 'Cambiar tema',
                refreshDataAria: 'Actualizar todos los datos',
                settingsAria: 'Configuración',
                myLocationAria: 'Mi ubicación',
                centerForecastAria: 'Pronóstico en el centro del mapa',
                openLayersAria: 'Abrir controles de capas',
                closeSettingsAria: 'Cerrar configuración',
                closeLayersAria: 'Cerrar controles de capas',
                radarFrameAria: 'Imagen de radar',
                radarProgressAria: 'Progreso de carga de imágenes de radar',
                geofenceNamePlaceholder: 'Nombre (por ejemplo, Casa)',
                locationUnsupported: 'La ubicación no está disponible en este navegador. Busca un lugar o haz clic en el mapa.',
                locationDenied: 'El permiso de ubicación está denegado. Actívalo en la configuración del sitio y vuelve a cargar StormView.',
                locationFinding: 'Buscando tu ubicación…',
                locationFailed: 'No se pudo determinar tu ubicación. Busca un lugar o haz clic en el mapa.',
                owmKeyRequired: 'Se requiere una clave. Abre Configuración > Claves API para añadir tu clave de OpenWeatherMap.',
                owmKeyRejected: 'OpenWeatherMap rechazó esta clave. Actualízala en Configuración > Claves API.',
                owmValidationFailed: 'Falló la validación de credenciales de OpenWeatherMap. Reintenta esta capa cuando el proveedor esté disponible.',
                reducedDataEnabled: 'Datos reducidos activados: capas en vivo opcionales pausadas y precarga de radar limitada',
                apiKeysSaved: 'Claves API guardadas en este perfil del navegador',
                settingsExported: 'Configuración exportada sin claves API',
                diagnosticNoRequests: 'Todavía no se registraron solicitudes del proveedor.',
                diagnosticNone: 'Ninguno',
                diagnosticRetryAvailable: 'Reintento disponible',
                diagnosticNoRetry: 'Sin reintento pendiente',
                diagnosticNoTilePause: 'Ningún proveedor de teselas está pausado',
                roadEventsCurrent_one: '{count} evento vial de Iowa 511 en la vista · actualizado {updated} · solo Iowa',
                roadEventsCurrent_other: '{count} eventos viales de Iowa 511 en la vista · actualizados {updated} · solo Iowa',
                roadEventsEmpty: 'No hay eventos viales del DOT de Iowa en esta vista · solo Iowa',
                roadEventsOutside: 'Fuera de la cobertura de eventos viales del DOT de Iowa',
                roadEventsUnavailable: 'Eventos viales de Iowa no disponibles: {message}',
                level2SiteHealthUnknown: 'Estado del sitio no disponible',
                level2TiltLowest: 'Más bajo',
                diagnosticLevel2Unused: 'No usado en esta sesión',
                roadClosure: 'Carretera cerrada',
                laneClosure: 'Carril cerrado',
                roadRestriction: 'Restricción vial',
                roadWork: 'Obras viales',
                roadEventUpdated: 'Actualizado: {updated}',
                roadEventRestrictions: 'Restricciones: {value}',
                roadEventAlternateRoute: 'Ruta alternativa: {value}',
                roadEventSource: 'Iowa 511 · cobertura solo en Iowa',
                roadEventDetails: 'Ver detalles de Iowa 511',
                localOverlayLoaded_one: '{count} elemento cargado desde {name}',
                localOverlayLoaded_other: '{count} elementos cargados desde {name}',
                localOverlayShown: 'Capa local visible',
                localOverlayHidden: 'Capa local oculta',
                localOverlayRemoved: 'Capa local eliminada',
                localOverlayImportFailed: 'Falló la importación de la capa: {message}',
                localOverlayHide: 'Ocultar capa',
                localOverlayShow: 'Mostrar capa',
                localOverlayNone: 'No hay capa local cargada'
            }
        };
        const STATIC_MESSAGE_TRANSLATIONS = {
            'Settings': 'Configuración',
            'Primary view': 'Vista principal',
            'Comparison view': 'Vista comparativa',
            '2-City': '2 ciudades',
            'Chase': 'Campo',
            'Train': 'Aprender',
            'Display': 'Pantalla',
            'Status': 'Estado',
            'Appearance': 'Apariencia',
            'Dark Theme': 'Tema oscuro',
            'Show Legend': 'Mostrar leyenda',
            'Language': 'Idioma',
            'Road Events': 'Eventos viales',
            'Units': 'Unidades',
            'US customary': 'Sistema estadounidense',
            'Metric': 'Métrico',
            'Border Style': 'Estilo de bordes',
            'State Border Width': 'Ancho de estados',
            'County Border Width': 'Ancho de condados',
            'Border Opacity': 'Opacidad de bordes',
            'Overlay Visibility': 'Visibilidad de capas',
            'Adjust each map overlay independently. Radar opacity remains in the Radar tab.': 'Ajusta cada capa del mapa de forma independiente. La opacidad del radar permanece en la pestaña Radar.',
            'Layer': 'Capa',
            'Visibility': 'Visibilidad',
            'Import / Export': 'Importar / Exportar',
            'Export': 'Exportar',
            'Import': 'Importar',
            'Local Map Overlay': 'Capa de mapa local',
            'Load a session-only GeoJSON or KML file (maximum 2 MB, 500 features, and 50,000 coordinate pairs). Local overlays are never saved or sent over the network.': 'Carga un archivo GeoJSON o KML solo para esta sesión (máximo 2 MB, 500 elementos y 50.000 pares de coordenadas). Las capas locales nunca se guardan ni se envían por la red.',
            'Load GeoJSON / KML': 'Cargar GeoJSON / KML',
            'Hide overlay': 'Ocultar capa',
            'Remove overlay': 'Eliminar capa',
            'No local overlay loaded': 'No hay capa local cargada',
            'Radar Display': 'Pantalla de radar',
            'Historical Replay': 'Repetición histórica',
            'Replay IEM NEXRAD composites and storm-based warning polygons. Times use your browser timezone; ranges are limited to 6 hours.': 'Reproduce mosaicos NEXRAD de IEM y polígonos históricos de alertas. Las horas usan la zona del navegador; el intervalo máximo es de 6 horas.',
            'Start': 'Inicio',
            'End': 'Fin',
            'Start Replay': 'Iniciar repetición',
            'Return Live': 'Volver a tiempo real',
            'Live mode': 'Modo en vivo',
            'Replay': 'Repetición',
            'Opacity': 'Opacidad',
            'Smooth Radar': 'Radar suavizado',
            'Snow Colors': 'Colores de nieve',
            'High-Res Mode': 'Modo de alta resolución',
            'Animation': 'Animación',
            'Frame Delay': 'Demora de fotogramas',
            'Preload Window': 'Ventana de precarga',
            'Frames kept ready before and after the playhead': 'Fotogramas preparados antes y después de la posición actual',
            'Auto-Refresh': 'Actualización automática',
            'Loop Animation': 'Repetir animación',
            'Radar Source': 'Fuente de radar',
            'Radar Products': 'Productos de radar',
            'Site': 'Sitio',
            'Nearest to map center': 'Más cercano al centro del mapa',
            'Reflectivity': 'Reflectividad',
            'Velocity': 'Velocidad',
            'Rain Rate': 'Tasa de lluvia',
            'Correlation': 'Correlación',
            'Rotation Candidates': 'Candidatos de rotación',
            'Hail Size': 'Tamaño del granizo',
            'GeoColor': 'GeoColor',
            'IR Sandwich': 'Sándwich IR',
            'Mesoscale Sectors': 'Sectores de mesoescala',
            'Weather Layers': 'Capas meteorológicas',
            'Map Overlays': 'Capas del mapa',
            'Model Data': 'Datos del modelo',
            'Base Map': 'Mapa base',
            'Color Scheme': 'Esquema de color',
            'Standard': 'Estándar',
            'High contrast': 'Alto contraste',
            'Color-blind safe': 'Apta para daltonismo',
            'Applies a display transform to provider tiles and native colors to Level II, alerts, hail, and storm analysis. It does not change the source data.': 'Aplica una transformación visual a las teselas del proveedor y colores nativos a Level II, alertas, granizo y análisis de tormentas. No cambia los datos de origen.',
            'Alerts': 'Alertas',
            'Audio Notifications': 'Notificaciones de audio',
            'Alert Sounds': 'Sonidos de alerta',
            'Opt in to a tone for newly issued matching alerts': 'Activa un tono para alertas nuevas que coincidan',
            'Minimum Severity': 'Gravedad mínima',
            'Alert Type': 'Tipo de alerta',
            'Map Center Radius': 'Radio desde el centro',
            'Match Around': 'Coincidir alrededor de',
            'Map center': 'Centro del mapa',
            'Saved geofences': 'Geocercas guardadas',
            'Test Sound': 'Probar sonido',
            'Extreme': 'Extrema',
            'Severe': 'Severa',
            'Moderate': 'Moderada',
            'Minor': 'Menor',
            'Any severity': 'Cualquier gravedad',
            'Tornado only': 'Solo tornados',
            'Warnings': 'Alertas',
            'Watches + warnings': 'Vigilancias y alertas',
            'All alerts': 'Todas las alertas',
            'Any distance': 'Cualquier distancia',
            'Saved Geofences': 'Geocercas guardadas',
            'Add a private alert radius at the current map center. Geofences stay only in this browser profile.': 'Añade un radio privado de alertas en el centro actual del mapa. Las geocercas permanecen solo en este perfil del navegador.',
            'Add at Map Center': 'Añadir en el centro del mapa',
            'Geofences': 'Geocercas',
            'Delete': 'Eliminar',
            'local only': 'solo local',
            'No saved geofences.': 'No hay geocercas guardadas.',
            'The first alert load is always silent. Keep the map centered on the area you care about; alerts without polygons only match “Any distance.” Browsers may require Test Sound once per tab.': 'La primera carga de alertas siempre es silenciosa. Mantén el mapa centrado en el área de interés; las alertas sin polígonos solo coinciden con “Cualquier distancia”. El navegador puede requerir Probar sonido una vez por pestaña.',
            'Reports': 'Informes',
            'Storm Tracks': 'Trayectorias de tormentas',
            'Lightning': 'Rayos',
            'Satellite': 'Satélite',
            'Rivers': 'Ríos',
            'Temperature': 'Temperatura',
            'Clouds': 'Nubes',
            'Radar & Freshness': 'Radar y vigencia',
            'App version': 'Versión de la app',
            'Provider / product': 'Proveedor / producto',
            'Result': 'Resultado',
            'Valid time / age': 'Hora válida / antigüedad',
            'Coverage': 'Cobertura',
            'Resources': 'Recursos',
            'Retry / backoff': 'Reintento / espera',
            'Redacted Request Results': 'Resultados de solicitudes redactados',
            'Copy report': 'Copiar informe',
            'Retry radar': 'Reintentar radar',
            'Clear': 'Despejado',
            'Partly Cloudy': 'Parcialmente nublado',
            'Cloudy': 'Nublado',
            'Fog': 'Niebla',
            'Rain': 'Lluvia',
            'Snow': 'Nieve',
            'Thunderstorm': 'Tormenta',
            'current': 'actual',
            'loading': 'cargando',
            'fallback': 'respaldo',
            'stale': 'antiguo',
            'error': 'error',
            'success': 'correcto',
            'cancelled': 'cancelado',
            '3D Storm Tops': 'Cimas de tormenta 3D',
            'Labels show measured IEM NEXRAD echo-top estimates. Footprint width is symbolic, not storm size. Automated guidance, not an official warning.': 'Las etiquetas muestran estimaciones medidas de la cima del eco NEXRAD de IEM. El ancho de la huella es simbólico, no el tamaño de la tormenta. Guía automatizada; no es una alerta oficial.',
            'Mesocyclone': 'Mesociclón',
            'Hail': 'Granizo',
            'Other': 'Otro'
        };
        const STATIC_MESSAGE_CATALOG = Object.freeze(Object.fromEntries(
            Object.entries(STATIC_MESSAGE_TRANSLATIONS).map(([english, spanish], index) => [
                `static.${index + 1}`,
                Object.freeze({ en: english, es: spanish })
            ])
        ));
        const STATIC_MESSAGE_KEY_BY_ENGLISH = new Map(
            Object.entries(STATIC_MESSAGE_CATALOG).map(([key, messages]) => [messages.en, key])
        );
        const staticMessageKeysByNode = new WeakMap();

        function languageCode() {
            return settings.language === 'es' ? 'es' : 'en';
        }

        const messageFormatter = createMessageFormatter(MESSAGE_CATALOG, languageCode);

        function t(key, variables = {}) {
            return messageFormatter.message(key, variables);
        }

        const offlineFallbackResources = new Set();
        const PWA_INSTALL_DISMISSAL_KEY = 'stormview_pwa_install_dismissed_at';

        function pwaStandaloneMode() {
            return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
        }

        function pwaInstallDismissedAt() {
            try {
                return localStorage.getItem(PWA_INSTALL_DISMISSAL_KEY);
            } catch {
                return null;
            }
        }

        function updatePwaInstallLanguage() {
            const title = document.getElementById('pwaInstallTitle');
            if (!title) return;
            title.textContent = t('pwaInstallTitle');
            document.getElementById('pwaInstallDescription').textContent = t('pwaInstallDescription');
            document.getElementById('pwaInstallButton').textContent = t('pwaInstallButton');
            document.getElementById('pwaInstallDismiss').textContent = t('pwaInstallDismiss');
        }

        function updatePwaInstallPrompt() {
            const panel = document.getElementById('pwaInstallPrompt');
            if (!panel) return;
            const visible = shouldOfferInstall({
                hasInstallEvent: Boolean(deferredInstallPrompt),
                offlineReady: offlineInstallAvailability.ready,
                standalone: pwaStandaloneMode(),
                embed: Boolean(embedConfig),
                dismissedAt: pwaInstallDismissedAt()
            }) && initialLoadComplete;
            panel.hidden = !visible;
            panel.dataset.offlineRadarEntries = String(offlineInstallAvailability.radarEntries);
        }

        async function requestPwaInstall() {
            const promptEvent = deferredInstallPrompt;
            if (!promptEvent?.prompt) {
                showToast(t('pwaInstallFailed'), 'warn', 5000);
                return;
            }
            try {
                await promptEvent.prompt();
                const choice = await promptEvent.userChoice;
                deferredInstallPrompt = null;
                if (choice?.outcome === 'dismissed') {
                    try {
                        localStorage.setItem(PWA_INSTALL_DISMISSAL_KEY, String(Date.now()));
                    } catch {
                        // A blocked storage profile still gets a session-scoped browser prompt.
                    }
                } else {
                    showToast(t('pwaInstallAccepted'), 'success', 3000);
                }
                updatePwaInstallPrompt();
            } catch (error) {
                console.warn('PWA install prompt failed:', error);
                deferredInstallPrompt = null;
                updatePwaInstallPrompt();
                showToast(t('pwaInstallFailed'), 'warn', 5000);
            }
        }

        function initPwaInstallPrompt() {
            window.addEventListener('beforeinstallprompt', event => {
                event.preventDefault();
                deferredInstallPrompt = event;
                updatePwaInstallPrompt();
            });
            window.addEventListener('appinstalled', () => {
                deferredInstallPrompt = null;
                try {
                    localStorage.removeItem(PWA_INSTALL_DISMISSAL_KEY);
                } catch {
                    // Installation succeeded even if local storage is unavailable.
                }
                updatePwaInstallPrompt();
                showToast(t('pwaInstalled'), 'success', 3500);
            });
            document.getElementById('pwaInstallButton').addEventListener('click', requestPwaInstall);
            document.getElementById('pwaInstallDismiss').addEventListener('click', () => {
                try {
                    localStorage.setItem(PWA_INSTALL_DISMISSAL_KEY, String(Date.now()));
                } catch {
                    deferredInstallPrompt = null;
                }
                updatePwaInstallPrompt();
            });
            updatePwaInstallPrompt();
        }

        function markOfflineRadarFrameReady() {
            if (offlineFrameMarkPending || !('serviceWorker' in navigator)) return;
            offlineFrameMarkPending = true;
            navigator.serviceWorker.ready
                .then(registration => {
                    registration.active?.postMessage({ type: 'stormview-mark-offline-radar-frame' });
                })
                .catch(() => {})
                .finally(() => { offlineFrameMarkPending = false; });
        }

        function updateOfflineStatus() {
            const chip = document.getElementById('offlineStatus');
            const text = document.getElementById('offlineStatusText');
            if (!chip || !text) return;
            const isOffline = navigator.onLine === false;
            const resources = [...offlineFallbackResources]
                .map(resource => t({ radar: 'offlineRadar', alerts: 'offlineAlerts', shell: 'offlineShell' }[resource] || 'offlineShell'))
                .join(', ');
            chip.classList.toggle('show', isOffline || Boolean(resources));
            chip.dataset.state = 'stale';
            document.body.dataset.offlineFallback = resources ? 'cached' : (isOffline ? 'offline' : 'online');
            text.textContent = resources
                ? t(isOffline ? 'offlineCached' : 'cachedFallback', { resources })
                : t('offlineUnavailable');
        }

        async function requestPersistentStorage() {
            if (storagePersistence !== 'unknown') return storagePersistence;
            if (!navigator.storage?.persist) {
                storagePersistence = 'unsupported';
                renderDiagnostics();
                return storagePersistence;
            }
            try {
                const already = await navigator.storage.persisted?.();
                storagePersistence = (already || await navigator.storage.persist()) ? 'granted' : 'denied';
            } catch (error) {
                console.warn('Persistent storage could not be requested:', error);
                storagePersistence = 'denied';
            }
            renderDiagnostics();
            return storagePersistence;
        }

        async function initOfflineFallback() {
            window.addEventListener('offline', updateOfflineStatus);
            window.addEventListener('online', () => {
                offlineFallbackResources.clear();
                updateOfflineStatus();
            });
            updateOfflineStatus();
            if (!('serviceWorker' in navigator)) return;
            navigator.serviceWorker.addEventListener('message', event => {
                if (event.data?.type === 'stormview-offline-fallback') {
                    offlineFallbackResources.add(event.data.resource);
                    updateOfflineStatus();
                    return;
                }
                if (event.data?.type === 'stormview-offline-availability') {
                    offlineInstallAvailability = normalizeOfflineAvailability(event.data);
                    // Ask for durable storage at the same moment the app decides
                    // it has something worth keeping offline.
                    if (offlineInstallAvailability.ready) requestPersistentStorage();
                    updatePwaInstallPrompt();
                }
            });
            try {
                const registered = await navigator.serviceWorker.register('./service-worker.js', { scope: './' });
                const registration = registered.active || (!registered.installing && !registered.waiting)
                    ? registered
                    : await Promise.race([
                        navigator.serviceWorker.ready,
                        new Promise(resolve => setTimeout(() => resolve(null), 3000))
                    ]);
                registration?.active?.postMessage({ type: 'stormview-offline-availability-request' });
                if (framesLoaded > 0) markOfflineRadarFrameReady();
            } catch (error) {
                console.warn('Offline fallback could not be enabled:', error);
            }
        }

        function localizedStaticText(value) {
            const key = STATIC_MESSAGE_KEY_BY_ENGLISH.get(value);
            return key ? STATIC_MESSAGE_CATALOG[key][languageCode()] : value;
        }

        function localizeTextTree(root = document.body) {
            if (!root) return;
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
            let node;
            while ((node = walker.nextNode())) {
                let key = staticMessageKeysByNode.get(node);
                if (!key) {
                    key = STATIC_MESSAGE_KEY_BY_ENGLISH.get(node.nodeValue.trim());
                    if (key) staticMessageKeysByNode.set(node, key);
                }
                if (!key) continue;
                const messages = STATIC_MESSAGE_CATALOG[key];
                const current = node.nodeValue.trim();
                node.nodeValue = node.nodeValue.replace(current, messages[languageCode()]);
            }
        }

        function formatLocalizedDate(value, options = {}) {
            return messageFormatter.date(value, options);
        }

        function unitProfile() {
            return settings.units === 'metric'
                ? { temperature: '°C', speed: 'km/h', pressure: 'hPa', precipitation: 'mm', stage: 'm' }
                : { temperature: '°F', speed: 'mph', pressure: 'inHg', precipitation: 'in', stage: 'ft' };
        }

        function formatObservationTemperature(fahrenheit) {
            const value = Number(fahrenheit);
            if (!Number.isFinite(value)) return 'N/A';
            const converted = settings.units === 'metric' ? (value - 32) * 5 / 9 : value;
            return `${messageFormatter.number(converted, { maximumFractionDigits: 0 })}${unitProfile().temperature}`;
        }

        function formatRiverStage(feet) {
            const value = Number(feet);
            if (!Number.isFinite(value)) return 'N/A';
            const converted = settings.units === 'metric' ? value * 0.3048 : value;
            return `${messageFormatter.number(converted, { maximumFractionDigits: 2 })} ${unitProfile().stage}`;
        }

        function applyLanguage() {
            document.documentElement.lang = languageCode();
            localizeTextTree();
            const localizedAttributes = {
                map: ['aria-label', 'mapAria'],
                compareMap: ['aria-label', 'compareMapAria'],
                compareSearchInput: ['aria-label', 'compareSearchAria'],
                compareSearchResults: ['aria-label', 'compareResultsAria'],
                splitViewBtn: ['title', 'splitViewAria'],
                compareProductSelect: ['aria-label', 'compareProductAria'],
                compareMapClose: ['aria-label', 'closeSplitViewAria'],
                pipRadarPanel: ['aria-label', 'pipTitle'],
                pipMap: ['aria-label', 'pipMapAria'],
                pipRadarBtn: ['title', 'pipToggleAria'],
                pipRadarClose: ['aria-label', 'pipCloseAria'],
                pipRadarRecenter: ['title', 'pipRecenterAria'],
                chasecasterBtn: ['title', 'chasecasterToggle'],
                chasecasterPanel: ['aria-label', 'chasecasterPanel'],
                chasecasterStop: ['aria-label', 'chasecasterStop'],
                trainingBtn: ['title', 'trainingToggle'],
                trainingPanel: ['aria-label', 'trainingPanel'],
                trainingClose: ['aria-label', 'trainingClose'],
                pwaInstallPrompt: ['aria-label', 'pwaInstallAria'],
                searchInput: ['aria-label', 'searchAria'],
                searchClear: ['aria-label', 'searchClearAria'],
                searchResults: ['aria-label', 'searchResultsAria'],
                sidebarToggle: ['title', 'layersPanelAria'],
                bookmarksBtn: ['title', 'savedLocationsAria'],
                bookmarksPanel: ['aria-label', 'savedLocationsAria'],
                themeBtn: ['title', 'toggleThemeAria'],
                snapshotBtn: ['title', 'snapshotAria'],
                animationExportBtn: ['title', 'animationExportAria'],
                animationExportPanel: ['aria-label', 'animationExportAria'],
                animationExportClose: ['aria-label', 'animationExportClose'],
                embedBrand: ['aria-label', 'embedOpenFullMap'],
                refreshBtn: ['title', 'refreshDataAria'],
                settingsBtn: ['title', 'settingsAria'],
                locBtn: ['aria-label', 'myLocationAria'],
                centerForecastBtn: ['aria-label', 'centerForecastAria'],
                mobileFab: ['aria-label', 'openLayersAria'],
                settingsClose: ['aria-label', 'closeSettingsAria'],
                sheetClose: ['aria-label', 'closeLayersAria'],
                timeline: ['aria-label', 'radarFrameAria'],
                loadProgressBar: ['aria-label', 'radarProgressAria']
            };
            Object.entries(localizedAttributes).forEach(([id, [attribute, key]]) => {
                const element = document.getElementById(id);
                if (!element) return;
                element.setAttribute(attribute, t(key));
                if (attribute === 'title' && !element.getAttribute('aria-label')) {
                    element.setAttribute('aria-label', t(key));
                }
            });
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.placeholder = t('searchPlaceholder');
            const compareSearchInput = document.getElementById('compareSearchInput');
            if (compareSearchInput) compareSearchInput.placeholder = t('compareSearchPlaceholder');
            updateTrainingLanguage();
            updatePwaInstallLanguage();
            updateAnimationExportLanguage();
            if (alertAgeLegendControl && currentAlertFeatures.length) {
                const referenceTime = replayMode && frames[currentFrame]
                    ? frames[currentFrame].time * 1000
                    : Date.now();
                alertFillTools()
                    .then(tools => showAlertAgeLegend(currentAlertFeatures, tools, referenceTime))
                    .catch(error => console.warn('Alert age legend unavailable:', error));
            }
            renderNonMapAlerts(currentAlertFeatures);
            const stormTopButton = document.getElementById('stormTop3dBtn');
            const stormTopView = document.getElementById('cesiumView');
            const stormTopLegend = document.querySelector('.storm-3d-legend');
            if (stormTopButton) {
                stormTopButton.title = t('stormTopsToggle');
                stormTopButton.setAttribute('aria-label', t('stormTopsToggle'));
            }
            if (stormTopView) stormTopView.setAttribute('aria-label', t('stormTopsViewLabel'));
            if (stormTopLegend) stormTopLegend.setAttribute('aria-label', t('stormTopsThreatColors'));
            const geofenceNameInput = document.getElementById('geofenceNameInput');
            if (geofenceNameInput) geofenceNameInput.placeholder = t('geofenceNamePlaceholder');
            renderGeofenceList();
            updateLocalOverlayControls();
            updateTimestamp();
            renderDiagnostics();
            updateOfflineStatus();
            updatePreloadWindowControl();
            updateSplitViewLabels();
            updatePipRadarLabel();
            syncVisualPaletteControls();
            updateChasecasterLanguage();
            const splitViewButton = document.getElementById('splitViewBtn');
            if (splitViewButton) {
                splitViewButton.title = t('splitViewAria');
                splitViewButton.setAttribute('aria-label', t('splitViewAria'));
            }
            const pipRadarButton = document.getElementById('pipRadarBtn');
            if (pipRadarButton) {
                pipRadarButton.title = t('pipToggleAria');
                pipRadarButton.setAttribute('aria-label', t('pipToggleAria'));
            }
            const pipRecenterButton = document.getElementById('pipRadarRecenter');
            if (pipRecenterButton) {
                pipRecenterButton.title = t('pipRecenterAria');
                pipRecenterButton.setAttribute('aria-label', t('pipRecenterAria'));
            }
        }

        function redactedEndpoint(input) {
            try {
                const url = new URL(typeof input === 'string' ? input : input.url, location.href);
                const path = url.pathname.replace(
                    /-?\d{1,3}(?:\.\d+)?(?:,|%2C)-?\d{1,3}(?:\.\d+)?/gi,
                    '[coordinates]'
                );
                return `${url.origin}${path}`;
            } catch {
                return 'invalid request endpoint';
            }
        }

        function recordRequestDiagnostic(input, startedAt, result, status = null) {
            diagnosticsState.requests.unshift({
                endpoint: redactedEndpoint(input),
                startedAt: new Date(startedAt).toISOString(),
                durationMs: Math.max(0, Date.now() - startedAt),
                result: safeText(result, 80),
                status: Number.isInteger(status) ? status : null
            });
            diagnosticsState.requests = diagnosticsState.requests.slice(0, 12);
            renderDiagnostics();
        }

        function diagnosticAge(validAt) {
            if (!validAt) return 'No provider timestamp';
            const minutes = Math.round((Date.now() - new Date(validAt).getTime()) / 60000);
            if (!Number.isFinite(minutes)) return 'Invalid provider timestamp';
            if (minutes < 0) return `${Math.abs(minutes)} min in the future`;
            return `${minutes} min old`;
        }

        function diagnosticsSnapshot() {
            const capability = RADAR_CAPABILITIES[settings.source] || RADAR_CAPABILITIES.mrms;
            const frame = frames[currentFrame];
            const validAt = frame?.time ? new Date(frame.time * 1000).toISOString() : null;
            return {
                generatedAt: new Date().toISOString(),
                appVersion: document.querySelector('meta[name="application-version"]')?.content || 'unknown',
                radar: {
                    provider: capability.label,
                    source: settings.source,
                    product: settings.radarProduct,
                    state: diagnosticsState.provider.state,
                    message: diagnosticsState.provider.message,
                    statusUpdatedAt: diagnosticsState.provider.updatedAt,
                    validAt,
                    age: diagnosticAge(validAt),
                    coverage: document.getElementById('coverageStatusText')?.textContent || capability.coverage.label,
                    refreshCompletedAt: lastRefreshTime ? new Date(lastRefreshTime).toISOString() : null,
                    frames: {
                        current: frames.length ? currentFrame + 1 : 0,
                        total: frames.length,
                        loaded: framesLoaded || frameLayers.filter(Boolean).length
                    },
                    retryable: diagnosticsState.provider.retryable,
                    retryBackoffMs: rateLimiter.getBackoffMs(frameLayers[currentFrame]?._stormviewBackoffKey)
                },
                resources: {
                    activeRequests: activeRequests.size,
                    activeLayerRequests: layerRequests.size,
                    performance: { ...diagnosticsState.performance },
                    frameLayerCount: frameLayers.filter(Boolean).length,
                    preload: {
                        configured: settings.preloadWindow,
                        effective: effectivePreloadWindow(settings.preloadWindow, settings.reducedData),
                        mounted: frameLayers.filter(layer => layer && map.hasLayer(layer)).length
                    },
                    splitView: {
                        active: settings.splitView,
                        comparison: comparisonLocation().name || 'custom view',
                        radarLayer: Boolean(compareRadarLayer),
                        alertFeatures: compareAlertLayer?.getLayers?.().length || 0
                    },
                    pictureInPicture: {
                        active: settings.pipRadar,
                        followingPrimary: pipFollowPrimary,
                        radarLayer: Boolean(pipRadarLayer),
                        alertFeatures: pipAlertLayer?.getLayers?.().length || 0
                    },
                    tileCache: {
                        ...tileCacheState,
                        ...tileCacheMetrics
                    },
                    featureCounts: { ...diagnosticsState.layerCounts },
                    overlayStates: Object.fromEntries(Object.entries(diagnosticsState.layerStates).map(([name, value]) => [
                        name,
                        { ...value }
                    ])),
                    tileBackoff: rateLimiter.snapshot(),
                    storagePersistence: normalizeStoragePersistence(storagePersistence),
                    level2Integrity: level2Integrity ? { ...level2Integrity } : null
                },
                requests: diagnosticsState.requests.map(request => ({ ...request }))
            };
        }

        function renderDiagnostics() {
            const providerElement = document.getElementById('diagProvider');
            if (!providerElement || typeof settings === 'undefined' || typeof rateLimiter === 'undefined') return;
            const report = diagnosticsSnapshot();
            const product = report.radar.product || 'reflectivity';
            document.getElementById('diagVersion').textContent = report.appVersion;
            providerElement.textContent = `${report.radar.provider} / ${product}`;
            document.getElementById('diagState').textContent = `${localizedStaticText(report.radar.state)}: ${report.radar.message}`;
            document.getElementById('diagFreshness').textContent = report.radar.validAt
                ? `${formatLocalizedDate(report.radar.validAt, { dateStyle: 'short', timeStyle: 'medium' })} · ${report.radar.age}`
                : report.radar.age;
            document.getElementById('diagCoverage').textContent = report.radar.coverage;
            const featureTotal = Object.values(report.resources.featureCounts).reduce((sum, value) => sum + value, 0);
            const cacheMegabytes = (report.resources.tileCache.bytes / (1024 * 1024)).toFixed(1);
            document.getElementById('diagResources').textContent =
                `${report.radar.frames.loaded}/${report.radar.frames.total} frames · ${report.resources.frameLayerCount} layers · preload ±${report.resources.preload.effective} (${report.resources.preload.mounted} mounted) · ${featureTotal} features · ${report.resources.tileCache.count} cached tiles (${cacheMegabytes} MB) · ${report.resources.tileCache.hits} hits / ${report.resources.tileCache.misses} misses · ${report.resources.activeRequests} requests · first frame ${report.resources.performance.firstUsableFrameMs ?? 'pending'} ms · ${report.resources.performance.droppedFrames} dropped · ${report.resources.performance.transferredBytes} bytes`;
            const overlayStates = Object.entries(report.resources.overlayStates)
                .filter(([, value]) => value.state !== 'disabled')
                .sort(([left], [right]) => left.localeCompare(right));
            document.getElementById('diagOverlays').textContent = overlayStates.length
                ? overlayStates.map(([name, value]) => `${getLayerName(name)}: ${localizedStaticText(value.state)}`).join(' · ')
                : t('diagnosticNone');
            document.getElementById('diagRetry').textContent =
                `${report.radar.retryable ? t('diagnosticRetryAvailable') : t('diagnosticNoRetry')} · ${report.radar.retryBackoffMs} ms tile backoff`;
            document.getElementById('diagTileBackoff').textContent = report.resources.tileBackoff.length
                ? report.resources.tileBackoff
                    .map(provider => `${provider.provider} paused until ${formatLocalizedDate(provider.pauseUntil, { timeStyle: 'medium' })}`)
                    .join(' · ')
                : t('diagnosticNoTilePause');
            document.getElementById('diagStoragePersistence').dataset.state = report.resources.storagePersistence;
            document.getElementById('diagStoragePersistence').textContent =
                localizedStaticText(storagePersistenceLabel(report.resources.storagePersistence));
            const integrity = report.resources.level2Integrity;
            const integrityElement = document.getElementById('diagLevel2Integrity');
            integrityElement.dataset.state = integrity ? (integrity.truncated ? 'truncated' : 'complete') : 'unused';
            integrityElement.textContent = integrity
                ? `${integrity.site}: ${integrity.productCuts} ${integrity.product} cut(s), ${integrity.truncated ? 'volume truncated during decode' : 'volume complete'}`
                : t('diagnosticLevel2Unused');

            const requestList = document.getElementById('diagRequests');
            requestList.replaceChildren();
            if (!report.requests.length) {
                const empty = document.createElement('p');
                empty.className = 'setting-hint';
                empty.textContent = t('diagnosticNoRequests');
                requestList.append(empty);
                return;
            }
            report.requests.forEach(request => {
                const row = document.createElement('div');
                row.className = 'diagnostic-request';
                const endpoint = document.createElement('strong');
                endpoint.textContent = request.endpoint;
                const detail = document.createElement('span');
                detail.textContent = `${localizedStaticText(request.result)}${request.status ? ` (${request.status})` : ''} · ${request.durationMs} ms · ${formatLocalizedDate(request.startedAt, { timeStyle: 'medium' })}`;
                row.append(endpoint, detail);
                requestList.append(row);
            });
        }

        function focusableElements(container) {
            return [...container.querySelectorAll(
                'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
            )].filter(element => !element.hidden && element.getClientRects().length > 0);
        }

        function setAccessibleDialog(panel, overlay, open, opener, closeHandler) {
            if (open && activeDialog && activeDialog !== panel) activeDialog._closeDialog?.();
            panel.toggleAttribute('inert', !open);
            panel.setAttribute('aria-hidden', String(!open));
            overlay?.setAttribute('aria-hidden', String(!open));
            if (open) {
                if (activeDialog !== panel) {
                    panel._returnFocus = opener || document.activeElement;
                    panel._modalSiblings = [...document.body.children]
                        .filter(element => element !== panel && element !== overlay && element.tagName !== 'SCRIPT')
                        .map(element => ({ element, wasInert: element.hasAttribute('inert') }));
                    panel._modalSiblings.forEach(({ element }) => element.setAttribute('inert', ''));
                }
                panel._closeDialog = closeHandler;
                activeDialog = panel;
                requestAnimationFrame(() => focusableElements(panel)[0]?.focus());
            } else {
                if (activeDialog === panel) activeDialog = null;
                panel._modalSiblings?.forEach(({ element, wasInert }) => {
                    if (element.isConnected) element.toggleAttribute('inert', wasInert);
                });
                panel._modalSiblings = null;
                const returnFocus = panel._returnFocus;
                panel._returnFocus = null;
                panel._closeDialog = null;
                if (returnFocus?.isConnected) returnFocus.focus();
            }
        }

        function initializeTabList(tabList, tabs, panelForTab, onActivate) {
            const activate = (selected, moveFocus = false) => {
                tabs.forEach(tab => {
                    const active = tab === selected;
                    tab.classList.toggle('active', active);
                    tab.setAttribute('aria-selected', String(active));
                    tab.tabIndex = active ? 0 : -1;
                    const panel = panelForTab(tab);
                    if (panel) {
                        panel.hidden = !active;
                        panel.classList.toggle('active', active);
                    }
                });
                onActivate?.(selected);
                if (moveFocus) selected.focus();
            };

            tabList.setAttribute('aria-orientation', 'horizontal');
            tabs.forEach((tab, index) => {
                tab.addEventListener('click', () => activate(tab));
                tab.addEventListener('keydown', event => {
                    let nextIndex = null;
                    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
                    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
                    if (event.key === 'Home') nextIndex = 0;
                    if (event.key === 'End') nextIndex = tabs.length - 1;
                    if (nextIndex === null) return;
                    event.preventDefault();
                    activate(tabs[nextIndex], true);
                });
            });
            activate(tabs.find(tab => tab.classList.contains('active')) || tabs[0]);
        }

        function accessibleControlLabel(element) {
            return element.getAttribute('aria-label')
                || element.querySelector('.layer-name, .panel-title, .setting-label')?.textContent?.trim()
                || element.closest('.setting-row')?.querySelector('.setting-label')?.textContent?.trim()
                || element.title
                || element.textContent?.trim();
        }

        function syncAccessibleControlStates(root = document) {
            root.querySelectorAll('[data-layer], [data-qt]').forEach(element => {
                const layer = element.dataset.layer || element.dataset.qt;
                const active = Boolean(settings.layers?.[layer]);
                element.classList.toggle('active', active);
                element.setAttribute('aria-checked', String(active));
            });
            root.querySelectorAll('.toggle').forEach(element => {
                element.setAttribute('aria-checked', String(element.classList.contains('on')));
            });
            root.querySelectorAll('.source-tab[data-source]').forEach(element => {
                const active = element.dataset.source === settings.source;
                element.classList.toggle('active', active);
                element.setAttribute('aria-checked', String(active));
            });
            root.querySelectorAll('.layer-chip[data-product]').forEach(element => {
                const active = element.dataset.product === settings.radarProduct;
                element.classList.toggle('active', active);
                element.setAttribute('aria-checked', String(active));
            });
            root.querySelectorAll('.basemap-btn[data-basemap]').forEach(element => {
                const active = element.dataset.basemap === settings.basemap;
                element.classList.toggle('active', active);
                element.setAttribute('aria-checked', String(active));
            });
            root.querySelectorAll('.panel-header').forEach(element => {
                element.setAttribute('aria-expanded', String(!element.closest('.panel-section')?.classList.contains('collapsed')));
            });
            document.getElementById('bookmarksBtn')?.setAttribute(
                'aria-expanded',
                String(document.getElementById('bookmarksPanel')?.classList.contains('open'))
            );
        }

        function initAccessibility() {
            const buttonNames = {
                mobileFab: 'Open layer controls',
                fcClose: 'Close forecast',
                settingsClose: 'Close settings',
                speedBtn: 'Playback speed',
                dataStatus: 'Radar provider status'
            };
            document.querySelectorAll('button').forEach(button => {
                if (!button.getAttribute('aria-label') && !button.textContent.trim()) {
                    button.setAttribute('aria-label', buttonNames[button.id] || button.title || 'Control');
                }
            });

            document.querySelectorAll('.toggle').forEach(element => {
                element.setAttribute('role', 'switch');
                element.setAttribute('aria-label', accessibleControlLabel(element) || 'Setting');
            });
            document.querySelectorAll('[data-layer], [data-qt]').forEach(element => {
                element.setAttribute('role', element.dataset.qt ? 'switch' : 'checkbox');
                element.setAttribute('aria-label', accessibleControlLabel(element) || getLayerName(element.dataset.layer || element.dataset.qt));
            });
            document.querySelectorAll('.source-tab[data-source], .layer-chip[data-product], .basemap-btn[data-basemap]').forEach(element => {
                element.setAttribute('role', 'radio');
                element.setAttribute('aria-label', accessibleControlLabel(element));
            });
            document.querySelectorAll('.panel-header, #timestampTz').forEach(element => {
                element.setAttribute('role', 'button');
                element.setAttribute('aria-label', accessibleControlLabel(element) || 'Toggle section');
            });

            document.querySelectorAll('[role="button"], [role="switch"], [role="checkbox"], [role="radio"]').forEach(element => {
                if (!(element instanceof HTMLButtonElement) && !element.hasAttribute('tabindex')) element.tabIndex = 0;
                if (element.dataset.a11yKeyboard === 'true') return;
                element.dataset.a11yKeyboard = 'true';
                element.addEventListener('keydown', event => {
                    if ((event.key === 'Enter' || event.key === ' ') && element.getAttribute('aria-disabled') !== 'true') {
                        event.preventDefault();
                        element.click();
                    }
                });
            });

            document.getElementById('bookmarksBtn')?.setAttribute('aria-controls', 'bookmarksPanel');
            document.getElementById('bookmarksBtn')?.setAttribute('aria-haspopup', 'true');
            document.getElementById('settingsBtn')?.setAttribute('aria-controls', 'settingsPanel');
            document.getElementById('sidebarToggle')?.setAttribute('aria-controls', 'sidebar');
            document.getElementById('sidebarToggle')?.setAttribute('aria-expanded', 'false');
            syncAccessibleControlStates();

            document.addEventListener('click', () => queueMicrotask(() => syncAccessibleControlStates()), true);
            document.addEventListener('keydown', event => {
                if (!activeDialog) return;
                if (event.key === 'Escape') {
                    event.preventDefault();
                    activeDialog._closeDialog?.();
                    return;
                }
                if (event.key !== 'Tab') return;
                const focusable = focusableElements(activeDialog);
                if (!focusable.length) {
                    event.preventDefault();
                    activeDialog.focus();
                    return;
                }
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            });
        }

        function safeText(value, maxLength = 500) {
            if (value === null || value === undefined) return '';
            return String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, maxLength);
        }

        function escapeHTML(value, maxLength = 500) {
            return safeText(value, maxLength).replace(/[&<>"']/g, character => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            })[character]);
        }

        function finiteNumber(value, min, max, fallback = 0) {
            const number = Number(value);
            return Number.isFinite(number) && number >= min && number <= max ? number : fallback;
        }

        function formatExternalDate(value, fallback = 'Unknown') {
            const date = new Date(value);
            return Number.isFinite(date.getTime())
                ? formatLocalizedDate(date, { dateStyle: 'short', timeStyle: 'short' })
                : fallback;
        }

        function providerEpochSeconds(value, provider) {
            const timestamp = new Date(value).getTime();
            if (!Number.isFinite(timestamp)) throw new Error(`${provider} did not provide a valid timestamp`);
            return timestamp / 1000;
        }

        function featureList(payload, maxItems = 3000) {
            return Array.isArray(payload?.features)
                ? payload.features.filter(feature => feature && typeof feature === 'object').slice(0, maxItems)
                : [];
        }

        function pointFeaturesInView(payload, maxItems = MAX_POINT_FEATURES) {
            const bounds = map?.getBounds();
            const cells = new Set();
            const cellSize = Math.max(0.1, 8 / Math.max(map?.getZoom() || 5, 1));
            return featureList(payload, maxItems * 4).flatMap(feature => {
                if (feature.geometry?.type !== 'Point' || !Array.isArray(feature.geometry.coordinates)) return [];
                const [lon, lat] = feature.geometry.coordinates.map(Number);
                if (!Number.isFinite(lat) || !Number.isFinite(lon) || !bounds?.contains([lat, lon])) return [];
                const cell = `${Math.floor(lat / cellSize)}:${Math.floor(lon / cellSize)}`;
                if (cells.has(cell)) return [];
                cells.add(cell);
                return [feature];
            }).slice(0, maxItems);
        }

        function setLayerRequestState(name, state, message = '', retryable = false) {
            diagnosticsState.layerStates[name] = {
                state,
                message: safeText(message, 160),
                retryable: Boolean(retryable),
                updatedAt: new Date().toISOString()
            };
            document.querySelectorAll(`[data-layer="${name}"]`).forEach(element => {
                element.dataset.loadState = state;
                element.toggleAttribute('aria-busy', state === 'loading' || state === 'retrying');
            });
            renderDiagnostics();
        }

        function beginLayerRequest(name, trackState = false) {
            layerRequests.get(name)?.abort(new DOMException('Layer request superseded', 'AbortError'));
            const controller = new AbortController();
            const generation = (layerRequestGenerations.get(name) || 0) + 1;
            layerRequestGenerations.set(name, generation);
            controller._stormviewGeneration = generation;
            controller._stormviewTrackState = trackState;
            layerRequests.set(name, controller);
            if (trackState) {
                const priorState = diagnosticsState.layerStates[name]?.state;
                const state = ['failed', 'stale'].includes(priorState) ? 'retrying' : 'loading';
                setLayerRequestState(name, state, `${getLayerName(name)} request generation ${generation}`);
            }
            return controller;
        }

        function isLayerRequestCurrent(name, controller) {
            return layerRequests.get(name) === controller
                && !controller.signal.aborted
                && Boolean(settings.layers[name]);
        }

        function finishLayerRequest(name, controller) {
            if (layerRequests.get(name) === controller) layerRequests.delete(name);
        }

        function disposeOverlayLayer(layer) {
            if (!layer) return;
            if (map.hasLayer(layer)) map.removeLayer(layer);
            layer.off?.();
            layer.clearLayers?.();
        }

        function overlayLayerById(id) {
            return id === 'localOverlay' ? localOverlayLayer : layerRefs[id];
        }

        function applyOverlayOpacity(id) {
            if (!OVERLAY_OPACITY_LAYER_IDS.includes(id)) return;
            applyLayerOpacity(overlayLayerById(id), settings.layerOpacity[id]);
        }

        function scheduleOverlayOpacityApply(event) {
            if (event?.layer) pendingOpacityLayers.add(event.layer);
            if (overlayOpacityApplyFrame !== null) return;
            overlayOpacityApplyFrame = requestAnimationFrame(() => {
                overlayOpacityApplyFrame = null;
                const addedLayers = [...pendingOpacityLayers];
                pendingOpacityLayers.clear();
                OVERLAY_OPACITY_LAYER_IDS.forEach(id => {
                    const overlay = overlayLayerById(id);
                    if (overlay && addedLayers.some(layer => layer === overlay || overlay.hasLayer?.(layer))) {
                        applyOverlayOpacity(id);
                    }
                });
            });
        }

        function commitOverlayLayer(name, controller, nextLayer, featureCount, message) {
            if (!isLayerRequestCurrent(name, controller)) {
                disposeOverlayLayer(nextLayer);
                return false;
            }
            disposeOverlayLayer(layerRefs[name]);
            layerRefs[name] = nextLayer.addTo(map);
            setLayerFeatureCount(name, featureCount);
            setLayerRequestState(name, 'current', message);
            return true;
        }

        function clearOverlayLayer(name) {
            disposeOverlayLayer(layerRefs[name]);
            layerRefs[name] = null;
            setLayerFeatureCount(name, 0);
        }

        function failOverlayRequest(name, error) {
            const stale = Boolean(layerRefs[name]);
            if (!stale) setLayerFeatureCount(name, 0);
            setLayerRequestState(
                name,
                stale ? 'stale' : 'failed',
                `${getLayerName(name)} ${stale ? 'refresh failed; showing prior data' : 'load failed'}: ${safeText(error?.message || 'request failed', 100)}`,
                true
            );
        }

        function conusViewportBbox() {
            const bounds = map.getBounds();
            const west = Math.max(-125, bounds.getWest());
            const south = Math.max(24, bounds.getSouth());
            const east = Math.min(-66, bounds.getEast());
            const north = Math.min(50, bounds.getNorth());
            const values = west < east && south < north ? [west, south, east, north] : [-125, 24, -66, 50];
            return values.map(value => value.toFixed(4)).join(',');
        }

        function validateSettingsPayload(candidate) {
            if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
                throw new Error('Settings must be a JSON object');
            }

            const result = {
                ...settings,
                layers: { ...settings.layers },
                layerOpacity: { ...settings.layerOpacity },
                compareLocation: { ...settings.compareLocation },
                visualPalette: settings.visualPalette
            };
            const enumFields = {
                source: Object.keys(RADAR_CAPABILITIES),
                radarProduct: ['reflectivity', 'velocity', 'echoTops', 'precipAccum', 'precipRate', 'differentialReflectivity', 'correlationCoefficient'],
                basemap: ['dark', 'light', 'satellite', 'terrain', 'clean'],
                theme: ['dark', 'light'],
                visualPalette: ['standard', 'highContrast', 'colorblind'],
                language: ['en', 'es'],
                units: ['us', 'metric'],
                alertAudioSeverity: ['extreme', 'severe', 'moderate', 'minor', 'unknown'],
                alertAudioType: ['tornado', 'warnings', 'watchesWarnings', 'all'],
                alertAudioArea: ['mapCenter', 'geofences']
            };
            Object.entries(enumFields).forEach(([key, allowed]) => {
                if (typeof candidate[key] === 'string' && allowed.includes(candidate[key])) result[key] = candidate[key];
            });

            ['loop', 'autoRefresh', 'showLegend', 'highResMode', 'useLocalTime', 'alertAudioEnabled', 'reducedData', 'splitView', 'pipRadar'].forEach(key => {
                if (typeof candidate[key] === 'boolean') result[key] = candidate[key];
            });
            ['smooth', 'snowColor'].forEach(key => {
                if (candidate[key] === 0 || candidate[key] === 1) result[key] = candidate[key];
            });

            result.opacity = finiteNumber(candidate.opacity, 0.3, 1, result.opacity);
            result.delay = finiteNumber(candidate.delay, 200, 1200, result.delay);
            result.preloadWindow = normalizePreloadWindow(candidate.preloadWindow, result.preloadWindow);
            result.compareLocation = normalizeComparisonLocation(candidate.compareLocation, result.compareLocation);
            result.stateBorderWidth = finiteNumber(candidate.stateBorderWidth, 0, 8, result.stateBorderWidth);
            result.countyBorderWidth = finiteNumber(candidate.countyBorderWidth, 0, 8, result.countyBorderWidth);
            result.borderOpacity = finiteNumber(candidate.borderOpacity, 0, 1, result.borderOpacity);
            result.layerOpacity = normalizeLayerOpacities(
                candidate.layerOpacity,
                OVERLAY_OPACITY_LAYER_IDS,
                result.layerOpacity
            );
            result.alertAudioDistanceMiles = [0, 25, 50, 100, 250, 500].includes(Number(candidate.alertAudioDistanceMiles))
                ? Number(candidate.alertAudioDistanceMiles)
                : result.alertAudioDistanceMiles;
            if (typeof candidate.owmKey === 'string') result.owmKey = safeText(candidate.owmKey.trim(), 256);
            if (typeof candidate.level2Site === 'string' && /^(?:|[A-Z]{4})$/.test(candidate.level2Site)) {
                result.level2Site = candidate.level2Site;
            }
            // null means "lowest cut". Anything else must be a real elevation index.
            if (typeof candidate.compareProduct === 'string') {
                result.compareProduct = normalizeComparisonProduct(candidate.compareProduct, result.radarProduct);
            }
            if (candidate.level2Tilt === null) {
                result.level2Tilt = null;
            } else if (Number.isInteger(candidate.level2Tilt) && candidate.level2Tilt >= 1 && candidate.level2Tilt <= 25) {
                result.level2Tilt = candidate.level2Tilt;
            }

            if (candidate.layers && typeof candidate.layers === 'object' && !Array.isArray(candidate.layers)) {
                Object.keys(result.layers).forEach(key => {
                    if (typeof candidate.layers[key] === 'boolean') result.layers[key] = candidate.layers[key];
                });
            }

            if (!RADAR_CAPABILITIES[result.source].products.includes(result.radarProduct)) {
                result.radarProduct = RADAR_CAPABILITIES[result.source].products[0];
            }
            return result;
        }

        function migrateSettingsPayload(payload) {
            if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
                throw new Error('Settings must be a JSON object');
            }

            let candidate = payload;
            if (Object.hasOwn(payload, 'schemaVersion')) {
                const version = Number(payload.schemaVersion);
                if (!Number.isInteger(version) || version < 1) throw new Error('Settings schema version is invalid');
                if (version > SETTINGS_SCHEMA_VERSION) {
                    throw new Error(`Settings require schema version ${version}; this app supports ${SETTINGS_SCHEMA_VERSION}`);
                }
                candidate = payload.settings;
            }

            if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
                throw new Error('Settings payload is missing');
            }

            const migrated = {
                ...candidate,
                layers: candidate.layers && typeof candidate.layers === 'object'
                    ? { ...candidate.layers }
                    : candidate.layers
            };
            const basemapMigrations = { topo: 'terrain', darkNolabels: 'clean' };
            if (basemapMigrations[migrated.basemap]) migrated.basemap = basemapMigrations[migrated.basemap];
            if (migrated.source === 'noaa') migrated.source = 'nowcoast';
            return validateSettingsPayload(migrated);
        }

        function settingsRecord(settingsValue = settings) {
            return {
                schemaVersion: SETTINGS_SCHEMA_VERSION,
                settings: validateSettingsPayload(settingsValue)
            };
        }

        async function fetchWithTimeout(input, init = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
            const controller = new AbortController();
            const requestKey = typeof input === 'string' ? input : input.url;
            const startedAt = Date.now();
            let diagnosticResult = 'cancelled';
            let diagnosticStatus = null;
            activeRequests.get(requestKey)?.abort(new DOMException('Superseded request', 'AbortError'));
            activeRequests.set(requestKey, controller);
            const callerSignal = init.signal;
            const abortFromCaller = () => controller.abort(callerSignal.reason);
            if (callerSignal?.aborted) abortFromCaller();
            else callerSignal?.addEventListener('abort', abortFromCaller, { once: true });

            const timeoutId = setTimeout(() => {
                controller.abort(new DOMException(`Request timed out after ${timeoutMs}ms`, 'TimeoutError'));
            }, timeoutMs);

            try {
                const response = await window.fetch(input, { ...init, signal: controller.signal });
                diagnosticStatus = response.status;
                const contentLength = Number(response.headers.get('content-length'));
                if (Number.isFinite(contentLength) && contentLength > 0) {
                    diagnosticsState.performance.transferredBytes += contentLength;
                }
                if (!response.ok) {
                    diagnosticResult = 'HTTP error';
                    throw new Error(`HTTP ${response.status} ${response.statusText || 'request failed'}`);
                }
                diagnosticResult = 'success';
                return response;
            } catch (error) {
                diagnosticResult = error?.name === 'AbortError' ? 'cancelled' : safeText(error?.message || 'request failed', 80);
                throw error;
            } finally {
                clearTimeout(timeoutId);
                callerSignal?.removeEventListener('abort', abortFromCaller);
                if (activeRequests.get(requestKey) === controller) activeRequests.delete(requestKey);
                recordRequestDiagnostic(input, startedAt, diagnosticResult, diagnosticStatus);
            }
        }

        function abortableDelay(ms, signal) {
            return new Promise((resolve, reject) => {
                if (signal?.aborted) {
                    reject(signal.reason || new DOMException('Request cancelled', 'AbortError'));
                    return;
                }
                const timeoutId = setTimeout(resolve, ms);
                signal?.addEventListener('abort', () => {
                    clearTimeout(timeoutId);
                    reject(signal.reason || new DOMException('Request cancelled', 'AbortError'));
                }, { once: true });
            });
        }

        async function searchNominatim(query, signal) {
            const waitMs = Math.max(0, nextNominatimRequestAt - Date.now());
            if (waitMs) await abortableDelay(waitMs, signal);
            nextNominatimRequestAt = Date.now() + NOMINATIM_REQUEST_INTERVAL_MS;

            const params = new URLSearchParams({
                format: 'jsonv2',
                countrycodes: 'us',
                q: query,
                limit: '5',
                email: NOMINATIM_CONTACT
            });
            return fetchWithTimeout(`https://nominatim.openstreetmap.org/search?${params}`, {
                signal,
                headers: { 'Accept-Language': navigator.language || 'en-US' }
            });
        }
        
        // Advanced Hybrid Radar System with Smart Caching
        const radarSystem = {
            // Layers
            mrmsBase: null,
            mrmsComposite: null,
            rainviewerLayer: null,
            
            // Cached base layers (low-res for fallback)
            cachedBaseLayers: [],
            
            // State
            highZoomMode: false,
            currentZoom: 5,
            isUS: true,
            isPreloading: false,
            
            // Thresholds
            HIGH_ZOOM_THRESHOLD: 8,
            MRMS_PRIMARY_ZOOM: 10,
            BASE_CACHE_ZOOM: 5,
            
            // Tile configuration - optimized for memory
            tileConfig: {
                keepBuffer: 2,
                updateWhenZooming: false,
                updateWhenIdle: true,
                maxNativeZoom: 12,
                maxZoom: 18
            },
            
            // MRMS tile sources (Iowa State Mesonet)
            sources: {
                n0q: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png',
                n0r: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0r-900913/{z}/{x}/{y}.png',
                ridge: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::USCOMP-N0Q-0/{z}/{x}/{y}.png'
            }
        };

        const layerRefs = {
            // Weather
            alerts: null, spcOutlook: null, stormReports: null, stormTracks: null, couplets: null, hailMesh: null,
            lightning: null, satellite: null, satelliteIR: null, satelliteWV: null,
            satelliteGeoColor: null, satelliteSandwich: null, satelliteMesoscale: null,
            riverGauges: null, surfaceObs: null,
            temp: null, wind: null, clouds: null, pressure: null,
            
            // New layers
            spcWatches: null, spcMCD: null,
            spcTornado: null, spcWind: null, spcHail: null,
            tropical: null, tropicalCone: null, tropicalTrack: null,
            velocity: null, echoTops: null, precipAccum: null,
            sigmets: null,
            satelliteIR: null, satelliteWV: null,
            
            // Map overlays
            states: null, counties: null, labels: null, highways: null, geofences: null
        };
        let localOverlayLayer = null;
        let localOverlayVisible = false;
        let localOverlayName = '';
        let localOverlayFeatureCount = 0;

        const dataCache = { statesGeo: null, countiesGeo: null };

        const OVERLAY_OPACITY_LAYER_IDS = Object.freeze([
            'alerts', 'spcOutlook', 'stormReports', 'stormTracks', 'couplets', 'hailMesh',
            'lightning', 'satellite', 'satelliteIR', 'satelliteWV', 'satelliteGeoColor',
            'satelliteSandwich', 'satelliteMesoscale', 'riverGauges', 'surfaceObs',
            'spcWatches', 'spcMCD', 'spcTornado', 'spcWind', 'spcHail', 'tropical',
            'sigmets', 'temp', 'wind', 'clouds', 'pressure', 'states', 'counties',
            'labels', 'highways', 'geofences', 'localOverlay'
        ]);
        const DEFAULT_LAYER_OPACITY = Object.freeze(Object.fromEntries(
            OVERLAY_OPACITY_LAYER_IDS.map(id => [id, 1])
        ));
        
        // HRRR state
        let hrrrInitTime = null;
        let hrrrFrames = [];

        const settings = {
            // Observed radar on a dark basemap. A first visit should show what
            // is happening now, not model guidance, and radar colours need a
            // low-chroma ground to read against.
            source: 'mrms',
            radarProduct: 'reflectivity', // reflectivity, velocity, echoTops, precipAccum
            basemap: 'dark',
            theme: 'dark',
            visualPalette: 'standard',
            language: 'en',
            units: 'us',
            level2Site: '',
            level2Tilt: null,
            opacity: 0.85,
            smooth: 1,
            snowColor: 1,
            delay: 600,
            preloadWindow: 4,
            splitView: false,
            compareProduct: '',
            pipRadar: false,
            compareLocation: { ...DEFAULT_COMPARISON_LOCATION },
            loop: true,
            autoRefresh: true,
            showLegend: true,
            highResMode: true,
            reducedData: false,
            alertAudioEnabled: false,
            alertAudioSeverity: 'severe',
            alertAudioType: 'warnings',
            alertAudioDistanceMiles: 100,
            alertAudioArea: 'mapCenter',
            owmKey: '',
            useLocalTime: true,
            stateBorderWidth: 2,
            countyBorderWidth: 1,
            borderOpacity: 0.6,
            layerOpacity: { ...DEFAULT_LAYER_OPACITY },
            layers: {
                // Core weather
                radar: true, alerts: true, spcOutlook: true, stormReports: false, stormTracks: false, couplets: true, hailMesh: false,
                lightning: false, satellite: false, riverGauges: false, surfaceObs: false,
                
                // Model data (requires API)
                temp: false, wind: false, clouds: false, pressure: false,
                
                // Enhanced SPC
                spcWatches: false, spcMCD: false,
                spcTornado: false, spcWind: false, spcHail: false,
                
                // Tropical
                tropical: false,
                
                // Additional radar products
                velocity: false, echoTops: false, precipAccum: false,
                
                // Aviation
                sigmets: false,
                
                // Satellite channels
                satelliteIR: false, satelliteWV: false, satelliteGeoColor: false,
                satelliteSandwich: false, satelliteMesoscale: false,
                
                // Map overlays
                states: true, counties: true, labels: true, highways: false, geofences: false
            }
        };

        // ==================== INITIALIZATION ====================
        async function init() {
            loadSettings();
            applyEmbedConfiguration(settings, embedConfig);
            applyEmbedMode();
            applyTheme();
            applyVisualPalette();
            initMap();
            loadStoredGeofences();
            setupZoomHandler();
            initRadarSystem();
            initUI();
            applyLanguage();
            initPwaInstallPrompt();
            await initOfflineFallback();
            initSidebarDrawer();
            initForecastPanel();
            initQuickToolbar();
            initSplitView();
            initPipRadar();
            initChasecaster();
            initTrainingOverlays();
            initAnimationExport();
            initBookmarks();
            initAccessibility();
            updatePlaybackVisibility();
            if (settings.layers.radar) await loadRadarData();
            
            Object.keys(settings.layers).forEach(layer => {
                if (settings.layers[layer] && layer !== 'radar') {
                    if (settings.reducedData && REDUCED_DATA_OPTIONAL_LAYERS.has(layer)) {
                        handleLayerToggle(layer, false, true);
                        return;
                    }
                    handleLayerToggle(layer, true, true);
                }
            });
            
            hideLoading();
            startAutoRefresh();
            
            // Show keyboard hints on first visit
            if (!embedConfig) {
                const welcomed = localStorage.getItem(WELCOME_STORAGE_KEY)
                    || LEGACY_WELCOME_KEYS.some(key => localStorage.getItem(key));
                if (welcomed) {
                    localStorage.setItem(WELCOME_STORAGE_KEY, '1');
                    LEGACY_WELCOME_KEYS.forEach(key => localStorage.removeItem(key));
                } else {
                    setTimeout(() => {
                        showToast('Tip: Click anywhere on the map for a 7-day forecast! Space = play/pause, Arrows = step frames', 'info', 6000);
                        localStorage.setItem(WELCOME_STORAGE_KEY, '1');
                    }, 2500);
                }
            }
        }

        function applyEmbedMode() {
            if (!embedConfig) return;
            document.body.classList.add('embed-mode');
            document.body.classList.toggle('embed-controls', embedConfig.controls);
            document.body.classList.toggle('embed-legend', embedConfig.controls && embedConfig.legend);
            document.body.classList.toggle('embed-radar', embedConfig.layers.includes('radar'));
            document.body.dataset.embedSource = embedConfig.source;
            document.body.dataset.embedProduct = embedConfig.product;
            document.body.dataset.embedLayers = embedConfig.layers.join(',');
            const brand = document.getElementById('embedBrand');
            if (brand) brand.href = new URL(location.pathname, location.origin).href;
        }

        function loadSettings() {
            let sourceKey = SETTINGS_STORAGE_KEY;
            try {
                let s = localStorage.getItem(SETTINGS_STORAGE_KEY);
                if (!s) {
                    sourceKey = LEGACY_SETTINGS_KEYS.find(key => localStorage.getItem(key)) || SETTINGS_STORAGE_KEY;
                    s = sourceKey === SETTINGS_STORAGE_KEY ? null : localStorage.getItem(sourceKey);
                }
                if (!s) return;
                if (new Blob([s]).size > MAX_SETTINGS_BYTES) throw new Error('Stored settings exceed the size limit');
                Object.assign(settings, migrateSettingsPayload(JSON.parse(s)));
                if (sourceKey !== SETTINGS_STORAGE_KEY && saveSettings()) {
                    LEGACY_SETTINGS_KEYS.forEach(key => localStorage.removeItem(key));
                }
            } catch(e) {
                console.warn('Stored settings were ignored:', e);
                showToast(`Stored settings were ignored: ${safeText(e.message, 120)}`, 'error', 6000);
            }
        }

        function saveSettings() {
            if (embedConfig) return true;
            try {
                localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsRecord()));
                return true;
            } catch(e) {
                console.error('Settings could not be saved:', e);
                if (document.body) showToast('Settings could not be saved. Free browser storage or export and reset settings.', 'error', 6000);
                return false;
            }
        }

        function normalizeGeofence(value) {
            const latitude = Number(value?.latitude);
            const longitude = Number(value?.longitude);
            const radiusMiles = Number(value?.radiusMiles);
            const id = safeText(value?.id, 64);
            const name = safeText(value?.name, 80).trim();
            if (!id || !/^[A-Za-z0-9-]+$/.test(id) || !name
                || !Number.isFinite(latitude) || latitude < -90 || latitude > 90
                || !Number.isFinite(longitude) || longitude < -180 || longitude > 180
                || ![5, 10, 25, 50].includes(radiusMiles)) return null;
            return { id, name, latitude, longitude, radiusMiles };
        }

        function loadStoredGeofences() {
            try {
                const stored = localStorage.getItem(GEOFENCE_STORAGE_KEY);
                if (!stored) return;
                if (new Blob([stored]).size > MAX_SETTINGS_BYTES) throw new Error('Geofence storage exceeds the size limit');
                const parsed = JSON.parse(stored);
                if (!Array.isArray(parsed)) throw new Error('Geofences must be a JSON array');
                geofences = parsed.slice(0, MAX_GEOFENCES).map(normalizeGeofence).filter(Boolean);
            } catch (error) {
                geofences = [];
                console.warn('Stored geofences were ignored:', error);
                showToast('Stored geofences were invalid and were ignored', 'error', 5000);
            }
        }

        function saveGeofences() {
            try {
                localStorage.setItem(GEOFENCE_STORAGE_KEY, JSON.stringify(geofences));
                return true;
            } catch (error) {
                console.error('Geofences could not be saved:', error);
                showToast('Geofences could not be saved. Free browser storage and try again.', 'error', 6000);
                return false;
            }
        }

        function loadGeofenceLayer() {
            removeLayer('geofences');
            if (!settings.layers.geofences) return;
            const group = L.layerGroup();
            const renderer = L.svg({ padding: 0.5 });
            group.addLayer(renderer);
            geofences.forEach(geofence => {
                const circle = L.circle([geofence.latitude, geofence.longitude], {
                    className: 'user-geofence',
                    renderer,
                    radius: geofence.radiusMiles * 1609.344,
                    color: '#38bdf8',
                    weight: 2,
                    dashArray: '7 5',
                    fillColor: '#38bdf8',
                    fillOpacity: 0.08
                });
                circle.bindTooltip(escapeHTML(geofence.name, 80), { direction: 'top' });
                circle.bindPopup(`
                    <div class="popup-content">
                        <h4>${escapeHTML(geofence.name, 80)}</h4>
                        <p>Local alert geofence · ${geofence.radiusMiles} mi / ${Math.round(geofence.radiusMiles * 1.609344)} km</p>
                        <div class="meta">Stored only in this browser profile</div>
                    </div>
                `);
                group.addLayer(circle);
            });
            layerRefs.geofences = group.addTo(map);
            setLayerFeatureCount('geofences', geofences.length);
        }

        function renderGeofenceList() {
            const list = document.getElementById('geofenceList');
            if (!list) return;
            if (!geofences.length) {
                list.innerHTML = `<div class="setting-hint">${escapeHTML(localizedStaticText('No saved geofences.'))}</div>`;
                return;
            }
            list.innerHTML = geofences.map(geofence => `
                <div class="geofence-item">
                    <button class="geofence-item-info" type="button" data-geofence-focus="${geofence.id}" style="border:0;background:none;color:inherit;text-align:left;cursor:pointer;">
                        <div class="geofence-item-name">${escapeHTML(geofence.name, 80)}</div>
                        <div class="geofence-item-meta">${geofence.radiusMiles} mi / ${Math.round(geofence.radiusMiles * 1.609344)} km · ${escapeHTML(localizedStaticText('local only'))}</div>
                    </button>
                    <button class="geofence-delete" type="button" data-geofence-delete="${geofence.id}" aria-label="${escapeHTML(localizedStaticText('Delete'))} ${escapeHTML(geofence.name, 80)}">${escapeHTML(localizedStaticText('Delete'))}</button>
                </div>
            `).join('');
            list.querySelectorAll('[data-geofence-focus]').forEach(button => {
                button.addEventListener('click', () => {
                    const geofence = geofences.find(item => item.id === button.dataset.geofenceFocus);
                    if (geofence) map.flyTo([geofence.latitude, geofence.longitude], Math.max(map.getZoom(), 8));
                });
            });
            list.querySelectorAll('[data-geofence-delete]').forEach(button => {
                button.addEventListener('click', () => {
                    const geofence = geofences.find(item => item.id === button.dataset.geofenceDelete);
                    if (!geofence || !window.confirm(`Delete geofence “${geofence.name}”?`)) return;
                    geofences = geofences.filter(item => item.id !== geofence.id);
                    if (saveGeofences()) {
                        renderGeofenceList();
                        if (settings.layers.geofences) loadGeofenceLayer();
                        showToast(`Deleted geofence: ${geofence.name}`, 'info', 2500);
                    }
                });
            });
        }

        function addGeofenceAtMapCenter() {
            if (geofences.length >= MAX_GEOFENCES) {
                showToast(`Geofences are limited to ${MAX_GEOFENCES}`, 'warn', 4000);
                return;
            }
            const center = map.getCenter();
            const nameInput = document.getElementById('geofenceNameInput');
            const radiusInput = document.getElementById('geofenceRadiusSelect');
            const name = safeText(nameInput.value, 80).trim() || `Geofence ${geofences.length + 1}`;
            const geofence = normalizeGeofence({
                id: crypto.randomUUID?.() || `${Date.now()}-${geofences.length}`,
                name,
                latitude: center.lat,
                longitude: center.lng,
                radiusMiles: Number(radiusInput.value)
            });
            if (!geofence) {
                showToast('Enter a valid geofence name and radius', 'error', 3500);
                return;
            }
            geofences.push(geofence);
            if (!saveGeofences()) {
                geofences.pop();
                return;
            }
            nameInput.value = '';
            settings.layers.geofences = true;
            saveSettings();
            document.querySelectorAll('[data-layer="geofences"]').forEach(element => element.classList.add('active'));
            syncAccessibleControlStates();
            renderGeofenceList();
            loadGeofenceLayer();
            showToast(`Geofence added: ${name}`, 'success', 2500);
        }

        function applyTheme() {
            document.body.classList.toggle('light-theme', settings.theme === 'light');
        }

        function syncVisualPaletteControls() {
            document.querySelectorAll('#colorSchemes [data-visual-palette]').forEach(button => {
                const active = button.dataset.visualPalette === settings.visualPalette;
                button.classList.toggle('active', active);
                button.setAttribute('aria-pressed', String(active));
                const label = button.querySelector('.palette-name')?.textContent?.trim();
                if (label) button.setAttribute('aria-label', label);
            });
            const threatSamples = {
                tornado: { tvs: 'TVS' },
                rotation: { meso: 'MESO' },
                hail: { posh: 70 },
                general: {}
            };
            document.querySelectorAll('[data-storm-threat]').forEach(swatch => {
                swatch.style.background = stormPaletteColor(
                    threatSamples[swatch.dataset.stormThreat],
                    settings.visualPalette
                );
            });
            const legendGradients = {
                standard: 'linear-gradient(to bottom, #ff00ff 0%, #ff0000 15%, #ff6600 25%, #ffc800 35%, #ffff00 45%, #7fff00 55%, #00c800 65%, #00b4ff 75%, #0064ff 85%, #000096 100%)',
                highContrast: 'linear-gradient(to bottom, #fff 0%, #ff1744 18%, #ff9100 34%, #ffe600 48%, #00ff80 65%, #00e5ff 82%, #0014ff 100%)',
                colorblind: 'linear-gradient(to bottom, #fdea45 0%, #cbb778 18%, #a59c8f 34%, #7f8996 48%, #5c6f94 65%, #193b6a 82%, #00204c 100%)'
            };
            const legend = document.querySelector('.legend-gradient');
            if (legend) legend.style.background = legendGradients[settings.visualPalette];
        }

        function applyVisualPalette() {
            settings.visualPalette = normalizeVisualPalette(settings.visualPalette);
            document.body.dataset.visualPalette = settings.visualPalette;
            syncVisualPaletteControls();
        }

        async function refreshVisualPaletteLayers() {
            applyVisualPalette();
            const referenceTime = replayMode && frames[currentFrame]
                ? frames[currentFrame].time * 1000
                : Date.now();
            if (layerRefs.alerts) {
                const tools = await alertFillTools();
                layerRefs.alerts.setStyle(feature => alertPolygonPresentation(feature, tools, referenceTime).style);
                showAlertAgeLegend(currentAlertFeatures, tools, referenceTime);
            }
            refreshComparisonAlerts();
            refreshPipAlerts();
            if (settings.layers.hailMesh) loadHailMesh();
            if (settings.layers.stormTracks && currentStormCells.length) {
                const tools = await stormTrackTools();
                renderStormTracks(currentStormCells, tools);
            }
            if (stormTop3dMode) renderStormTop3d();
            if (settings.source === 'level2' && settings.layers.radar) loadRadarData();
            renderDiagnostics();
        }

        // ==================== MAP ====================
        function initMap() {
            map = L.map('map', {
                center: embedConfig ? [embedConfig.latitude, embedConfig.longitude] : [39, -96],
                zoom: embedConfig?.zoom || 5,
                zoomControl: embedConfig?.controls !== false,
                attributionControl: true,
                preferCanvas: true
            });
            map.zoomControl?.setPosition('bottomleft');
            
            map.createPane('satellitePane');
            map.getPane('satellitePane').style.zIndex = 200;
            
            map.createPane('radarPane');
            map.getPane('radarPane').style.zIndex = 250;

            map.createPane('hailPane');
            map.getPane('hailPane').style.zIndex = 300;
            
            map.createPane('boundaryPane');
            map.getPane('boundaryPane').style.zIndex = 350;
            
            map.createPane('alertPane');
            map.getPane('alertPane').style.zIndex = 450;
            
            map.createPane('markerPane');
            map.getPane('markerPane').style.zIndex = 500;
            
            setBasemap(settings.basemap);
            map.on('moveend', updateCoverageStatus);
            map.on('moveend', () => syncPipToPrimary());
            map.on('moveend', () => updateMobileAlertBanner(currentAlertFeatures));
            map.on('moveend', () => {
                if (settings.layers.stormReports && stormReportPayload) renderStormReports();
            });
            map.on('moveend', () => {
                clearTimeout(roadEventReloadTimeout);
                if (!settings.layers.highways) return;
                roadEventReloadTimeout = setTimeout(loadHighwayEvents, 500);
            });
            map.on('layeradd', scheduleOverlayOpacityApply);
            const updateViewMetadata = () => {
                const center = map.getCenter();
                const container = map.getContainer();
                container.dataset.latitude = center.lat.toFixed(4);
                container.dataset.longitude = center.lng.toFixed(4);
                container.dataset.zoom = String(map.getZoom());
            };
            map.on('moveend zoomend', updateViewMetadata);
            updateViewMetadata();
            updateCoverageStatus();
        }

        function setBasemap(id) {
            if (baseLayer) map.removeLayer(baseLayer);
            
            const selectedId = BASEMAPS[id] ? id : 'dark';
            const basemap = BASEMAPS[selectedId];
            baseLayer = L.tileLayer.cached(basemap.url, {
                attribution: basemap.attribution,
                subdomains: basemap.subdomains || [],
                maxZoom: 19,
                errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
            });
            baseLayer.addTo(map);
            baseLayer.setZIndex(0);

            settings.basemap = selectedId;
            document.querySelectorAll('[data-basemap]').forEach(el => {
                el.classList.toggle('active', el.dataset.basemap === selectedId);
            });
            saveSettings();
            syncAccessibleControlStates();
            refreshComparisonBasemap();
            refreshPipBasemap();
        }

        function comparisonLocation() {
            return normalizeComparisonLocation(settings.compareLocation, DEFAULT_COMPARISON_LOCATION);
        }

        function updateSplitViewLabels() {
            const primary = document.getElementById('primaryMapLabel');
            const comparison = document.getElementById('compareMapTitle');
            if (primary) primary.textContent = primaryLocationName || localizedStaticText('Primary view');
            const product = comparisonProduct();
            const choice = comparisonProductChoice();
            if (comparison) {
                if (product) {
                    comparison.textContent = t('compareProductTitle', { product: radarProductLabel(product) });
                } else if (choice) {
                    comparison.textContent = t('compareProductArchived', { product: radarProductLabel(choice) });
                } else {
                    comparison.textContent = comparisonLocation().name || localizedStaticText('Comparison view');
                }
            }
            const pane = document.getElementById('compareMapPane');
            if (pane) pane.dataset.location = comparisonLocation().name || 'custom view';
        }

        function refreshComparisonBasemap() {
            if (!compareMap || !settings.splitView) return;
            if (compareBaseLayer && compareMap.hasLayer(compareBaseLayer)) compareMap.removeLayer(compareBaseLayer);
            const basemap = BASEMAPS[settings.basemap] || BASEMAPS.dark;
            compareBaseLayer = L.tileLayer.cached(basemap.url, {
                attribution: basemap.attribution,
                subdomains: basemap.subdomains || [],
                maxZoom: 19,
                errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
            }).addTo(compareMap);
            compareBaseLayer.setZIndex(0);
        }

        function removeComparisonRadarLayer() {
            if (compareRadarLayer && compareMap?.hasLayer(compareRadarLayer)) compareMap.removeLayer(compareRadarLayer);
            compareRadarLayer?.off?.();
            compareRadarLayer = null;
            compareRadarSignature = '';
            const container = compareMap?.getContainer?.();
            if (container) {
                container.dataset.radarFrame = '';
                container.dataset.radarSource = '';
            }
        }

        function currentRadarLayerSignature(layer) {
            if (!layer) return '';
            const bounds = layer.getBounds?.();
            return JSON.stringify([
                settings.source,
                settings.radarProduct,
                currentFrame,
                layer._stormviewFrameUrl || layer._url || '',
                layer.wmsParams?.time || '',
                bounds?.isValid?.() ? bounds.toBBoxString() : ''
            ]);
        }

        function cloneRadarLayer(sourceLayer, cloneClassName) {
            const className = `${sourceLayer.options?.className || 'radar-layer'} ${cloneClassName}`.trim();
            const options = {
                ...sourceLayer.options,
                opacity: settings.opacity,
                pane: 'radarPane',
                className
            };
            if (typeof L.TileLayer.WMS === 'function' && sourceLayer instanceof L.TileLayer.WMS) {
                return L.tileLayer.wms(sourceLayer._url, { ...options, ...sourceLayer.wmsParams });
            }
            if (sourceLayer instanceof L.TileLayer) {
                return L.tileLayer.cached(sourceLayer._url, options);
            }
            const bounds = sourceLayer.getBounds?.();
            if (sourceLayer instanceof L.ImageOverlay && bounds?.isValid?.()) {
                if (sourceLayer._stormviewFrameAware && sourceLayer._stormviewFrameUrl) {
                    return createFrameAwareImageOverlay(
                        sourceLayer._stormviewFrameUrl,
                        bounds,
                        options,
                        { trackLoad: false }
                    );
                }
                return L.imageOverlay(sourceLayer._url, bounds, options);
            }
            return null;
        }

        // The comparison pane can either sit over another city or carry another
        // product over this one. Those cannot both be true, so choosing a product
        // takes the city search out of reach until it is set back.
        function syncComparisonProductControl() {
            const select = document.getElementById('compareProductSelect');
            if (!select) return;
            const capability = RADAR_CAPABILITIES[settings.source] || RADAR_CAPABILITIES.mrms;
            const offered = settings.source === 'mrms'
                ? COMPARISON_PRODUCTS.filter(product => product !== settings.radarProduct
                    && capability.products.includes(product))
                : [];
            select.hidden = offered.length === 0;
            const active = comparisonProductChoice();
            // This runs on every comparison refresh, so the options are only
            // rebuilt when they actually change; rebuilding under an open list
            // closes it out from under whoever is reading it.
            const signature = `${languageCode()}|${offered.join(',')}`;
            if (select.dataset.options !== signature) {
                select.dataset.options = signature;
                select.replaceChildren(new Option(t('compareSameProduct'), ''));
                offered.forEach(product => select.add(new Option(radarProductLabel(product), product)));
            }
            if (select.value !== active) select.value = active;
            const search = document.getElementById('compareSearchInput');
            if (search) {
                search.disabled = Boolean(active);
                search.title = active ? t('compareProductLocked') : '';
            }
            if (wiredSelects.has(select)) return;
            wiredSelects.add(select);
            select.addEventListener('change', () => {
                settings.compareProduct = normalizeComparisonProduct(select.value, settings.radarProduct);
                saveSettings();
                compareRadarSignature = null;
                if (settings.compareProduct) syncComparisonViewToPrimary();
                else restoreComparisonLocation();
                refreshComparisonRadar();
                refreshComparisonAlerts();
                updateSplitViewLabels();
            });
        }

        // Only MRMS publishes more than one tiled product, so a second pane can
        // only differ from the primary while that source is selected.
        function comparisonProductChoice() {
            if (settings.source !== 'mrms') return '';
            return normalizeComparisonProduct(settings.compareProduct, settings.radarProduct);
        }

        // The second product comes from the live tile service, which only serves
        // the current scan. IEM's six-hour archive is reflectivity only, so once
        // the timeline is scrubbed back there is no matching frame for the other
        // product and the pane mirrors the primary rather than showing two
        // different times side by side.
        function comparisonProductAvailable() {
            return frames[currentFrame]?.kind !== 'past';
        }

        function comparisonProduct() {
            return comparisonProductAvailable() ? comparisonProductChoice() : '';
        }

        function comparisonProductLayer(product) {
            const url = RADAR_PRODUCTS[mrmsProductTileKey(product)];
            if (!url) return null;
            return L.tileLayer.cached(url, {
                opacity: settings.opacity,
                webgl: true,
                pane: 'radarPane',
                className: 'radar-layer radar-cached compare-radar-layer',
                maxNativeZoom: 8,
                maxZoom: 18,
                keepBuffer: 2,
                updateWhenZooming: false,
                updateWhenIdle: true,
                attribution: IEM_ATTRIBUTION
            });
        }

        // Comparing two products only means anything over the same ground, so the
        // second pane follows the primary view while a product is being compared.
        function publishPrimaryView() {
            const center = map.getCenter();
            map.getContainer().dataset.latitude = center.lat.toFixed(4);
            map.getContainer().dataset.longitude = center.lng.toFixed(4);
        }

        function syncComparisonViewToPrimary() {
            publishPrimaryView();
            if (!compareMap || !settings.splitView || !comparisonProductChoice()) return;
            compareMap.setView(map.getCenter(), map.getZoom(), { animate: false });
        }

        // Clearing the pairing hands the pane back to whichever city it was
        // parked over before the two products took the view.
        function restoreComparisonLocation() {
            if (!compareMap || !settings.splitView) return;
            const location = comparisonLocation();
            if (!location.name) return;
            compareMap.setView([location.latitude, location.longitude], location.zoom, { animate: false });
        }

        function refreshComparisonRadar() {
            syncComparisonProductControl();
            if (!compareMap || !settings.splitView || !settings.layers.radar) {
                removeComparisonRadarLayer();
                return;
            }
            const sourceLayer = frameLayers[currentFrame];
            const signature = currentRadarLayerSignature(sourceLayer);
            if (!signature) {
                removeComparisonRadarLayer();
                return;
            }
            if (signature === compareRadarSignature && compareRadarLayer) {
                compareRadarLayer.setOpacity?.(settings.opacity);
                return;
            }
            removeComparisonRadarLayer();
            const secondProduct = comparisonProduct();
            compareRadarLayer = secondProduct
                ? comparisonProductLayer(secondProduct)
                : cloneRadarLayer(sourceLayer, 'compare-radar-layer');
            if (!compareRadarLayer) return;
            compareRadarSignature = secondProduct ? `${signature}::${secondProduct}` : signature;
            compareRadarLayer.addTo(compareMap);
            compareRadarLayer.setOpacity?.(settings.opacity);
            compareMap.getContainer().dataset.radarFrame = String(currentFrame);
            compareMap.getContainer().dataset.radarSource = settings.source;
            compareMap.getContainer().dataset.radarProduct = secondProduct || settings.radarProduct;
            updateSplitViewLabels();
        }

        async function refreshComparisonAlerts() {
            const generation = ++compareAlertGeneration;
            if (compareAlertLayer && compareMap?.hasLayer(compareAlertLayer)) compareMap.removeLayer(compareAlertLayer);
            compareAlertLayer?.off?.();
            compareAlertLayer = null;
            if (!compareMap || !settings.splitView || !settings.layers.alerts || !currentAlertFeatures.length) return;
            try {
                const tools = await alertFillTools();
                if (generation !== compareAlertGeneration || !settings.splitView) return;
                const referenceTime = replayMode && frames[currentFrame]
                    ? frames[currentFrame].time * 1000
                    : Date.now();
                compareAlertLayer = L.geoJSON(currentAlertFeatures, {
                    pane: 'alertPane',
                    style: feature => alertPolygonPresentation(feature, tools, referenceTime).style,
                    onEachFeature: (feature, layer) => {
                        layer.bindTooltip(escapeHTML(feature.properties?.event || feature.properties?.ps || 'Weather alert', 120));
                    }
                }).addTo(compareMap);
            } catch (error) {
                console.warn('Comparison alerts unavailable:', error);
            }
        }

        function disposeComparisonLayers() {
            removeComparisonRadarLayer();
            compareAlertGeneration += 1;
            if (compareAlertLayer && compareMap?.hasLayer(compareAlertLayer)) compareMap.removeLayer(compareAlertLayer);
            compareAlertLayer?.off?.();
            compareAlertLayer = null;
            if (compareBaseLayer && compareMap?.hasLayer(compareBaseLayer)) compareMap.removeLayer(compareBaseLayer);
            compareBaseLayer = null;
        }

        function ensureComparisonMap() {
            if (compareMap) return;
            const location = comparisonLocation();
            const initialCenter = location.name
                ? [location.latitude, location.longitude]
                : [map.getCenter().lat, map.getCenter().lng];
            const initialZoom = location.name ? location.zoom : map.getZoom();
            compareMap = L.map('compareMap', {
                center: initialCenter,
                zoom: initialZoom,
                zoomControl: true,
                attributionControl: true,
                preferCanvas: true
            });
            compareMap.createPane('radarPane');
            compareMap.getPane('radarPane').style.zIndex = 250;
            compareMap.createPane('alertPane');
            compareMap.getPane('alertPane').style.zIndex = 450;
            compareMap.on('moveend', () => {
                if (!settings.splitView) return;
                const center = compareMap.getCenter();
                compareMap.getContainer().dataset.latitude = center.lat.toFixed(4);
                compareMap.getContainer().dataset.longitude = center.lng.toFixed(4);
                if (comparisonProductChoice()) return;
                settings.compareLocation = normalizeComparisonLocation({
                    ...settings.compareLocation,
                    latitude: center.lat,
                    longitude: center.lng,
                    zoom: compareMap.getZoom()
                });
                saveSettings();
            });
            L.DomEvent.disableClickPropagation(document.querySelector('.compare-map-controls'));
        }

        function setSplitView(enabled, { persist = true } = {}) {
            const active = Boolean(enabled);
            const pane = document.getElementById('compareMapPane');
            const button = document.getElementById('splitViewBtn');
            const wasActive = document.body.classList.contains('split-view');
            settings.splitView = active;
            document.body.classList.toggle('split-view', active);
            pane.hidden = !active;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
            if (active) {
                if (stormTop3dMode) exitStormTop3d();
                ensureComparisonMap();
                refreshComparisonBasemap();
                refreshComparisonRadar();
                refreshComparisonAlerts();
                updateSplitViewLabels();
                setTimeout(() => {
                    map.invalidateSize();
                    compareMap.invalidateSize();
                    if (comparisonProductChoice()) {
                        syncComparisonViewToPrimary();
                    } else if (!comparisonLocation().name) {
                        const center = map.getCenter();
                        compareMap.setView([center.lat, center.lng], map.getZoom(), { animate: false });
                        document.getElementById('compareSearchInput').focus();
                    }
                }, 0);
            } else {
                disposeComparisonLayers();
                if (wasActive) setTimeout(() => map.invalidateSize(), 0);
            }
            if (persist) saveSettings();
        }

        function updatePipRadarLabel() {
            const title = document.getElementById('pipRadarTitle');
            const time = document.getElementById('pipRadarTime');
            if (title) title.textContent = t('pipTitle');
            if (!time) return;
            const frame = frames[currentFrame];
            time.textContent = frame?.time
                ? formatLocalizedDate(frame.time * 1000, { timeStyle: 'short' })
                : t('pipCurrentView');
        }

        function updatePipFollowState() {
            const button = document.getElementById('pipRadarRecenter');
            if (!button) return;
            button.classList.toggle('active', pipFollowPrimary);
            button.setAttribute('aria-pressed', String(pipFollowPrimary));
        }

        function syncPipToPrimary(force = false) {
            if (!pipMap || !settings.pipRadar || (!pipFollowPrimary && !force)) return;
            const view = overviewFromMapView(map.getCenter(), map.getZoom());
            pipFollowPrimary = true;
            syncingPipView = true;
            try {
                pipMap.setView([view.latitude, view.longitude], view.zoom, { animate: false });
            } finally {
                syncingPipView = false;
            }
            const container = pipMap.getContainer();
            container.dataset.latitude = view.latitude.toFixed(4);
            container.dataset.longitude = view.longitude.toFixed(4);
            container.dataset.zoom = String(view.zoom);
            updatePipFollowState();
        }

        function refreshPipBasemap() {
            if (!pipMap || !settings.pipRadar) return;
            if (pipBaseLayer && pipMap.hasLayer(pipBaseLayer)) pipMap.removeLayer(pipBaseLayer);
            const basemap = BASEMAPS[settings.basemap] || BASEMAPS.dark;
            pipBaseLayer = L.tileLayer.cached(basemap.url, {
                attribution: basemap.attribution,
                subdomains: basemap.subdomains || [],
                maxZoom: 19,
                errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
            }).addTo(pipMap);
            pipBaseLayer.setZIndex(0);
        }

        function removePipRadarLayer() {
            if (pipRadarLayer && pipMap?.hasLayer(pipRadarLayer)) pipMap.removeLayer(pipRadarLayer);
            pipRadarLayer?.off?.();
            pipRadarLayer = null;
            pipRadarSignature = '';
            const container = pipMap?.getContainer?.();
            if (container) {
                container.dataset.radarFrame = '';
                container.dataset.radarSource = '';
            }
        }

        function refreshPipRadar() {
            if (!pipMap || !settings.pipRadar || !settings.layers.radar) {
                removePipRadarLayer();
                return;
            }
            const sourceLayer = frameLayers[currentFrame];
            const signature = currentRadarLayerSignature(sourceLayer);
            if (!signature) {
                removePipRadarLayer();
                return;
            }
            if (signature === pipRadarSignature && pipRadarLayer) {
                pipRadarLayer.setOpacity?.(settings.opacity);
                return;
            }
            removePipRadarLayer();
            pipRadarLayer = cloneRadarLayer(sourceLayer, 'pip-radar-layer');
            if (!pipRadarLayer) return;
            pipRadarSignature = signature;
            pipRadarLayer.addTo(pipMap);
            pipRadarLayer.setOpacity?.(settings.opacity);
            pipMap.getContainer().dataset.radarFrame = String(currentFrame);
            pipMap.getContainer().dataset.radarSource = settings.source;
            updatePipRadarLabel();
        }

        async function refreshPipAlerts() {
            const generation = ++pipAlertGeneration;
            if (pipAlertLayer && pipMap?.hasLayer(pipAlertLayer)) pipMap.removeLayer(pipAlertLayer);
            pipAlertLayer?.off?.();
            pipAlertLayer = null;
            const container = pipMap?.getContainer?.();
            if (container) container.dataset.alertFeatures = '0';
            if (!pipMap || !settings.pipRadar || !settings.layers.alerts || !currentAlertFeatures.length) return;
            try {
                const tools = await alertFillTools();
                if (generation !== pipAlertGeneration || !settings.pipRadar || !pipMap) return;
                const referenceTime = replayMode && frames[currentFrame]
                    ? frames[currentFrame].time * 1000
                    : Date.now();
                pipAlertLayer = L.geoJSON(currentAlertFeatures, {
                    pane: 'alertPane',
                    style: feature => alertPolygonPresentation(feature, tools, referenceTime).style,
                    onEachFeature: (feature, layer) => {
                        layer.bindTooltip(escapeHTML(feature.properties?.event || feature.properties?.ps || 'Weather alert', 120));
                    }
                }).addTo(pipMap);
                pipMap.getContainer().dataset.alertFeatures = String(pipAlertLayer.getLayers().length);
            } catch (error) {
                console.warn('Mini-radar alerts unavailable:', error);
            }
        }

        function disposePipMap() {
            removePipRadarLayer();
            pipAlertGeneration += 1;
            if (pipAlertLayer && pipMap?.hasLayer(pipAlertLayer)) pipMap.removeLayer(pipAlertLayer);
            pipAlertLayer?.off?.();
            pipAlertLayer = null;
            if (pipBaseLayer && pipMap?.hasLayer(pipBaseLayer)) pipMap.removeLayer(pipBaseLayer);
            pipBaseLayer = null;
            if (pipMap) {
                pipMap.off();
                pipMap.remove();
                pipMap = null;
            }
            document.getElementById('pipMap')?.replaceChildren();
        }

        function ensurePipMap() {
            if (pipMap) return;
            const view = overviewFromMapView(map.getCenter(), map.getZoom());
            pipMap = L.map('pipMap', {
                center: [view.latitude, view.longitude],
                zoom: view.zoom,
                zoomControl: false,
                attributionControl: true,
                preferCanvas: true
            });
            pipMap.createPane('radarPane');
            pipMap.getPane('radarPane').style.zIndex = 250;
            pipMap.createPane('alertPane');
            pipMap.getPane('alertPane').style.zIndex = 450;
            pipMap.on('movestart', () => {
                if (syncingPipView) return;
                pipFollowPrimary = false;
                updatePipFollowState();
            });
            pipMap.on('moveend', () => {
                const center = pipMap.getCenter();
                const container = pipMap.getContainer();
                container.dataset.latitude = center.lat.toFixed(4);
                container.dataset.longitude = center.lng.toFixed(4);
                container.dataset.zoom = String(pipMap.getZoom());
            });
        }

        function setPipRadar(enabled, { persist = true } = {}) {
            const active = Boolean(enabled);
            const panel = document.getElementById('pipRadarPanel');
            const button = document.getElementById('pipRadarBtn');
            settings.pipRadar = active;
            document.body.classList.toggle('pip-radar-active', active);
            panel.hidden = !active;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
            if (active) {
                if (stormTop3dMode) exitStormTop3d();
                pipFollowPrimary = true;
                ensurePipMap();
                refreshPipBasemap();
                refreshPipRadar();
                refreshPipAlerts();
                updatePipRadarLabel();
                updatePipFollowState();
                setTimeout(() => {
                    if (!pipMap || !settings.pipRadar) return;
                    pipMap.invalidateSize();
                    syncPipToPrimary(true);
                }, 0);
            } else {
                disposePipMap();
            }
            if (persist) saveSettings();
        }

        // ==================== RATE LIMIT HANDLING ====================
        function tileProviderKey(url) {
            const value = String(url || '');
            const templateHost = value.match(/^https?:\/\/([^/]+)/i)?.[1]
                ?.replace(/^\{s\}\./i, '')
                ?.replace(/\{[^}]+\}/g, 'template');
            if (templateHost) return templateHost.toLowerCase();
            try {
                return new URL(value, window.location.href).hostname.toLowerCase() || 'local';
            } catch {
                return 'unknown';
            }
        }

        const cachedTileLayers = new Set();
        const tileCacheMetrics = { hits: 0, misses: 0 };
        const tileCacheState = { state: 'initializing', count: 0, bytes: 0 };
        const TRANSPARENT_FRAME_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        const persistentTileCache = new IndexedDbTileCache({
            maxEntries: 1200,
            maxBytes: 96 * 1024 * 1024,
            maxTileBytes: 8 * 1024 * 1024,
            onStatus: status => {
                tileCacheState.state = safeText(status.state, 24);
                if (Number.isFinite(status.count)) tileCacheState.count = status.count;
                if (Number.isFinite(status.bytes)) tileCacheState.bytes = status.bytes;
                const element = document.getElementById('tileStatus');
                if (element) element.dataset.cacheState = tileCacheState.state;
            }
        });

        function recordTileCacheResult(hit) {
            tileCacheMetrics[hit ? 'hits' : 'misses'] += 1;
            const element = document.getElementById('tileStatus');
            if (!element) return;
            element.dataset.cacheHits = String(tileCacheMetrics.hits);
            element.dataset.cacheMisses = String(tileCacheMetrics.misses);
        }

        function createFrameAwareImageOverlay(url, bounds, options = {}, { trackLoad = true } = {}) {
            const layer = L.imageOverlay(TRANSPARENT_FRAME_IMAGE, bounds, {
                ...options,
                crossOrigin: false
            });
            layer._stormviewFrameAware = true;
            layer._stormviewFrameUrl = url;
            layer._stormviewFrameBlob = null;
            layer._stormviewFramePromise = null;
            layer._stormviewFrameController = null;
            layer._stormviewFrameObjectUrl = '';
            layer._stormviewFrameGeneration = 0;
            layer._stormviewFrameReady = false;
            layer._stormviewFrameCounted = false;

            layer.preloadFrame = function() {
                if (this._stormviewFrameBlob) return Promise.resolve(this._stormviewFrameBlob);
                if (this._stormviewFramePromise) return this._stormviewFramePromise;
                const controller = new AbortController();
                this._stormviewFrameController = controller;
                this._stormviewFramePromise = (async () => {
                    const cached = await persistentTileCache.get(url, tileCacheMaxAge(url));
                    if (cached) {
                        recordTileCacheResult(true);
                        return cached;
                    }

                    recordTileCacheResult(false);
                    const response = await fetchWithTimeout(url, {
                        signal: controller.signal,
                        mode: 'cors',
                        credentials: 'omit',
                        cache: 'no-store'
                    }, 15000);
                    const blob = await response.blob();
                    if ((!blob.type || blob.type.startsWith('image/')) && blob.size > 0) {
                        persistentTileCache.put(url, blob).catch(() => {});
                        return blob;
                    }
                    throw new Error('Archived radar frame was not a supported image');
                })().then(blob => {
                    this._stormviewFrameBlob = blob;
                    return blob;
                }).finally(() => {
                    if (this._stormviewFrameController === controller) this._stormviewFrameController = null;
                    this._stormviewFramePromise = null;
                });
                return this._stormviewFramePromise;
            };

            layer.activateFrame = function() {
                if (this._stormviewFrameReady && this.getElement()?.naturalWidth > 0) {
                    return Promise.resolve(true);
                }
                if (this._stormviewActivatePromise) return this._stormviewActivatePromise;
                const generation = ++this._stormviewFrameGeneration;
                this._loading = true;
                this._stormviewActivatePromise = (async () => {
                    const blob = await this.preloadFrame();
                    if (generation !== this._stormviewFrameGeneration || !this._map) return false;
                    if (this._stormviewFrameObjectUrl) URL.revokeObjectURL(this._stormviewFrameObjectUrl);
                    const objectUrl = URL.createObjectURL(blob);
                    this._stormviewFrameObjectUrl = objectUrl;
                    const image = this.getElement();
                    if (!image) return false;
                    const loaded = new Promise((resolve, reject) => {
                        image.addEventListener('load', resolve, { once: true });
                        image.addEventListener('error', () => reject(new Error('Archived radar frame could not be decoded')), { once: true });
                    });
                    this.setUrl(objectUrl);
                    await loaded;
                    if (generation !== this._stormviewFrameGeneration || !this._map) return false;
                    this._loading = false;
                    this._stormviewFrameReady = true;
                    if (trackLoad && !this._stormviewFrameCounted) {
                        this._stormviewFrameCounted = true;
                        markRadarFrameLoaded();
                    }
                    return true;
                })().catch(error => {
                    if (error?.name !== 'AbortError') this.fire('error', { error });
                    return false;
                }).finally(() => {
                    this._loading = false;
                    this._stormviewActivatePromise = null;
                });
                return this._stormviewActivatePromise;
            };

            layer.releaseFrame = function({ dropPreload = false } = {}) {
                this._stormviewFrameGeneration += 1;
                this._stormviewFrameReady = false;
                this._loading = false;
                if (this._stormviewFrameObjectUrl) {
                    URL.revokeObjectURL(this._stormviewFrameObjectUrl);
                    this._stormviewFrameObjectUrl = '';
                }
                if (this.getElement()) this.setUrl(TRANSPARENT_FRAME_IMAGE);
                if (dropPreload) {
                    this._stormviewFrameController?.abort(new DOMException('Frame left the preload window', 'AbortError'));
                    this._stormviewFrameController = null;
                    this._stormviewFrameBlob = null;
                }
            };

            layer.on('add', () => {
                layer.activateFrame();
            });
            layer.on('remove', () => {
                layer.releaseFrame();
            });
            return layer;
        }

        const rateLimiter = (() => {
            const states = new Map();
            const baseBackoffMs = 3000;
            const maxBackoffMs = 30000;
            const windowMs = 2000;
            const threshold = 4;

            function stateFor(provider) {
                const key = provider || 'unknown';
                if (!states.has(key)) {
                    states.set(key, {
                        provider: key,
                        isPaused: false,
                        pauseUntil: 0,
                        backoffMs: baseBackoffMs,
                        errorWindow: [],
                        generation: 0
                    });
                }
                return states.get(key);
            }

            function notify() {
                if (typeof renderDiagnostics === 'function') renderDiagnostics();
            }

            function redrawProvider(provider) {
                setTimeout(() => {
                    cachedTileLayers.forEach(layer => {
                        if (layer._stormviewBackoffKey === provider && layer._map?.hasLayer(layer)) {
                            layer.redraw();
                        }
                    });
                }, 100);
            }

            function resume(provider, expectedGeneration) {
                const state = states.get(provider);
                if (!state || (expectedGeneration !== undefined && state.generation !== expectedGeneration)) return;
                state.isPaused = false;
                state.pauseUntil = 0;
                state.errorWindow = [];
                console.log(`[RateLimiter] Resuming ${provider}`);
                notify();
                redrawProvider(provider);
            }

            function isPaused(provider) {
                const state = states.get(provider || 'unknown');
                if (!state?.isPaused) return false;
                if (Date.now() >= state.pauseUntil) {
                    resume(state.provider, state.generation);
                    return false;
                }
                return true;
            }

            function recordError(provider) {
                const state = stateFor(provider);
                const now = Date.now();
                state.errorWindow.push(now);
                state.errorWindow = state.errorWindow.filter(time => now - time < windowMs);
                if (state.errorWindow.length < threshold || state.isPaused) return;

                const delay = state.backoffMs;
                state.isPaused = true;
                state.pauseUntil = now + delay;
                state.generation += 1;
                const generation = state.generation;
                console.log(`[RateLimiter] Paused ${state.provider} for ${delay}ms after ${state.errorWindow.length} errors`);
                setTimeout(() => resume(state.provider, generation), delay);
                state.backoffMs = Math.min(Math.round(delay * 1.5), maxBackoffMs);
                notify();
            }

            function recordSuccess(provider) {
                const state = stateFor(provider);
                if (state.backoffMs > baseBackoffMs) {
                    state.backoffMs = Math.max(baseBackoffMs, Math.round(state.backoffMs * 0.9));
                }
            }

            function reset(provider) {
                if (provider) {
                    const state = states.get(provider);
                    if (state) state.generation += 1;
                    states.delete(provider);
                } else {
                    states.forEach(state => { state.generation += 1; });
                    states.clear();
                }
                notify();
            }

            function snapshot() {
                return [...states.values()]
                    .filter(state => isPaused(state.provider))
                    .map(state => ({
                        provider: state.provider,
                        pauseUntil: new Date(state.pauseUntil).toISOString(),
                        retryInMs: Math.max(0, state.pauseUntil - Date.now())
                    }))
                    .sort((left, right) => left.provider.localeCompare(right.provider));
            }

            function getBackoffMs(provider) {
                return states.get(provider || 'unknown')?.backoffMs || baseBackoffMs;
            }

            return { getBackoffMs, isPaused, recordError, recordSuccess, reset, snapshot };
        })();

        // Custom TileLayer - optimized for memory with zoom stability
        L.TileLayer.Cached = L.TileLayer.extend({
            options: {
                errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
                keepBuffer: 4  // Reduced from 25 for memory savings
            },

            initialize: function(url, options) {
                L.TileLayer.prototype.initialize.call(this, url, options);
                this._stormviewBackoffKey = options?.backoffKey || tileProviderKey(url);
            },

            onAdd: function(mapInstance) {
                cachedTileLayers.add(this);
                L.TileLayer.prototype.onAdd.call(this, mapInstance);
                if (this.options.webgl && Number(this.options.opacity) > 0) {
                    this._ensureWebGLRenderer();
                }
            },

            onRemove: function(mapInstance) {
                cachedTileLayers.delete(this);
                this._destroyWebGLRenderer();
                L.TileLayer.prototype.onRemove.call(this, mapInstance);
            },

            setOpacity: function(opacity) {
                L.TileLayer.prototype.setOpacity.call(this, opacity);
                if (!this.options.webgl || !this._map) return this;
                if (Number(opacity) > 0) this._ensureWebGLRenderer();
                else this._destroyWebGLRenderer();
                return this;
            },

            _ensureWebGLRenderer: function() {
                if (this._webglRenderer || !this._map || !this._container) return;
                const renderer = new WebGLTileRenderer(this, this._map);
                if (renderer.mount()) {
                    this._webglRenderer = renderer;
                    this._container.dataset.renderer = 'webgl';
                } else {
                    this._container.dataset.renderer = 'dom';
                }
            },

            _destroyWebGLRenderer: function() {
                this._webglRenderer?.destroy();
                this._webglRenderer = null;
                if (this._container) this._container.dataset.renderer = 'dom';
            },

            _removeTile: function(key) {
                const tile = this._tiles[key]?.el;
                if (tile) {
                    tile._stormviewCancelled = true;
                    if (tile._stormviewObjectUrl) {
                        URL.revokeObjectURL(tile._stormviewObjectUrl);
                        tile._stormviewObjectUrl = '';
                    }
                }
                L.TileLayer.prototype._removeTile.call(this, key);
            },
            
            // Prevent pruning during zoom for visual stability
            _pruneTiles: function() {
                if (this._map && this._map._animatingZoom) return;
                L.TileLayer.prototype._pruneTiles.call(this);
            },
            
            // Skip tile requests when rate limited
            _update: function(center) {
                if (rateLimiter.isPaused(this._stormviewBackoffKey)) return;
                L.TileLayer.prototype._update.call(this, center);
            },
            
            createTile: function(coords, done) {
                const tile = document.createElement('img');
                tile.alt = '';
                tile.setAttribute('role', 'presentation');
                
                // Start hidden
                tile.style.opacity = '0';
                tile.style.transition = 'opacity 0.2s';
                tile.style.color = 'transparent';
                
                if (rateLimiter.isPaused(this._stormviewBackoffKey)) {
                    tile.src = this.options.errorTileUrl;
                    done(null, tile);
                    return tile;
                }
                
                let settled = false;
                const self = this;

                const revokeObjectUrl = () => {
                    if (!tile._stormviewObjectUrl) return;
                    URL.revokeObjectURL(tile._stormviewObjectUrl);
                    tile._stormviewObjectUrl = '';
                };

                const complete = () => {
                    if (settled || tile._stormviewCancelled) return;
                    settled = true;
                    revokeObjectUrl();
                    rateLimiter.recordSuccess(self._stormviewBackoffKey);
                    tile.style.opacity = '1';
                    done(null, tile);
                };

                const fail = () => {
                    if (settled || tile._stormviewCancelled) return;
                    settled = true;
                    revokeObjectUrl();
                    rateLimiter.recordError(self._stormviewBackoffKey);
                    tile.onload = null;
                    tile.onerror = null;
                    tile.src = self.options.errorTileUrl;
                    tile.style.opacity = '0';
                    done(null, tile);
                };

                const loadSource = source => {
                    if (settled || tile._stormviewCancelled) return;
                    tile.onload = complete;
                    tile.onerror = fail;
                    tile.src = source;
                };

                const loadBlob = blob => {
                    if (settled || tile._stormviewCancelled) return;
                    tile._stormviewObjectUrl = URL.createObjectURL(blob);
                    loadSource(tile._stormviewObjectUrl);
                };

                const url = this.getTileUrl(coords);
                if (!isCacheableTileUrl(url)) {
                    loadSource(url);
                    return tile;
                }

                (async () => {
                    const cached = await persistentTileCache.get(url, tileCacheMaxAge(url));
                    if (cached) {
                        recordTileCacheResult(true);
                        loadBlob(cached);
                        return;
                    }

                    recordTileCacheResult(false);
                    try {
                        const response = await fetch(url, {
                            mode: 'cors',
                            credentials: 'omit',
                            cache: 'no-store'
                        });
                        if (!response.ok) {
                            const error = new Error(`Tile request failed with HTTP ${response.status}`);
                            error.tileHttpFailure = true;
                            throw error;
                        }
                        const blob = await response.blob();
                        if ((!blob.type || blob.type.startsWith('image/'))
                            && blob.size > 0 && blob.size <= persistentTileCache.maxTileBytes) {
                            loadBlob(blob);
                            persistentTileCache.put(url, blob).catch(() => {});
                            return;
                        }
                        const error = new Error('Tile response was not a supported image');
                        error.tileHttpFailure = true;
                        throw error;
                    } catch (error) {
                        if (error?.tileHttpFailure) fail();
                        else loadSource(url);
                    }
                })();
                return tile;
            }
        });

        L.tileLayer.cached = function(url, options) {
            return new L.TileLayer.Cached(url, options);
        };

        // Legacy rate limited layer (uses new cached layer)
        L.TileLayer.RateLimited = L.TileLayer.Cached;
        L.tileLayer.rateLimited = L.tileLayer.cached;

        // Handle zoom to ensure radar tiles stay visible
        let zoomTimeout = null;
        let lastZoom = 5;
        let isZooming = false;
        
        function setupZoomHandler() {
            lastZoom = map.getZoom();
            
            map.on('zoomstart', () => {
                isZooming = true;
                // Keep current frame fully visible during zoom - don't touch tiles
                if (frameLayers[currentFrame] && map.hasLayer(frameLayers[currentFrame])) {
                    frameLayers[currentFrame].setOpacity(settings.opacity);
                }
            });
            
            map.on('zoom', () => {
                // During zoom animation - keep everything stable, no tile requests
                if (frameLayers[currentFrame] && map.hasLayer(frameLayers[currentFrame])) {
                    frameLayers[currentFrame].setOpacity(settings.opacity);
                }
            });
            
            map.on('zoomend', () => {
                isZooming = false;
                const zoom = map.getZoom();
                const zoomDelta = zoom - lastZoom;
                lastZoom = zoom;
                
                // Update zoom indicator
                updateZoomIndicator(zoom);
                
                // Toggle smooth enhancement for HRRR based on zoom level
                if (settings.source === 'hrrr') {
                    document.querySelectorAll('.radar-smooth').forEach(el => {
                        el.classList.remove('radar-enhance-1', 'radar-enhance-2', 'radar-enhance-3');
                        if (zoom >= 10 && zoom <= 11) {
                            el.classList.add('radar-enhance-1');
                        } else if (zoom >= 12 && zoom <= 13) {
                            el.classList.add('radar-enhance-2');
                        } else if (zoom >= 14) {
                            el.classList.add('radar-enhance-3');
                        }
                    });
                }
                
                // Manage hybrid radar (MRMS detail at high zoom)
                updateHybridRadar(zoom);
                
                // Delayed tile update - only if needed and not rate limited
                clearTimeout(zoomTimeout);
                zoomTimeout = setTimeout(() => {
                    const layer = frameLayers[currentFrame];
                    if (isZooming || rateLimiter.isPaused(layer?._stormviewBackoffKey)) return;
                    if (!layer || !map.hasLayer(layer)) return;
                    
                    // Set correct opacity
                    const isHighZoom = zoom >= radarSystem.MRMS_PRIMARY_ZOOM && radarSystem.isUS && radarSystem.highZoomMode;
                    layer.setOpacity(isHighZoom ? settings.opacity * 0.5 : settings.opacity);
                    
                    // Only request new tiles if we zoomed IN significantly
                    // Zooming out should just use cached/upscaled tiles
                    if (zoomDelta > 0 && zoom > 6 && !rateLimiter.isPaused(layer._stormviewBackoffKey)) {
                        // Gentle refresh for new tiles - doesn't clear existing
                        requestAnimationFrame(() => {
                            if (!isZooming && !rateLimiter.isPaused(layer._stormviewBackoffKey)) {
                                layer._update();
                            }
                        });
                    }
                }, 400); // Longer delay to prevent rapid requests
            });
            
            // Pan handler - even more conservative with tile requests
            map.on('moveend', () => {
                if (isZooming) return;
                
                const zoom = map.getZoom();
                if (zoom >= radarSystem.HIGH_ZOOM_THRESHOLD) {
                    updateHybridRadar(zoom);
                    updateZoomIndicator(zoom);
                }
            });
        }
        
        // ==================== ADVANCED HYBRID RADAR SYSTEM ====================
        
        function initRadarSystem() {
            radarSystem.currentZoom = map.getZoom();
            radarSystem.isUS = isViewingUS();
        }
        
        function updateHybridRadar(zoom) {
            radarSystem.currentZoom = zoom;
            radarSystem.isUS = isViewingUS();
            
            // Only enhance RainViewer source when high-res mode is enabled
            if (settings.source !== 'rainviewer' || !settings.highResMode) {
                cleanupRadarLayers();
                radarSystem.highZoomMode = false;
                return;
            }
            
            const shouldUseHighZoom = zoom >= radarSystem.HIGH_ZOOM_THRESHOLD && radarSystem.isUS;
            const shouldUseMRMSPrimary = zoom >= radarSystem.MRMS_PRIMARY_ZOOM && radarSystem.isUS;
            
            if (shouldUseHighZoom && !radarSystem.highZoomMode) {
                // Entering high zoom mode
                enableHighZoomRadar(shouldUseMRMSPrimary);
                radarSystem.highZoomMode = true;
            } else if (!shouldUseHighZoom && radarSystem.highZoomMode) {
                // Exiting high zoom mode  
                disableHighZoomRadar();
                radarSystem.highZoomMode = false;
            } else if (radarSystem.highZoomMode) {
                // Update opacity balance based on zoom
                updateRadarLayerBalance(zoom);
            }
        }
        
        function enableHighZoomRadar(mrmsIsPrimary) {
            if (!radarSystem.mrmsBase) {
                radarSystem.mrmsBase = L.tileLayer.cached(radarSystem.sources.n0q, {
                    opacity: mrmsIsPrimary ? settings.opacity : settings.opacity * 0.6,
                    webgl: true,
                    pane: 'radarPane',
                    maxNativeZoom: 8,
                    maxZoom: 18,
                    keepBuffer: 2,
                    updateWhenZooming: false,
                    updateWhenIdle: true,
                    className: mrmsIsPrimary ? 'mrms-detail-layer radar-primary' : 'mrms-detail-layer radar-supplemental',
                    attribution: IEM_ATTRIBUTION
                });
                radarSystem.mrmsBase.addTo(map);
            }
            
            if (frameLayers[currentFrame] && map.hasLayer(frameLayers[currentFrame])) {
                if (mrmsIsPrimary) {
                    frameLayers[currentFrame].setOpacity(settings.opacity * 0.5);
                    radarSystem.mrmsBase.bringToFront();
                } else {
                    frameLayers[currentFrame].bringToFront();
                }
            }
            
            updateZoomIndicator(radarSystem.currentZoom);
        }
        
        function disableHighZoomRadar() {
            cleanupRadarLayers();
            
            // Restore RainViewer opacity
            if (frameLayers[currentFrame] && map.hasLayer(frameLayers[currentFrame])) {
                frameLayers[currentFrame].setOpacity(settings.opacity);
            }
            
            updateZoomIndicator(radarSystem.currentZoom);
        }
        
        function updateRadarLayerBalance(zoom) {
            if (!radarSystem.mrmsBase) return;
            
            const isMRMSPrimary = zoom >= radarSystem.MRMS_PRIMARY_ZOOM;
            
            if (isMRMSPrimary) {
                // Higher zoom = more MRMS, less RainViewer
                const mrmsOpacity = settings.opacity;
                const rvOpacity = Math.max(0.3, settings.opacity * (1 - (zoom - radarSystem.MRMS_PRIMARY_ZOOM) * 0.1));
                
                radarSystem.mrmsBase.setOpacity(mrmsOpacity);
                if (frameLayers[currentFrame] && map.hasLayer(frameLayers[currentFrame])) {
                    frameLayers[currentFrame].setOpacity(rvOpacity);
                }
                radarSystem.mrmsBase.bringToFront();
            } else {
                // RainViewer primary, MRMS supplemental
                radarSystem.mrmsBase.setOpacity(settings.opacity * 0.6);
                if (frameLayers[currentFrame] && map.hasLayer(frameLayers[currentFrame])) {
                    frameLayers[currentFrame].setOpacity(settings.opacity);
                    frameLayers[currentFrame].bringToFront();
                }
            }
        }
        
        function cleanupRadarLayers() {
            if (radarSystem.mrmsBase) {
                map.removeLayer(radarSystem.mrmsBase);
                radarSystem.mrmsBase = null;
            }
            if (radarSystem.mrmsComposite) {
                map.removeLayer(radarSystem.mrmsComposite);
                radarSystem.mrmsComposite = null;
            }
        }
        
        function updateZoomIndicator(zoom) {
            let indicator = document.getElementById('zoomIndicator');
            
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'zoomIndicator';
                indicator.className = 'glass';
                indicator.style.cssText = `
                    position: fixed;
                    bottom: 100px;
                    right: 16px;
                    padding: 8px 12px;
                    font-size: 11px;
                    z-index: 1000;
                    display: none;
                    border-radius: 8px;
                `;
                document.body.appendChild(indicator);
            }
            
            if (zoom >= radarSystem.HIGH_ZOOM_THRESHOLD) {
                let status, color;
                
                if (radarSystem.isUS) {
                    if (zoom >= radarSystem.MRMS_PRIMARY_ZOOM && radarSystem.highZoomMode) {
                        status = `Z${zoom} | MRMS Primary`;
                        color = 'var(--success)';
                    } else if (radarSystem.highZoomMode) {
                        status = `Z${zoom} | MRMS Enhanced`;
                        color = 'var(--accent)';
                    } else {
                        status = `Z${zoom} | RainViewer`;
                        color = 'var(--text-dim)';
                    }
                } else {
                    status = `Z${zoom} | International (no MRMS)`;
                    color = 'var(--warning)';
                }
                
                indicator.textContent = status;
                indicator.style.color = color;
                indicator.style.borderColor = color;
                indicator.style.display = 'block';
            } else {
                indicator.style.display = 'none';
            }
        }
        
        function isViewingUS() {
            const center = map.getCenter();
            // Continental US bounding box with some buffer
            return center.lat > 23 && center.lat < 50 && center.lng > -128 && center.lng < -64;
        }

        function updateCoverageStatus() {
            if (!map) return;
            const capability = RADAR_CAPABILITIES[settings.source] || RADAR_CAPABILITIES.mrms;
            const chip = document.getElementById('coverageStatus');
            const text = document.getElementById('coverageStatusText');
            const dot = chip?.querySelector('.dot');
            if (!chip || !text || !dot) return;

            const coverage = capability.coverage;
            let state = 'global';
            let message = `${capability.label}: global coverage`;
            const level2Frame = settings.source === 'level2' ? frames[currentFrame] : null;
            if (level2Frame?.siteLat && level2Frame?.siteLng && level2Frame?.maxRangeKm) {
                const distanceKm = map.distance(map.getCenter(), [level2Frame.siteLat, level2Frame.siteLng]) / 1000;
                const inside = distanceKm <= level2Frame.maxRangeKm;
                state = inside ? 'inside' : 'outside';
                message = inside
                    ? `${capability.label}: ${level2Frame.site} radar range`
                    : `${capability.label}: outside ${level2Frame.site} radar range`;
            } else if (settings.source === 'level2') {
                state = 'inside';
                message = `${capability.label}: selected radar range`;
            } else if (coverage?.bounds) {
                const [west, south, east, north] = coverage.bounds;
                const center = map.getCenter();
                const inside = center.lng >= west && center.lng <= east && center.lat >= south && center.lat <= north;
                state = inside ? 'inside' : 'outside';
                message = inside
                    ? `${capability.label}: ${coverage.label} coverage`
                    : `${capability.label}: outside ${coverage.label} coverage`;
            }

            chip.dataset.state = state;
            dot.className = `dot ${state === 'outside' ? 'yellow' : 'green'}`;
            text.textContent = message;
            document.body.classList.toggle('outside-radar-coverage', state === 'outside');
        }
        
        // Gentle refresh of MRMS layer - only if not rate limited
        function refreshMRMSLayer() {
            if (rateLimiter.isPaused(radarSystem.mrmsBase?._stormviewBackoffKey)) return;
            if (radarSystem.mrmsBase && map.hasLayer(radarSystem.mrmsBase)) {
                // Use _update instead of redraw - less aggressive
                radarSystem.mrmsBase._update();
            }
        }

        // ==================== RADAR ====================
        function rejectWorkerRequests(requests, reason) {
            requests.forEach(request => {
                clearTimeout(request.timeoutId);
                request.signal?.removeEventListener('abort', request.abort);
                request.reject(reason);
            });
            requests.clear();
        }

        function disposeMeshWorker(reason = new DOMException('MESH worker stopped', 'AbortError')) {
            const worker = meshWorker;
            meshWorker = null;
            worker?.terminate();
            rejectWorkerRequests(meshWorkerRequests, reason);
        }

        function getMeshWorker() {
            if (meshWorker) return meshWorker;
            const worker = new Worker('src/mesh-worker.js', { type: 'module' });
            meshWorker = worker;
            worker.addEventListener('message', event => {
                if (meshWorker !== worker) return;
                const request = meshWorkerRequests.get(event.data?.id);
                if (!request) return;
                clearTimeout(request.timeoutId);
                request.signal?.removeEventListener('abort', request.abort);
                meshWorkerRequests.delete(event.data.id);
                if (event.data.type === 'error') request.reject(new Error(event.data.message));
                else request.resolve(event.data);
            });
            worker.addEventListener('error', event => {
                if (meshWorker !== worker) return;
                disposeMeshWorker(new Error(event.message || 'MESH worker failed'));
            });
            return worker;
        }

        function requestMeshRender(buffer, signal) {
            const worker = getMeshWorker();
            const id = ++meshWorkerSequence;
            return new Promise((resolve, reject) => {
                const abort = () => {
                    const request = meshWorkerRequests.get(id);
                    if (!request) return;
                    disposeMeshWorker(signal.reason || new DOMException('MESH request cancelled', 'AbortError'));
                };
                const timeoutId = setTimeout(() => {
                    disposeMeshWorker(new DOMException('MESH processing timed out after 45 seconds', 'TimeoutError'));
                }, 45000);
                meshWorkerRequests.set(id, { resolve, reject, timeoutId, signal, abort });
                signal?.addEventListener('abort', abort, { once: true });
                worker.postMessage({ id, type: 'render', buffer, palette: settings.visualPalette }, [buffer]);
            });
        }

        function utcDateKey(date) {
            return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
        }

        async function findLatestMeshObject(signal) {
            for (let dayOffset = 0; dayOffset <= 1; dayOffset += 1) {
                const date = new Date(Date.now() - dayOffset * 86400000);
                const dateKey = utcDateKey(date);
                const prefix = `${MRMS_MESH_PREFIX}${dateKey}/`;
                const listingUrl = `${MRMS_MESH_BUCKET}?list-type=2&prefix=${encodeURIComponent(prefix)}&max-keys=1000`;
                const response = await fetchWithTimeout(listingUrl, { signal }, 20000);
                const xml = new DOMParser().parseFromString(await response.text(), 'application/xml');
                if (xml.querySelector('parsererror')) throw new Error('The NOAA MRMS archive returned invalid XML');
                const objects = [...xml.getElementsByTagName('Contents')].flatMap(node => {
                    const key = node.getElementsByTagName('Key')[0]?.textContent || '';
                    const size = Number(node.getElementsByTagName('Size')[0]?.textContent);
                    return /^CONUS\/MESH_00\.50\/\d{8}\/MRMS_MESH_00\.50_\d{8}-\d{6}\.grib2\.gz$/.test(key)
                        ? [{ key, size }]
                        : [];
                }).sort((left, right) => left.key.localeCompare(right.key));
                if (!objects.length) continue;
                const latest = objects.at(-1);
                if (latest.size > MESH_MAX_BYTES) throw new Error('The latest MESH file exceeds the safety limit');
                return { ...latest, url: `${MRMS_MESH_BUCKET}${latest.key}` };
            }
            throw new Error('No current NOAA MRMS MESH file is available');
        }

        async function downloadMeshObject(object, signal) {
            const response = await fetchWithTimeout(object.url, { signal }, 30000);
            const declaredLength = Number(response.headers.get('content-length')) || object.size;
            if (declaredLength > MESH_MAX_BYTES) throw new Error('The MESH file exceeds the safety limit');
            const buffer = await response.arrayBuffer();
            if (buffer.byteLength > MESH_MAX_BYTES) throw new Error('The MESH file exceeds the safety limit');
            return buffer;
        }

        function formatHailSize(millimeters) {
            if (settings.units === 'metric') return `${Math.round(millimeters)} mm`;
            const inches = millimeters / 25.4;
            const decimals = Number.isInteger(Math.round(inches * 100) / 10) ? 1 : 2;
            return `${inches.toFixed(decimals)} in`;
        }

        function showMeshLegend() {
            if (meshLegendControl) map.removeControl(meshLegendControl);
            const breaks = meshPaletteStops(settings.visualPalette);
            meshLegendControl = L.control({ position: 'bottomright' });
            meshLegendControl.onAdd = () => {
                const container = L.DomUtil.create('div', 'mesh-legend');
                const title = document.createElement('strong');
                title.textContent = `${t('hailSize')} (MESH)`;
                container.appendChild(title);
                breaks.forEach(([millimeters, color]) => {
                    const row = document.createElement('div');
                    row.className = 'mesh-legend-row';
                    const swatch = document.createElement('span');
                    swatch.className = 'mesh-legend-swatch';
                    swatch.style.background = `rgb(${color.slice(0, 3).join(' ')})`;
                    const label = document.createElement('span');
                    label.textContent = `${formatHailSize(millimeters)}+`;
                    row.append(swatch, label);
                    container.appendChild(row);
                });
                const note = document.createElement('div');
                note.className = 'mesh-legend-note';
                note.textContent = `${t('meshCaution')} Max: ${formatHailSize(meshMaximumMm)}`;
                container.appendChild(note);
                return container;
            };
            meshLegendControl.addTo(map);
        }

        async function loadHailMesh() {
            removeLayer('hailMesh');
            const controller = beginLayerRequest('hailMesh');
            try {
                const object = await findLatestMeshObject(controller.signal);
                const buffer = await downloadMeshObject(object, controller.signal);
                const rendered = await requestMeshRender(buffer, controller.signal);
                if (controller.signal.aborted || !settings.layers.hailMesh) return;
                if (!(rendered.blob instanceof Blob) || !Array.isArray(rendered.bounds)) {
                    throw new Error('MESH worker returned an invalid image');
                }
                const imageUrl = URL.createObjectURL(rendered.blob);
                const layer = L.imageOverlay(imageUrl, rendered.bounds, {
                    opacity: Math.min(0.92, settings.opacity),
                    crossOrigin: true,
                    pane: 'hailPane',
                    className: 'hail-mesh-layer',
                    alt: `NOAA MRMS MESH hail size estimate; maximum ${formatHailSize(rendered.maximumMm)}`
                });
                layer.getAttribution = () => NOAA_MRMS_ATTRIBUTION;
                layer._stormviewObjectUrl = imageUrl;
                layerRefs.hailMesh = layer.addTo(map);
                meshMaximumMm = Number(rendered.maximumMm) || 0;
                setLayerFeatureCount('hailMesh', rendered.hailPixels);
                showMeshLegend();
            } catch (error) {
                if (error?.name === 'AbortError') return;
                console.error('MESH error:', error);
                showToast(`Hail-size layer unavailable: ${safeText(error.message, 120)}`, 'error', 5000);
                settings.layers.hailMesh = false;
                document.querySelectorAll('[data-layer="hailMesh"]').forEach(element => element.classList.remove('active'));
                saveSettings();
            } finally {
                finishLayerRequest('hailMesh', controller);
            }
        }

        const LEVEL2_FALLBACK_SITES = Object.freeze([
            { id: 'KTLX', name: 'Oklahoma City, OK', lat: 35.3334, lng: -97.2779 },
            { id: 'KFTG', name: 'Denver, CO', lat: 39.7866, lng: -104.5458 },
            { id: 'KLOT', name: 'Chicago, IL', lat: 41.6044, lng: -88.0847 },
            { id: 'KOKX', name: 'New York City, NY', lat: 40.865, lng: -72.864 },
            { id: 'KAMX', name: 'Miami, FL', lat: 25.6111, lng: -80.4127 }
        ]);

        function disposeLevel2Worker(reason = new DOMException('Level II worker stopped', 'AbortError')) {
            const worker = level2Worker;
            level2Worker = null;
            level2LoadedKey = null;
            worker?.terminate();
            rejectWorkerRequests(level2WorkerRequests, reason);
        }

        function getLevel2Worker() {
            if (level2Worker) return level2Worker;
            const worker = new Worker('vendor/nexrad/level2-worker.js');
            level2Worker = worker;
            worker.addEventListener('message', event => {
                if (level2Worker !== worker) return;
                const request = level2WorkerRequests.get(event.data?.id);
                if (!request) return;
                clearTimeout(request.timeoutId);
                request.signal?.removeEventListener('abort', request.abort);
                level2WorkerRequests.delete(event.data.id);
                if (event.data.type === 'error') request.reject(new Error(event.data.message));
                else request.resolve(event.data);
            });
            worker.addEventListener('error', event => {
                if (level2Worker !== worker) return;
                const error = new Error(event.message || 'Level II worker failed');
                disposeLevel2Worker(error);
            });
            return worker;
        }

        function requestLevel2Worker(type, payload, transfer, signal) {
            const worker = getLevel2Worker();
            const id = ++level2WorkerSequence;
            return new Promise((resolve, reject) => {
                const abort = () => {
                    const request = level2WorkerRequests.get(id);
                    if (!request) return;
                    disposeLevel2Worker(signal.reason || new DOMException('Level II request cancelled', 'AbortError'));
                };
                const timeoutId = setTimeout(() => {
                    disposeLevel2Worker(new DOMException('Level II processing timed out after 45 seconds', 'TimeoutError'));
                }, 45000);
                level2WorkerRequests.set(id, { resolve, reject, timeoutId, signal, abort });
                signal?.addEventListener('abort', abort, { once: true });
                worker.postMessage({ id, type, ...payload }, transfer);
            });
        }

        async function loadLevel2Sites(signal) {
            if (level2Sites.length) return level2Sites;
            try {
                const response = await fetchWithTimeout(DATA_URLS.nexradSites, { signal });
                const data = await response.json();
                level2Sites = (Array.isArray(data.features) ? data.features : [])
                    .map(feature => {
                        const coordinates = feature.geometry?.coordinates;
                        const stationId = safeText(feature.properties?.sid || feature.id, 8).toUpperCase();
                        const lat = Number(coordinates?.[1]);
                        const lng = Number(coordinates?.[0]);
                        return {
                            id: stationId.length === 4 ? stationId : `K${stationId}`,
                            name: safeText(`${feature.properties?.sname || stationId}, ${feature.properties?.state || ''}`.replace(/,\s*$/, ''), 80),
                            lat,
                            lng,
                            online: feature.properties?.online !== false
                        };
                    })
                    .filter(site => site.online
                        && /^K[A-Z0-9]{3}$/.test(site.id)
                        && site.lat >= 24 && site.lat <= 50
                        && site.lng >= -125 && site.lng <= -66)
                    .sort((left, right) => left.name.localeCompare(right.name));
                if (!level2Sites.length) throw new Error('No CONUS radar sites were returned');
            } catch (error) {
                if (signal?.aborted) throw error;
                console.warn('NEXRAD site inventory unavailable; using fallback sites:', error);
                level2Sites = LEVEL2_FALLBACK_SITES.map(site => ({ ...site }));
            }
            await loadLevel2SiteHealth(signal);
            syncLevel2SiteControls();
            return level2Sites;
        }

        // A site can answer and still be publishing nothing, so the picker
        // reports the RDA status and the age of the last Level II volume.
        async function loadLevel2SiteHealth(signal) {
            if (level2SiteHealth.size) return level2SiteHealth;
            try {
                const response = await fetchWithTimeout(DATA_URLS.radarStations, { signal });
                const payload = await response.json();
                const tools = await import('./radar-sites.js');
                level2SiteHealth = tools.normalizeRadarSiteHealthIndex(payload, { now: Date.now() });
            } catch (error) {
                if (signal?.aborted) throw error;
                console.warn('Radar site health unavailable:', error);
                level2SiteHealth = new Map();
            }
            return level2SiteHealth;
        }

        function nearestLevel2Site() {
            const center = map.getCenter();
            return level2Sites.reduce((nearest, site) => {
                const distance = map.distance(center, [site.lat, site.lng]);
                return !nearest || distance < nearest.distance ? { ...site, distance } : nearest;
            }, null);
        }

        function selectedLevel2Site() {
            return level2Sites.find(site => site.id === settings.level2Site) || nearestLevel2Site();
        }

        function syncLevel2SiteControls() {
            document.querySelectorAll('.level2-site-row').forEach(row => {
                row.classList.toggle('visible', settings.source === 'level2');
            });
            syncLevel2TiltControls();
            document.querySelectorAll('.level2-site-select').forEach(select => {
                const previousValue = settings.level2Site;
                select.replaceChildren(new Option('Nearest to map center', ''));
                level2Sites.forEach(site => {
                    const health = level2SiteHealth.get(site.id);
                    const option = new Option(`${site.id} — ${site.name}${level2SiteBadge(health)}`, site.id);
                    option.dataset.siteState = health?.state || 'unknown';
                    select.add(option);
                });
                select.value = previousValue;
                if (wiredSelects.has(select)) return;
                wiredSelects.add(select);
                select.addEventListener('change', () => {
                    settings.level2Site = select.value;
                    document.querySelectorAll('.level2-site-select').forEach(other => {
                        other.value = settings.level2Site;
                    });
                    saveSettings();
                    renderLevel2SiteHealth();
                    if (settings.source === 'level2') loadRadarData();
                });
            });
            renderLevel2SiteHealth();
        }

        function syncLevel2TiltControls(activeElevation = settings.level2Tilt) {
            document.querySelectorAll('.level2-tilt-row').forEach(row => {
                row.classList.toggle('visible', settings.source === 'level2' && level2Tilts.length > 1);
            });
            document.querySelectorAll('.level2-tilt-select').forEach(select => {
                select.replaceChildren(new Option(t('level2TiltLowest'), ''));
                level2Tilts.forEach(tilt => {
                    select.add(new Option(`${tilt.angle.toFixed(1)}°`, String(tilt.elevation)));
                });
                select.value = activeElevation === null || activeElevation === undefined ? '' : String(activeElevation);
                if (wiredSelects.has(select)) return;
                wiredSelects.add(select);
                select.addEventListener('change', () => {
                    const value = select.value;
                    settings.level2Tilt = value === '' ? null : Number(value);
                    document.querySelectorAll('.level2-tilt-select').forEach(other => {
                        other.value = value;
                    });
                    saveSettings();
                    if (settings.source === 'level2') loadRadarData();
                });
            });
        }

        function level2SiteBadge(health) {
            if (!health || health.state === 'operating' || health.state === 'unknown') return '';
            const badges = {
                degraded: ' (maintenance)',
                stale: ' (no recent data)',
                down: ' (offline)'
            };
            return badges[health.state] || '';
        }

        function renderLevel2SiteHealth() {
            const site = level2Sites.length ? selectedLevel2Site() : null;
            const health = site ? level2SiteHealth.get(site.id) : null;
            document.querySelectorAll('.level2-site-health').forEach(element => {
                element.dataset.siteState = health?.state || 'unknown';
                element.textContent = health
                    ? `${site.id}: ${level2SiteHealthText(health)}`
                    : t('level2SiteHealthUnknown');
            });
        }

        function level2SiteHealthText(health) {
            const parts = [];
            if (health.state === 'down') parts.push(`offline (${health.status})`);
            else if (health.state === 'stale') parts.push('no recent Level II volume');
            else if (health.state === 'degraded') parts.push(health.operability || 'maintenance flagged');
            else parts.push('operating');
            if (health.alarm && health.state !== 'operating') parts.push(health.alarm);
            if (health.ageMinutes !== null) {
                parts.push(health.ageMinutes < 1
                    ? 'last volume under a minute ago'
                    : `last volume ${health.ageMinutes} min ago`);
            }
            return parts.join(' · ');
        }

        function level2DatePrefix(date, siteId) {
            const year = date.getUTCFullYear();
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const day = String(date.getUTCDate()).padStart(2, '0');
            return `${year}/${month}/${day}/${siteId}/`;
        }

        async function findLatestLevel2Object(siteId, signal) {
            for (let dayOffset = 0; dayOffset <= 1; dayOffset += 1) {
                const date = new Date(Date.now() - dayOffset * 86400000);
                const prefix = level2DatePrefix(date, siteId);
                const query = new URLSearchParams({ 'list-type': '2', prefix, 'max-keys': '1000' });
                const response = await fetchWithTimeout(
                    `https://unidata-nexrad-level2.s3.amazonaws.com/?${query}`,
                    { signal }
                );
                const xml = new DOMParser().parseFromString(await response.text(), 'application/xml');
                if (xml.querySelector('parsererror')) throw new Error('The Level II archive returned invalid XML');
                const keys = [...xml.getElementsByTagName('Key')]
                    .map(node => node.textContent || '')
                    .filter(key => /_V\d{2}$/.test(key))
                    .sort();
                if (!keys.length) continue;
                const key = keys.at(-1);
                const timestampMatch = key.match(/([0-9]{8})_([0-9]{6})_V\d{2}$/);
                if (!timestampMatch) throw new Error('The latest Level II filename has an unknown timestamp');
                const [, ymd, hms] = timestampMatch;
                const time = Date.UTC(
                    Number(ymd.slice(0, 4)),
                    Number(ymd.slice(4, 6)) - 1,
                    Number(ymd.slice(6, 8)),
                    Number(hms.slice(0, 2)),
                    Number(hms.slice(2, 4)),
                    Number(hms.slice(4, 6))
                ) / 1000;
                return {
                    key,
                    url: `https://unidata-nexrad-level2.s3.amazonaws.com/${key}`,
                    time
                };
            }
            throw new Error(`No current Level II volume is available for ${siteId}`);
        }

        async function downloadLevel2Volume(url, signal) {
            const response = await fetchWithTimeout(url, { signal }, 30000);
            const declaredLength = Number(response.headers.get('content-length'));
            if (declaredLength > LEVEL2_MAX_BYTES) {
                throw new Error(`Level II volume exceeds the ${Math.round(LEVEL2_MAX_BYTES / 1048576)} MB safety limit`);
            }
            if (!response.body) return response.arrayBuffer();
            const reader = response.body.getReader();
            const chunks = [];
            let total = 0;
            while (true) {
                if (signal.aborted) {
                    await reader.cancel(signal.reason);
                    throw signal.reason;
                }
                const { done, value } = await reader.read();
                if (done) break;
                total += value.byteLength;
                if (total > LEVEL2_MAX_BYTES) {
                    await reader.cancel();
                    throw new Error(`Level II volume exceeds the ${Math.round(LEVEL2_MAX_BYTES / 1048576)} MB safety limit`);
                }
                chunks.push(value);
                if (declaredLength > 0) updateLoadProgress(15 + Math.round(total / declaredLength * 45));
            }
            const result = new Uint8Array(total);
            let offset = 0;
            chunks.forEach(chunk => {
                result.set(chunk, offset);
                offset += chunk.byteLength;
            });
            return result.buffer;
        }

        function imageBitmapToUrl(bitmap) {
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            canvas.getContext('2d').drawImage(bitmap, 0, 0);
            bitmap.close();
            return new Promise((resolve, reject) => {
                canvas.toBlob(blob => {
                    if (blob) resolve(URL.createObjectURL(blob));
                    else reject(new Error('Level II image encoding failed'));
                }, 'image/png');
            });
        }

        function renderLevel2Couplets() {
            removeLayer('couplets');
            if (settings.source !== 'level2' || !settings.layers.couplets || !level2Couplets.length) return;
            const group = L.layerGroup();
            level2Couplets
                .filter(candidate => Number.isFinite(candidate.latitude)
                    && Number.isFinite(candidate.longitude)
                    && Number.isFinite(candidate.shearMs)
                    && candidate.latitude >= -90 && candidate.latitude <= 90
                    && candidate.longitude >= -180 && candidate.longitude <= 180)
                .slice(0, 20)
                .forEach(candidate => {
                    const shear = settings.units === 'metric'
                        ? `${(candidate.shearMs * 3.6).toFixed(0)} km/h`
                        : `${(candidate.shearMs * 1.94384).toFixed(0)} kt`;
                    const range = settings.units === 'metric'
                        ? `${candidate.rangeKm.toFixed(1)} km`
                        : `${(candidate.rangeKm * 0.621371).toFixed(1)} mi`;
                    const marker = L.circleMarker([candidate.latitude, candidate.longitude], {
                        pane: 'alertPane',
                        radius: Math.min(14, 7 + candidate.shearMs / 18),
                        color: '#ffffff',
                        weight: 2,
                        fillColor: '#ff1744',
                        fillOpacity: 0.72,
                        className: 'rotation-candidate'
                    });
                    marker.bindTooltip(`${t('rotationCandidate')}: ${shear}`, {
                        direction: 'top',
                        offset: [0, -8]
                    });
                    const popup = document.createElement('div');
                    popup.className = 'popup-content';
                    const title = document.createElement('h4');
                    title.textContent = t('rotationCandidate');
                    const details = document.createElement('p');
                    details.textContent = `${t('gateShear')}: ${shear} • ${t('radarRange')}: ${range} • ${candidate.reflectivityDbz} dBZ`;
                    const caution = document.createElement('p');
                    caution.className = 'meta';
                    caution.textContent = t('automationCaution');
                    popup.append(title, details, caution);
                    marker.bindPopup(popup);
                    marker.addTo(group);
                });
            if (!group.getLayers().length) return;
            layerRefs.couplets = group.addTo(map);
            setLayerFeatureCount('couplets', group.getLayers().length);
        }

        async function loadLevel2(signal, generation) {
            showLoadProgress();
            updateLoadProgress(5);
            // Cleared up front so a failed decode cannot leave the Status tab
            // reporting the previous volume as if it were current.
            level2Integrity = null;
            await loadLevel2Sites(signal);
            ensureCurrentRadarLoad(generation, signal);
            const site = selectedLevel2Site();
            if (!site) throw new Error('No NEXRAD Level II site is available');
            const object = await findLatestLevel2Object(site.id, signal);
            ensureCurrentRadarLoad(generation, signal);
            updateLoadProgress(15);
            if (level2LoadedKey !== object.key) {
                const buffer = await downloadLevel2Volume(object.url, signal);
                ensureCurrentRadarLoad(generation, signal);
                updateLoadProgress(65);
                const transferable = buffer.slice(0);
                await requestLevel2Worker('load', { buffer: transferable }, [transferable], signal);
                level2LoadedKey = object.key;
            }
            updateLoadProgress(75);
            const rendered = await requestLevel2Worker('render', {
                product: settings.radarProduct,
                palette: settings.visualPalette,
                elevation: settings.level2Tilt
            }, [], signal);
            ensureCurrentRadarLoad(generation, signal);
            const imageUrl = await imageBitmapToUrl(rendered.bitmap);
            let layer;
            let bounds;
            try {
                ensureCurrentRadarLoad(generation, signal);

                const latitudeDelta = rendered.maxRangeKm / 110.574;
                const longitudeDelta = rendered.maxRangeKm / (111.320 * Math.cos(rendered.latitude * Math.PI / 180));
                bounds = L.latLngBounds(
                    [rendered.latitude - latitudeDelta, rendered.longitude - longitudeDelta],
                    [rendered.latitude + latitudeDelta, rendered.longitude + longitudeDelta]
                );
                layer = L.imageOverlay(imageUrl, bounds, {
                    opacity: settings.opacity,
                    crossOrigin: true,
                    pane: 'radarPane',
                    className: 'radar-layer palette-native-radar level2-radar',
                    alt: `${rendered.site} ${settings.radarProduct} Level II radar`
                });
                layer.getAttribution = () => 'NEXRAD Level II: NOAA / NSF Unidata';
                layer._stormviewObjectUrl = imageUrl;
                layer.addTo(map);
                frameLayers = [layer];
            } catch (error) {
                if (layer) {
                    if (map.hasLayer(layer)) map.removeLayer(layer);
                    revokeLayerObjectUrl(layer);
                } else {
                    URL.revokeObjectURL(imageUrl);
                }
                throw error;
            }
            // The available cuts change between volumes and between products,
            // so the picker is rebuilt from whatever this render actually saw.
            level2Tilts = Array.isArray(rendered.tilts) ? rendered.tilts : [];
            level2Integrity = {
                site: rendered.site,
                product: settings.radarProduct,
                truncated: rendered.isTruncated === true,
                // Cuts carrying THIS product, not the volume total: split-cut VCPs
                // give reflectivity more cuts than velocity from one scan.
                productCuts: level2Tilts.length
            };
            // Products do not all carry the same cuts, so a stored elevation can
            // be absent from this volume. Adopt what actually rendered rather than
            // leaving the setting pointing at a cut the picker cannot show.
            if (Number.isInteger(rendered.elevation) && settings.level2Tilt !== rendered.elevation) {
                const requested = settings.level2Tilt;
                settings.level2Tilt = rendered.elevation;
                if (!embedConfig) saveSettings();
                if (Number.isInteger(requested)) {
                    showDataStatus(`${rendered.site}: tilt unavailable in this scan, showing ${rendered.elevationAngle.toFixed(1)}°`);
                }
            }
            syncLevel2TiltControls(rendered.elevation);
            level2Couplets = Array.isArray(rendered.couplets) ? rendered.couplets : [];
            renderLevel2Couplets();
            frames = [{
                time: object.time,
                path: object.key,
                kind: 'latest',
                site: rendered.site,
                elevationAngle: rendered.elevationAngle,
                siteLat: rendered.latitude,
                siteLng: rendered.longitude,
                maxRangeKm: rendered.maxRangeKm,
                timeSource: 'NOAA/Unidata NEXRAD Level II archive filename'
            }];
            lastPastFrame = 0;
            currentFrame = 0;
            framesLoaded = 1;
            framesTotal = 1;
            framesReady = true;
            if (diagnosticsState.performance.firstUsableFrameMs === null) {
                diagnosticsState.performance.firstUsableFrameMs = Math.round(performance.now() - diagnosticsState.performance.startupStartedAt);
            }
            lastRefreshTime = Date.now();
            updateLoadProgress(100);
            updateTimestamp();
            updateTimelineUI();
            updateLegend();
            updateCoverageStatus();
            if (!map.getBounds().intersects(bounds)) map.fitBounds(bounds, { maxZoom: 7 });
            if (rendered.isTruncated) {
                showToast(`${rendered.site} volume truncated during decode`, 'warn', 5000);
            }
            hideLoadProgress();
        }

        function captureRadarState() {
            if (!frameLayers.length || !frames.length) return null;
            return {
                source: activeRadarSource || settings.source,
                radarProduct: activeRadarProduct || settings.radarProduct,
                frameLayers: [...frameLayers],
                frames: frames.map(frame => ({ ...frame })),
                currentFrame,
                lastPastFrame,
                framesLoaded,
                framesTotal,
                framesReady,
                lastRefreshTime,
                rainviewerData,
                hrrrInitTime,
                hrrrFrames: [...hrrrFrames]
            };
        }

        function revokeLayerObjectUrl(layer) {
            const objectUrl = layer?._stormviewObjectUrl;
            if (!objectUrl) return;
            URL.revokeObjectURL(objectUrl);
            layer._stormviewObjectUrl = null;
        }

        function disposeRadarState(snapshot) {
            snapshot?.frameLayers?.forEach(layer => {
                if (map.hasLayer(layer)) map.removeLayer(layer);
                layer.releaseFrame?.({ dropPreload: true });
                revokeLayerObjectUrl(layer);
            });
        }

        function restoreRadarState(snapshot) {
            if (!snapshot) return false;
            clearAllFrameLayers();
            settings.source = snapshot.source;
            settings.radarProduct = snapshot.radarProduct;
            frameLayers = snapshot.frameLayers;
            frames = snapshot.frames;
            currentFrame = Math.min(snapshot.currentFrame, frameLayers.length - 1);
            lastPastFrame = snapshot.lastPastFrame;
            framesLoaded = snapshot.framesLoaded;
            framesTotal = snapshot.framesTotal;
            framesReady = snapshot.framesReady;
            lastRefreshTime = snapshot.lastRefreshTime;
            rainviewerData = snapshot.rainviewerData;
            hrrrInitTime = snapshot.hrrrInitTime;
            hrrrFrames = snapshot.hrrrFrames;
            activeRadarSource = snapshot.source;
            saveSettings();

            const layer = frameLayers[currentFrame];
            if (layer && !map.hasLayer(layer)) layer.addTo(map);
            layer?.setOpacity(settings.opacity);
            applyFramePreloadWindow(currentFrame);
            syncRadarCapabilities();
            updatePlaybackVisibility();
            updateLegend();
            updateTimestamp();
            updateTimelineUI();
            hideLoadProgress();
            return true;
        }

        function ensureCurrentRadarLoad(generation, signal) {
            if (signal?.aborted || generation !== radarLoadGeneration) {
                throw signal?.reason || new DOMException('Superseded radar request', 'AbortError');
            }
        }

        async function loadRadarData() {
            if (replayMode) return;
            const generation = ++radarLoadGeneration;
            radarAbortController?.abort(new DOMException('Superseded radar request', 'AbortError'));
            radarAbortController = new AbortController();
            const { signal } = radarAbortController;
            const requestedSource = settings.source;
            if (requestedSource !== 'level2') disposeLevel2Worker();
            const previousState = retainedRadarState || captureRadarState();
            const capability = RADAR_CAPABILITIES[requestedSource] || RADAR_CAPABILITIES.mrms;

            try {
                pause();
                clearAllFrameLayers({ dispose: Boolean(retainedRadarState) });
                retainedRadarState = previousState;
                framesReady = false;
                setProviderStatus('loading', t('providerLoading', { provider: capability.label }));
                
                await providerRegistry.radar(requestedSource).load(signal, generation);
                ensureCurrentRadarLoad(generation, signal);
                lastRefreshTime = Date.now();
                activeRadarSource = requestedSource;
                activeRadarProduct = settings.radarProduct;
                if (retainedRadarState === previousState) {
                    disposeRadarState(previousState);
                    retainedRadarState = null;
                }
                setProviderStatus('current', t('providerCurrent', { provider: capability.label }));
            } catch(e) {
                if (signal.aborted || generation !== radarLoadGeneration || e?.name === 'AbortError') return;
                console.error('Radar error:', e);

                if (requestedSource !== 'mrms') {
                    showToast(`${capability.label} unavailable; using MRMS fallback`, 'warn');
                    if (requestedSource === 'level2') {
                        disposeLevel2Worker(new DOMException('Level II fallback started', 'AbortError'));
                    }
                    settings.source = 'mrms';
                    syncRadarCapabilities();
                    saveSettings();
                    try {
                        clearAllFrameLayers();
                        await providerRegistry.radar('mrms').load(signal, generation);
                        ensureCurrentRadarLoad(generation, signal);
                        lastRefreshTime = Date.now();
                        activeRadarSource = 'mrms';
                        activeRadarProduct = settings.radarProduct;
                        if (retainedRadarState === previousState) {
                            disposeRadarState(previousState);
                            retainedRadarState = null;
                        }
                        setProviderStatus(
                            'fallback',
                            t('providerFallback', { provider: capability.label }),
                            () => {
                                settings.source = requestedSource;
                                syncRadarCapabilities();
                                saveSettings();
                                loadRadarData();
                            }
                        );
                    } catch(e2) {
                        if (signal.aborted || generation !== radarLoadGeneration || e2?.name === 'AbortError') return;
                        console.error('MRMS fallback error:', e2);
                        const restored = restoreRadarState(previousState);
                        if (restored && retainedRadarState === previousState) retainedRadarState = null;
                        setProviderStatus(
                            restored ? 'stale' : 'error',
                            restored
                                ? t('providerStale', { provider: capability.label })
                                : t('providerUnavailable', { provider: capability.label }),
                            loadRadarData
                        );
                    }
                } else {
                    const restored = restoreRadarState(previousState);
                    if (restored && retainedRadarState === previousState) retainedRadarState = null;
                    setProviderStatus(
                        restored ? 'stale' : 'error',
                        restored
                            ? t('providerStale', { provider: 'MRMS' })
                            : t('providerUnavailable', { provider: 'MRMS' }),
                        loadRadarData
                    );
                }
            } finally {
                if (generation === radarLoadGeneration) {
                    if (diagnosticsState.provider.state === 'error') showLoadFailure();
                    else hideLoadProgress();
                }
            }
        }

        async function loadRainViewerPreloaded(signal, generation) {
            showLoadProgress();
            loadAborted = false;
            
            const resp = await fetchWithTimeout('https://api.rainviewer.com/public/weather-maps.json', { signal });
            rainviewerData = await resp.json();
            ensureCurrentRadarLoad(generation, signal);

            frames = Array.isArray(rainviewerData.radar?.past)
                ? rainviewerData.radar.past.map(frame => ({
                    ...frame,
                    kind: 'past',
                    timeSource: 'RainViewer weather maps metadata'
                }))
                : [];
            if (settings.reducedData) frames = frames.slice(-6);
            if (!frames.length || typeof rainviewerData.host !== 'string') {
                throw new Error('RainViewer returned no supported past radar frames');
            }
            const rainViewerBackoffKey = tileProviderKey(rainviewerData.host);
            rateLimiter.reset(rainViewerBackoffKey);
            lastPastFrame = frames.length - 1;

            framesTotal = frames.length;
            framesLoaded = 0;
            updateLoadProgress(0);

            // Memory-optimized tile configuration
            const tileOptions = {
                opacity: 0,
                webgl: true,
                pane: 'radarPane',
                className: 'radar-layer radar-cached',
                updateWhenIdle: true,
                updateWhenZooming: false,
                keepBuffer: 2,
                tileSize: 256,
                maxNativeZoom: 7,
                maxZoom: 18,
                minZoom: 3,
                attribution: '<a href="https://www.rainviewer.com/">RainViewer</a>'
            };

            // Load frames in batches
            const BATCH_SIZE = 3;
            const BATCH_DELAY = 200;
            
            for (let batchStart = 0; batchStart < frames.length; batchStart += BATCH_SIZE) {
                ensureCurrentRadarLoad(generation, signal);
                
                while (rateLimiter.isPaused(rainViewerBackoffKey)) {
                    await abortableDelay(500, signal);
                    ensureCurrentRadarLoad(generation, signal);
                }
                
                const batchEnd = Math.min(batchStart + BATCH_SIZE, frames.length);
                
                for (let i = batchStart; i < batchEnd; i++) {
                    const frame = frames[i];
                    const url = buildRadarUrl(frame);
                    
                    const layer = L.tileLayer.cached(url, tileOptions);
                    
                    layer.on('load', markRadarFrameLoaded);
                    
                    frameLayers[i] = layer;
                    
                    if (i === 0) {
                        layer.addTo(map);
                        layer.setOpacity(settings.opacity);
                        currentFrame = 0;
                        updateTimestamp();
                        updateTimelineUI();
                    }
                }
                
                if (batchStart > 0) {
                    await abortableDelay(BATCH_DELAY, signal);
                }
            }

            onAllFramesLoaded(generation, signal);
        }

        function buildRadarUrl(frame) {
            const color = 2;
            const smooth = settings.smooth === 0 ? 0 : 1;
            const snow = settings.snowColor === 0 ? 0 : 1;
            return `${rainviewerData.host}${frame.path}/256/{z}/{x}/{y}/${color}/${smooth}_${snow}.png`;
        }

        function onAllFramesLoaded(generation, signal) {
            ensureCurrentRadarLoad(generation, signal);
            framesReady = true;
            lastRefreshTime = Date.now();
            hideLoadProgress();
            updateLegend();
            // Auto-play if source supports animation
            if (RADAR_CAPABILITIES[settings.source]?.animation && frames.length > 1
                && (!embedConfig || embedConfig.autoplay)) {
                play();
            }
        }

        async function loadMRMS(signal, generation) {
            ensureCurrentRadarLoad(generation, signal);
            clearAllFrameLayers();
            
            // Get the appropriate product URL
            let productUrl = RADAR_PRODUCTS.n0q; // default
            if (settings.radarProduct === 'velocity') {
                productUrl = RADAR_PRODUCTS.n0v;
            } else if (settings.radarProduct === 'echoTops') {
                productUrl = RADAR_PRODUCTS.net;
            } else if (settings.radarProduct === 'precipAccum') {
                productUrl = RADAR_PRODUCTS.n1p;
            }

            const metaResp = await fetchWithTimeout(DATA_URLS.mrmsLatest, { signal });
            const metadata = await metaResp.json();
            const validTime = providerEpochSeconds(metadata?.meta?.valid, 'IEM radar metadata');
            ensureCurrentRadarLoad(generation, signal);
            
            const currentLayer = L.tileLayer.cached(productUrl, {
                opacity: settings.opacity,
                webgl: true,
                pane: 'radarPane',
                className: 'radar-layer radar-cached',
                maxNativeZoom: 8,
                maxZoom: 18,
                keepBuffer: 2,
                updateWhenZooming: false,
                updateWhenIdle: true,
                attribution: IEM_ATTRIBUTION
            });
            const historyEnabled = settings.radarProduct === 'reflectivity';
            frames = historyEnabled
                ? buildRadarHistoryFrames(validTime, { reducedData: settings.reducedData })
                : [{
                    time: validTime,
                    path: 'mrms-current',
                    kind: 'latest',
                    timeSource: 'IEM US composite metadata'
                }];
            frameLayers = historyEnabled
                ? frames.slice(0, -1).map(frame => createFrameAwareImageOverlay(
                    frame.path,
                    [[23, -126], [50, -65]],
                    {
                        opacity: 0,
                        pane: 'radarPane',
                        className: 'radar-layer radar-cached radar-history-frame',
                        alt: `Archived IEM NEXRAD composite ${new Date(frame.time * 1000).toISOString()}`,
                        attribution: IEM_ATTRIBUTION
                    }
                ))
                : [];
            frameLayers.push(currentLayer);
            map.getContainer().dataset.radarHistoryHours = historyEnabled
                ? String(radarHistoryHours(settings.reducedData))
                : '0';
            framesTotal = frames.length;
            framesLoaded = 0;
            currentLayer.once('load', markRadarFrameLoaded);
            currentLayer.addTo(map);
            ensureCurrentRadarLoad(generation, signal);

            lastPastFrame = Math.max(0, frames.length - 2);
            currentFrame = frames.length - 1;
            framesReady = true;
            lastRefreshTime = Date.now();
            applyFramePreloadWindow(currentFrame);
            updateTimestamp();
            updateTimelineUI();
            updatePlaybackVisibility();
            hideLoadProgress();
        }
        
        // ==================== NOAA nowCOAST WMS RADAR ====================
        async function loadNowCOAST(signal, generation) {
            ensureCurrentRadarLoad(generation, signal);
            clearAllFrameLayers();

            const capabilitiesResp = await fetchWithTimeout(DATA_URLS.nowcoastCapabilities, { signal });
            const capabilitiesXml = await capabilitiesResp.text();
            const capabilitiesDoc = new DOMParser().parseFromString(capabilitiesXml, 'application/xml');
            const conusLayer = [...capabilitiesDoc.querySelectorAll('Layer')].find(layer =>
                layer.querySelector(':scope > Name')?.textContent === 'conus_base_reflectivity_mosaic'
            );
            const validIso = conusLayer?.querySelector(':scope > Dimension[name="time"]')?.getAttribute('default');
            const validTime = providerEpochSeconds(validIso, 'NOAA nowCOAST');
            ensureCurrentRadarLoad(generation, signal);
            
            const layer = L.tileLayer.wms('https://nowcoast.noaa.gov/geoserver/observations/weather_radar/ows', {
                layers: 'conus_base_reflectivity_mosaic',
                format: 'image/png',
                transparent: true,
                crossOrigin: true,
                version: '1.3.0',
                time: new Date(validTime * 1000).toISOString(),
                crs: L.CRS.EPSG3857,
                opacity: settings.opacity,
                pane: 'radarPane',
                className: 'radar-layer radar-cached',
                maxZoom: 18,
                keepBuffer: 2,
                updateWhenZooming: false,
                updateWhenIdle: true,
                attribution: '<a href="https://nowcoast.noaa.gov/">NOAA nowCOAST</a>'
            });
            framesTotal = 1;
            framesLoaded = 0;
            layer.once('load', markRadarFrameLoaded);
            layer.addTo(map);
            frameLayers.push(layer);
            ensureCurrentRadarLoad(generation, signal);
            
            frames = [{
                time: validTime,
                path: 'nowcoast',
                kind: 'latest',
                timeSource: 'NOAA nowCOAST capabilities'
            }];
            lastPastFrame = 0;
            currentFrame = 0;
            framesReady = true;
            lastRefreshTime = Date.now();
            updateTimestamp();
            updateTimelineUI();
            hideLoadProgress();
            showToast('NOAA 1km WMS radar loaded', 'success');
        }

        function createGeometRadarLayer(frame) {
            const layer = L.tileLayer.wms(GEOMET_RADAR_ENDPOINT, {
                layers: GEOMET_RADAR_LAYER,
                styles: GEOMET_RADAR_STYLE,
                format: 'image/png',
                transparent: true,
                version: '1.3.0',
                time: frame.path,
                crs: L.CRS.EPSG3857,
                opacity: 0,
                pane: 'radarPane',
                className: 'radar-layer radar-cached eccc-radar-frame',
                maxZoom: 18,
                keepBuffer: 1,
                updateWhenZooming: false,
                updateWhenIdle: true,
                attribution: '<a href="https://eccc-msc.github.io/open-data/licence/readme_en/">Environment and Climate Change Canada</a>'
            });
            layer._stormviewOnDemandFrame = true;
            layer._stormviewFrameReady = false;
            layer._stormviewFrameCounted = false;
            layer.on('loading', () => {
                layer._stormviewFrameReady = false;
            });
            layer.on('load', () => {
                layer._stormviewFrameReady = true;
                if (!layer._stormviewFrameCounted) {
                    layer._stormviewFrameCounted = true;
                    markRadarFrameLoaded();
                }
            });
            layer.on('remove', () => {
                layer._stormviewFrameReady = false;
            });
            return layer;
        }

        async function loadGeometRadar(signal, generation) {
            showLoadProgress();
            loadAborted = false;
            const response = await fetchWithTimeout(DATA_URLS.geometCapabilities, { signal });
            const capabilities = new DOMParser().parseFromString(await response.text(), 'application/xml');
            const parserError = capabilities.querySelector('parsererror');
            if (parserError) throw new Error('GeoMet returned invalid WMS capabilities');
            const radarLayer = [...capabilities.querySelectorAll('Layer')].find(layer =>
                layer.querySelector(':scope > Name')?.textContent?.trim() === GEOMET_RADAR_LAYER
            );
            const timeDimension = [...(radarLayer?.children || [])].find(element =>
                element.localName === 'Dimension' && element.getAttribute('name') === 'time'
            );
            if (!timeDimension) throw new Error('GeoMet radar times are unavailable');
            ensureCurrentRadarLoad(generation, signal);

            frames = buildGeometRadarFrames(
                timeDimension.textContent,
                timeDimension.getAttribute('default'),
                { reducedData: settings.reducedData }
            );
            frameLayers = frames.map(createGeometRadarLayer);
            framesTotal = frames.length;
            framesLoaded = 0;
            currentFrame = frames.length - 1;
            lastPastFrame = Math.max(0, currentFrame - 1);
            framesReady = true;
            lastRefreshTime = Date.now();
            map.getContainer().dataset.radarHistoryHours = settings.reducedData ? '1' : '3';

            const currentLayer = frameLayers[currentFrame];
            currentLayer.once('load', () => {
                if (settings.source === 'eccc' && framesReady && (!embedConfig || embedConfig.autoplay)) play();
            });
            currentLayer.addTo(map);
            currentLayer.setOpacity(settings.opacity);
            ensureCurrentRadarLoad(generation, signal);
            updateTimestamp();
            updateTimelineUI();
            updatePlaybackVisibility();
            hideLoadProgress();
        }
        
        // ==================== HRRR FORECAST RADAR ====================
        async function loadHRRR(signal, generation) {
            showLoadProgress();
            loadAborted = false;

                // Get latest HRRR run info
                const metaResp = await fetchWithTimeout(DATA_URLS.hrrrLatest, { signal });
                const meta = await metaResp.json();
                ensureCurrentRadarLoad(generation, signal);
                const modelInitEpoch = providerEpochSeconds(meta.model_init_utc, 'HRRR metadata');
                const d = new Date(modelInitEpoch * 1000);
                hrrrInitTime = d.getUTCFullYear().toString() +
                    String(d.getUTCMonth() + 1).padStart(2, '0') +
                    String(d.getUTCDate()).padStart(2, '0') +
                    String(d.getUTCHours()).padStart(2, '0') +
                    String(d.getUTCMinutes()).padStart(2, '0');
                
                const forecastLimit = settings.reducedData ? 360 : 1080;
                const maxForecastMinute = Math.min(forecastLimit, Math.max(0, Number(meta.forecast_minute) || forecastLimit));
                frames = [];
                hrrrFrames = [];
                
                // Provider metadata identifies the model run; valid time is initialization plus lead time.
                for (let hour = 0; hour <= Math.floor(maxForecastMinute / 60); hour++) {
                    const mins = hour * 60;
                    frames.push({
                        time: modelInitEpoch + (hour * 3600),
                        mins: mins,
                        isForecast: hour > 0,
                        kind: hour > 0 ? 'forecast' : 'analysis',
                        modelInitTime: modelInitEpoch,
                        forecastHour: hour,
                        timeSource: 'IEM HRRR metadata'
                    });
                }
                
                framesTotal = frames.length;
                framesLoaded = 0;
                lastPastFrame = 0; // Only first frame is "past" (analysis)
                updateLoadProgress(0);
                
                const tileOptions = {
                    opacity: 0,
                    webgl: true,
                    pane: 'radarPane',
                    className: 'radar-layer radar-cached radar-smooth',
                    updateWhenIdle: true,
                    updateWhenZooming: false,
                    keepBuffer: 2,
                    tileSize: 256,
                    maxNativeZoom: 9,
                    maxZoom: 18,
                    minZoom: 3,
                    attribution: IEM_ATTRIBUTION
                };
                
                // Load frames in batches
                const BATCH_SIZE = 4;
                const BATCH_DELAY = 150;
                
                for (let batchStart = 0; batchStart < frames.length; batchStart += BATCH_SIZE) {
                    ensureCurrentRadarLoad(generation, signal);
                    
                    const batchEnd = Math.min(batchStart + BATCH_SIZE, frames.length);
                    
                    for (let i = batchStart; i < batchEnd; i++) {
                        const frame = frames[i];
                        const url = HRRR_TILES.refd(frame.mins, hrrrInitTime || 0);
                        
                        const layer = L.tileLayer.cached(url, tileOptions);
                        
                        layer.on('load', markRadarFrameLoaded);
                        
                        frameLayers[i] = layer;
                        hrrrFrames[i] = layer;
                        
                        if (i === 0) {
                            layer.addTo(map);
                            layer.setOpacity(settings.opacity);
                            currentFrame = 0;
                            updateTimestamp();
                            updateTimelineUI();
                        }
                    }
                    
                    if (batchStart > 0) {
                        await abortableDelay(BATCH_DELAY, signal);
                    }
                }
                
                onAllFramesLoaded(generation, signal);
                showToast('HRRR 18-hour forecast loaded', 'success');
        }
        
        // ==================== TROPICAL / HURRICANES ====================
        async function loadTropical() {
            removeLayer('tropical');
            const controller = beginLayerRequest('tropical');
            layerRefs.tropical = L.layerGroup().addTo(map);
            
            try {
                const catalog = await tropicalLayerIds(controller.signal);
                if (controller.signal.aborted || !settings.layers.tropical) return;
                const probes = await activeTropicalSlots(catalog.slots, controller.signal);
                if (controller.signal.aborted || !settings.layers.tropical) return;

                // The outlook areas are drawn whether or not a numbered storm
                // exists; most of a season has development areas and no storm.
                const layers = [
                    ...catalog.outlook,
                    ...probes.active.flatMap(slot => slot.products)
                ];
                let featureCount = 0;
                let failedLayers = probes.failures;

                for (const { id: layerId, name, kind } of layers) {
                    try {
                        const resp = await fetchWithTimeout(`${NHC_TROPICAL_SERVICE}/${layerId}/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson`, { signal: controller.signal });
                        const data = await resp.json();
                        if (controller.signal.aborted || !settings.layers.tropical) return;
                        const features = featureList(data, MAX_POINT_FEATURES);
                        if (features.length > 0) {
                            const layer = L.geoJSON({ type: 'FeatureCollection', features }, {
                                style: getTropicalStyle(kind),
                                pointToLayer: (feature, latlng) => {
                                    return L.circleMarker(latlng, getTropicalPointStyle(feature));
                                },
                                onEachFeature: (feature, layer) => {
                                    if (feature.properties) {
                                        const p = feature.properties;
                                        const name = escapeHTML(p.STORMNAME || p.NAME || 'Unknown', 120);
                                        const type = escapeHTML(p.STORMTYPE || p.DVLBL || '', 120);
                                        const wind = escapeHTML(p.MAXWIND || p.INTENSITY || '', 30);
                                        layer.bindPopup(`
                                            <div class="popup-content">
                                                <h4>${name}</h4>
                                                <p>${type}</p>
                                                ${wind ? `<p>Max Wind: ${wind} kt</p>` : ''}
                                            </div>
                                        `);
                                    }
                                }
                            });
                            layerRefs.tropical.addLayer(layer);
                            featureCount += features.length;
                        }
                    } catch(e) {
                        if (e?.name === 'AbortError') return;
                        failedLayers += 1;
                        console.warn(`Failed to load tropical layer ${name}:`, e);
                    }
                }
                
                setLayerFeatureCount('tropical', featureCount);
                // A failed request must never read as an all-clear basin.
                showDataStatus(failedLayers > 0
                    ? `Tropical data incomplete: ${failedLayers} request(s) failed`
                    : 'Tropical data loaded');
            } catch(e) {
                if (e?.name === 'AbortError') return;
                console.error('Tropical load error:', e);
            } finally {
                finishLayerRequest('tropical', controller);
            }
        }
        
        // The service publishes 400 layers and has already been re-published
        // with ids appended out of order, so ids are resolved by name from the
        // service description rather than computed. A layer that owns
        // subLayerIds is a group and answers a query with an error body.
        async function tropicalLayerIds(signal) {
            const resp = await fetchWithTimeout(`${NHC_TROPICAL_SERVICE}?f=json`, { signal });
            const data = await resp.json();
            const leaves = new Map();
            for (const layer of Array.isArray(data?.layers) ? data.layers : []) {
                const id = Number(layer?.id);
                const name = String(layer?.name || '');
                if (!Number.isInteger(id) || !name) continue;
                if (Array.isArray(layer?.subLayerIds) && layer.subLayerIds.length > 0) continue;
                leaves.set(name, id);
            }
            return {
                outlook: NHC_OUTLOOK_LAYERS
                    .map(name => ({ name, kind: name, id: leaves.get(name) }))
                    .filter(entry => Number.isInteger(entry.id)),
                slots: NHC_SLOT_IDS.map(slotId => ({
                    slotId,
                    products: NHC_SLOT_PRODUCTS
                        .map(kind => ({ name: `${slotId} ${kind}`, kind, id: leaves.get(`${slotId} ${kind}`) }))
                        .filter(entry => Number.isInteger(entry.id))
                })).filter(slot => slot.products.length > 0)
            };
        }

        // Returns the slots that currently hold a forecast point, so a basin
        // with no storm costs one 11-byte response instead of four geometry
        // queries. A probe that fails is reported, never treated as empty.
        async function activeTropicalSlots(slots, signal) {
            const probes = await Promise.all(slots.map(async slot => {
                const probe = slot.products[0];
                try {
                    const resp = await fetchWithTimeout(`${NHC_TROPICAL_SERVICE}/${probe.id}/query?where=1%3D1&returnCountOnly=true&f=json`, { signal });
                    const data = await resp.json();
                    if (!Number.isFinite(Number(data?.count))) throw new Error(`${probe.name} did not return a count`);
                    return { slot, active: Number(data.count) > 0, failed: false };
                } catch(e) {
                    if (e?.name === 'AbortError') return { slot, active: false, failed: false };
                    console.warn(`Failed to probe tropical slot ${slot.slotId}:`, e);
                    return { slot, active: false, failed: true };
                }
            }));
            return {
                active: probes.filter(probe => probe.active).map(probe => probe.slot),
                failures: probes.filter(probe => probe.failed).length
            };
        }

        function getTropicalStyle(kind) {
            const styles = {
                'Seven-Day: Current Location': { color: '#ffffff', weight: 2, opacity: 0.8 },
                'Seven-Day: Potential Development Region': { color: '#00ffff', weight: 3, opacity: 0.9 },
                'Forecast Points': { color: '#ffffff', weight: 2, opacity: 0.8 },
                'Forecast Track': { color: '#00ffff', weight: 3, opacity: 0.9 },
                'Forecast Cone': { color: '#ffffff', weight: 2, fillColor: '#ff6b6b', fillOpacity: 0.2 },
                'Watch-Warning': { color: '#ff0000', weight: 3, opacity: 1 }
            };
            return styles[kind] || { color: '#ffffff', weight: 1 };
        }
        
        function getTropicalPointStyle(feature) {
            const p = feature.properties || {};
            const wind = parseInt(p.MAXWIND || p.INTENSITY || 0);
            
            let color = '#00ff00'; // TD
            if (wind >= 137) color = '#ff00ff'; // Cat 5
            else if (wind >= 113) color = '#ff6666'; // Cat 4
            else if (wind >= 96) color = '#ff9900'; // Cat 3
            else if (wind >= 83) color = '#ffcc00'; // Cat 2
            else if (wind >= 64) color = '#ffff00'; // Cat 1
            else if (wind >= 34) color = '#00ffff'; // TS
            
            return {
                radius: 8,
                fillColor: color,
                color: '#ffffff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            };
        }
        
        // ==================== ENHANCED SPC PRODUCTS ====================
        async function loadSPCWatches() {
            const controller = beginLayerRequest('spcWatches', true);
            try {
                const resp = await fetchWithTimeout(DATA_URLS.spcWatches, { signal: controller.signal });
                const data = await resp.json();
                const features = featureList(data);
                if (!isLayerRequestCurrent('spcWatches', controller)) return;
                if (features.length === 0) {
                    clearOverlayLayer('spcWatches');
                    setLayerRequestState('spcWatches', 'empty', 'No active SPC watches');
                    showToast('No active watches right now', 'info', 2500);
                    return;
                }
                const nextLayer = L.geoJSON(features, {
                    style: (feature) => {
                        const evt = safeText(feature.properties?.event, 120).toLowerCase();
                        const isTornado = evt.includes('tornado');
                        return {
                            color: isTornado ? '#ff0000' : '#ffff00',
                            weight: 3,
                            fillColor: isTornado ? '#ff0000' : '#ffff00',
                            fillOpacity: 0.15
                        };
                    },
                    onEachFeature: (feature, layer) => {
                        const p = feature.properties || {};
                        layer.bindPopup(`
                            <div class="popup-content">
                                <h4>${escapeHTML(p.event || 'Watch', 120)}</h4>
                                <p>${escapeHTML(p.headline || '', 300)}</p>
                                <p class="meta">Expires: ${escapeHTML(formatExternalDate(p.expires))}</p>
                            </div>
                        `);
                    },
                    pane: 'alertPane'
                });
                if (commitOverlayLayer(
                    'spcWatches',
                    controller,
                    nextLayer,
                    features.length,
                    `${features.length} active watch(es)`
                )) showDataStatus(`${features.length} active watch(es)`);
            } catch(e) {
                if (e?.name !== 'AbortError' && layerRequests.get('spcWatches') === controller) {
                    console.error('SPC Watches load error:', e);
                    failOverlayRequest('spcWatches', e);
                }
            } finally {
                finishLayerRequest('spcWatches', controller);
            }
        }
        
        async function loadSPCMCD() {
            const controller = beginLayerRequest('spcMCD', true);
            try {
                if (!spcMcdToolsPromise) spcMcdToolsPromise = import('./spc-mcd.js');
                const [tools, resp] = await Promise.all([
                    spcMcdToolsPromise,
                    fetchWithTimeout(DATA_URLS.spcMCD, { signal: controller.signal })
                ]);
                const feedItems = tools.parseSpcMcdFeed(await resp.text());
                const results = await Promise.allSettled(feedItems.map(async item => {
                    const detailResponse = await fetchWithTimeout(item.url, { signal: controller.signal });
                    return tools.parseSpcMcdDetail(await detailResponse.text(), item);
                }));
                controller.signal.throwIfAborted();
                if (!isLayerRequestCurrent('spcMCD', controller)) return;
                const features = results
                    .filter(result => result.status === 'fulfilled')
                    .map(result => result.value);
                if (feedItems.length && !features.length) throw new Error('SPC MCD details could not be parsed');
                if (features.length === 0) {
                    clearOverlayLayer('spcMCD');
                    showDataStatus('No active MCDs');
                    setLayerRequestState('spcMCD', 'empty', 'No active Mesoscale Discussions');
                    return;
                }
                const nextLayer = L.geoJSON(features, {
                    className: 'spc-mcd-layer',
                    renderer: L.svg({ pane: 'alertPane' }),
                    style: {
                        color: '#00ffff',
                        weight: 2,
                        fillColor: '#00ffff',
                        fillOpacity: 0.1,
                        dashArray: '5,5'
                    },
                    onEachFeature: (feature, layer) => {
                        layer.options.className = 'spc-mcd-layer';
                        const p = feature.properties || {};
                        layer.bindPopup(`
                            <div class="popup-content">
                                <h4>${escapeHTML(p.event || 'Mesoscale Discussion', 120)}</h4>
                                <p><strong>Areas:</strong> ${escapeHTML(p.areasAffected || 'See official discussion', 240)}</p>
                                ${p.concerning ? `<p><strong>Concerning:</strong> ${escapeHTML(p.concerning, 240)}</p>` : ''}
                                <p>${escapeHTML(p.summary || '', 600)}</p>
                                ${p.validText ? `<p class="meta">Valid: ${escapeHTML(p.validText, 80)}</p>` : ''}
                            </div>
                        `);
                    },
                    pane: 'alertPane'
                });
                if (commitOverlayLayer(
                    'spcMCD',
                    controller,
                    nextLayer,
                    features.length,
                    `${features.length} active MCD(s)`
                )) showDataStatus(`${features.length} active MCD(s)`);
            } catch(e) {
                if (e.name !== 'AbortError' && layerRequests.get('spcMCD') === controller) {
                    console.error('SPC MCD load error:', e);
                    failOverlayRequest('spcMCD', e);
                    showDataStatus('SPC MCDs unavailable');
                }
            } finally {
                finishLayerRequest('spcMCD', controller);
            }
        }
        
        async function loadSPCProbability(type) {
            const urls = {
                tornado: DATA_URLS.spcTornado,
                wind: DATA_URLS.spcWind,
                hail: DATA_URLS.spcHail
            };
            
            const colors = {
                tornado: ['#00ff00', '#996633', '#ff0000', '#ff00ff'],
                wind: ['#996633', '#ffff00', '#ff0000', '#ff00ff'],
                hail: ['#00ff00', '#996633', '#ffff00', '#ff0000']
            };
            
            const layerKey = `spc${type.charAt(0).toUpperCase() + type.slice(1)}`;
            const controller = beginLayerRequest(layerKey, true);
            try {
                const resp = await fetchWithTimeout(urls[type], { signal: controller.signal });
                const data = await resp.json();
                
                // Filter out features with empty geometries
                const validFeatures = featureList(data).filter(f => {
                    const geom = f.geometry || {};
                    if (geom.type === 'GeometryCollection') return (geom.geometries || []).length > 0;
                    return geom.coordinates && geom.coordinates.length > 0;
                });
                if (!isLayerRequestCurrent(layerKey, controller)) return;
                if (validFeatures.length === 0) {
                    clearOverlayLayer(layerKey);
                    setLayerRequestState(layerKey, 'empty', `No ${type} outlook areas`);
                    showDataStatus(`No ${type} outlook areas`);
                    return;
                }
                const nextLayer = L.geoJSON({ type: 'FeatureCollection', features: validFeatures }, {
                    style: (feature) => {
                        const label = feature.properties?.LABEL || '';
                        let color = colors[type][0];
                        if (label.includes('15') || label.includes('SIGN')) color = colors[type][1];
                        if (label.includes('30')) color = colors[type][2];
                        if (label.includes('45') || label.includes('60')) color = colors[type][3];
                        
                        return {
                            color: color,
                            weight: 2,
                            fillColor: color,
                            fillOpacity: 0.2
                        };
                    },
                    pane: 'alertPane'
                });
                commitOverlayLayer(
                    layerKey,
                    controller,
                    nextLayer,
                    validFeatures.length,
                    `${validFeatures.length} ${type} outlook area(s)`
                );
            } catch(e) {
                if (e?.name !== 'AbortError' && layerRequests.get(layerKey) === controller) {
                    console.error(`SPC ${type} probability load error:`, e);
                    failOverlayRequest(layerKey, e);
                }
            } finally {
                finishLayerRequest(layerKey, controller);
            }
        }
        
        // ==================== SATELLITE LAYERS ====================
        function loadSatelliteLayer(type) {
            const layerKeys = {
                visible: 'satellite',
                ir: 'satelliteIR',
                wv: 'satelliteWV',
                geocolor: 'satelliteGeoColor',
                sandwich: 'satelliteSandwich',
                mesoscale: 'satelliteMesoscale'
            };
            const layerKey = layerKeys[type] || 'satellite';
            removeLayer(layerKey);
            const urls = {
                visible: SATELLITE_LAYERS.visible,
                ir: SATELLITE_LAYERS.ir,
                wv: SATELLITE_LAYERS.waterVapor,
                geocolor: SATELLITE_LAYERS.geoColor
            };
            const classNames = {
                visible: 'satellite-layer-visible',
                ir: 'satellite-layer-infrared',
                wv: 'satellite-layer-water-vapor',
                geocolor: 'satellite-geocolor'
            };
            const createLayer = (url, className, opacity = 0.72, attribution = IEM_ATTRIBUTION) => L.tileLayer.cached(url, {
                opacity,
                pane: 'satellitePane',
                maxNativeZoom: 8,
                maxZoom: 18,
                className,
                attribution
            });

            if (type === 'sandwich') {
                const geoColor = createLayer(SATELLITE_LAYERS.geoColor, 'satellite-geocolor', 0.68, 'NOAA / NESDIS');
                const enhancedIR = createLayer(SATELLITE_LAYERS.enhancedIR, 'satellite-ir-sandwich', 0.78, 'NOAA / NESDIS');
                layerRefs[layerKey] = L.layerGroup([geoColor, enhancedIR]).addTo(map);
                setLayerFeatureCount(layerKey, 2);
                return;
            }
            if (type === 'mesoscale') {
                const firstSector = createLayer(
                    SATELLITE_LAYERS.mesoscale1,
                    'satellite-mesoscale satellite-mesoscale-1',
                    0.82
                );
                const secondSector = createLayer(
                    SATELLITE_LAYERS.mesoscale2,
                    'satellite-mesoscale satellite-mesoscale-2',
                    0.82
                );
                layerRefs[layerKey] = L.layerGroup([firstSector, secondSector]).addTo(map);
                setLayerFeatureCount(layerKey, 2);
                return;
            }

            const isNesdis = type === 'geocolor';
            layerRefs[layerKey] = createLayer(
                urls[type] || urls.visible,
                classNames[type] || classNames.visible,
                0.7,
                isNesdis ? 'NOAA / NESDIS' : IEM_ATTRIBUTION
            ).addTo(map);
            setLayerFeatureCount(layerKey, 1);
        }
        
        // ==================== AVIATION WEATHER ====================
        async function loadSIGMETs() {
            const controller = beginLayerRequest('sigmets', true);
            try {
                const resp = await fetchWithTimeout(DATA_URLS.sigmets, { signal: controller.signal });
                const data = await resp.json();
                const features = featureList(data);
                if (!isLayerRequestCurrent('sigmets', controller)) return;
                if (features.length === 0) {
                    clearOverlayLayer('sigmets');
                    setLayerRequestState('sigmets', 'empty', 'No active SIGMETs or AIRMETs');
                    showDataStatus('No active SIGMETs/AIRMETs');
                    return;
                }
                const nextLayer = L.geoJSON(features, {
                    style: (feature) => {
                        const evt = safeText(feature.properties?.event, 120).toLowerCase();
                        let color = '#ff9900';
                        if (evt.includes('convective')) color = '#ff0000';
                        else if (evt.includes('airmet')) color = '#00ccff';
                        
                        return {
                            color: color,
                            weight: 2,
                            fillColor: color,
                            fillOpacity: 0.15,
                            dashArray: '10,5'
                        };
                    },
                    onEachFeature: (feature, layer) => {
                        const p = feature.properties || {};
                        layer.bindPopup(`
                            <div class="popup-content">
                                <h4>${escapeHTML(p.event || 'Aviation Alert', 120)}</h4>
                                <p>${escapeHTML(p.headline || '', 200)}</p>
                                <p class="meta">${p.expires ? `Expires: ${escapeHTML(formatExternalDate(p.expires))}` : ''}</p>
                            </div>
                        `);
                    },
                    pane: 'alertPane'
                });
                if (commitOverlayLayer(
                    'sigmets',
                    controller,
                    nextLayer,
                    features.length,
                    `${features.length} SIGMET/AIRMET(s)`
                )) showDataStatus(`${features.length} SIGMET/AIRMET(s)`);
            } catch(e) {
                if (e?.name !== 'AbortError' && layerRequests.get('sigmets') === controller) {
                    console.error('SIGMETs load error:', e);
                    failOverlayRequest('sigmets', e);
                }
            } finally {
                finishLayerRequest('sigmets', controller);
            }
        }

        async function showFrameAwareFrame(idx) {
            const transitionGeneration = ++frameTransitionGeneration;
            const previousFrame = currentFrame;
            const nextLayer = frameLayers[idx];
            currentFrame = idx;
            frameTransitionPending = true;
            diagnosticsState.performance.renderedFrames += 1;
            if (!map.hasLayer(nextLayer)) nextLayer.addTo(map);
            nextLayer.setOpacity(0);
            applyFramePreloadWindow(idx, { preserve: [previousFrame] });

            try {
                const ready = await nextLayer.activateFrame();
                if (transitionGeneration !== frameTransitionGeneration || currentFrame !== idx) return;
                if (!ready) throw new Error('Archived radar frame is unavailable');
                nextLayer.setOpacity(settings.opacity);
                nextLayer.bringToFront?.();
                if (previousFrame !== idx && frameLayers[previousFrame]) {
                    frameLayers[previousFrame].setOpacity(0);
                }
                updateTimestamp();
                updateTimelineFill();
                if (replayMode) await renderReplayAlerts(frames[idx].time * 1000);
                setTimeout(() => {
                    if (currentFrame === idx) applyFramePreloadWindow(idx);
                }, 320);
            } catch (error) {
                if (transitionGeneration !== frameTransitionGeneration) return;
                currentFrame = previousFrame;
                const previousLayer = frameLayers[previousFrame];
                if (previousLayer && !map.hasLayer(previousLayer)) previousLayer.addTo(map);
                previousLayer?.setOpacity(settings.opacity);
                applyFramePreloadWindow(previousFrame);
                updateTimestamp();
                updateTimelineFill();
                showToast(`Radar history frame unavailable: ${safeText(error.message, 100)}`, 'warn', 3500);
            } finally {
                if (transitionGeneration === frameTransitionGeneration) frameTransitionPending = false;
            }
        }

        function waitForOnDemandFrame(layer) {
            if (layer?._stormviewFrameReady) return Promise.resolve(true);
            return new Promise((resolve, reject) => {
                let settled = false;
                const finish = error => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timeoutId);
                    layer?.off?.('load', onLoad);
                    if (error) reject(error);
                    else resolve(true);
                };
                const onLoad = () => finish();
                const timeoutId = setTimeout(
                    () => finish(new Error('GeoMet radar frame timed out')),
                    12000
                );
                layer?.once?.('load', onLoad);
            });
        }

        async function showOnDemandFrame(idx) {
            const transitionGeneration = ++frameTransitionGeneration;
            const previousFrame = currentFrame;
            const nextLayer = frameLayers[idx];
            currentFrame = idx;
            frameTransitionPending = true;
            diagnosticsState.performance.renderedFrames += 1;
            const ready = waitForOnDemandFrame(nextLayer);
            if (!map.hasLayer(nextLayer)) nextLayer.addTo(map);
            nextLayer.setOpacity(0);
            applyFramePreloadWindow(idx, { preserve: [previousFrame] });

            try {
                await ready;
                if (transitionGeneration !== frameTransitionGeneration || currentFrame !== idx) return;
                nextLayer.setOpacity(settings.opacity);
                nextLayer.bringToFront?.();
                if (previousFrame !== idx && frameLayers[previousFrame]) {
                    frameLayers[previousFrame].setOpacity(0);
                }
                updateTimestamp();
                updateTimelineFill();
                setTimeout(() => {
                    if (currentFrame === idx) applyFramePreloadWindow(idx);
                }, 320);
            } catch (error) {
                if (transitionGeneration !== frameTransitionGeneration) return;
                currentFrame = previousFrame;
                const previousLayer = frameLayers[previousFrame];
                if (previousLayer && !map.hasLayer(previousLayer)) previousLayer.addTo(map);
                previousLayer?.setOpacity(settings.opacity);
                applyFramePreloadWindow(previousFrame);
                updateTimestamp();
                updateTimelineFill();
                showToast(`GeoMet frame unavailable: ${safeText(error.message, 100)}`, 'warn', 3500);
            } finally {
                if (transitionGeneration === frameTransitionGeneration) frameTransitionPending = false;
            }
        }

        function showPreloadedFrame(idx) {
            if (!frameLayers.length || idx < 0 || idx >= frameLayers.length) return;
            if (frameLayers[idx]?._stormviewFrameAware) {
                void showFrameAwareFrame(idx);
                return;
            }
            if (frameLayers[idx]?._stormviewOnDemandFrame) {
                void showOnDemandFrame(idx);
                return;
            }
            frameTransitionGeneration += 1;
            frameTransitionPending = false;
            
            const prevFrame = currentFrame;
            currentFrame = idx;
            diagnosticsState.performance.renderedFrames += 1;
            
            // Determine target opacity
            const zoom = map.getZoom();
            const isHighZoom = zoom >= radarSystem.MRMS_PRIMARY_ZOOM && radarSystem.isUS && radarSystem.highZoomMode;
            const frameOpacity = isHighZoom ? settings.opacity * 0.5 : settings.opacity;
            
            // Ensure current frame is on the map
            if (frameLayers[idx] && !map.hasLayer(frameLayers[idx])) {
                frameLayers[idx].addTo(map);
            }
            
            // Get the DOM container for the new frame layer
            const newContainer = frameLayers[idx]?.getContainer?.();
            
            if (newContainer) {
                // Add cross-fade class for smooth CSS transition
                newContainer.classList.add('radar-crossfade');
                // Start at 0, then transition to target opacity
                frameLayers[idx].setOpacity(0);
                // Force reflow so the browser registers the 0 state
                void newContainer.offsetWidth;
                frameLayers[idx].setOpacity(frameOpacity);
            } else {
                // Fallback: use Leaflet's setOpacity directly
                frameLayers[idx]?.setOpacity(frameOpacity);
            }
            
            // Bring new frame to front
            if (isHighZoom && radarSystem.mrmsBase) {
                radarSystem.mrmsBase.bringToFront();
            } else {
                frameLayers[idx]?.bringToFront();
            }
            
            // Fade out the previous frame AFTER the new one starts fading in
            // This creates a brief overlap period where both are partially visible
            if (prevFrame !== idx && frameLayers[prevFrame]) {
                const prevContainer = frameLayers[prevFrame]?.getContainer?.();
                if (prevContainer) {
                    prevContainer.classList.add('radar-crossfade');
                    frameLayers[prevFrame].setOpacity(0);
                } else {
                    frameLayers[prevFrame].setOpacity(0);
                }
            }
            
            if (replayMode) {
                // Archived composites are large single images. Preserve the cross-fade,
                // then release every inactive image instead of retaining the live-radar
                // preload buffer.
                const replayLayers = frameLayers;
                const activeLayer = frameLayers[idx];
                setTimeout(() => {
                    replayLayers.forEach(layer => {
                        if (layer && layer !== activeLayer && map.hasLayer(layer)) {
                            map.removeLayer(layer);
                        }
                    });
                }, 320);
            } else {
                applyFramePreloadWindow(idx, { preserve: [prevFrame] });
                const transitionTarget = idx;
                setTimeout(() => {
                    if (currentFrame === transitionTarget) applyFramePreloadWindow(currentFrame);
                }, 320);
            }
            
            updateTimestamp();
            updateTimelineFill();
            if (replayMode) renderReplayAlerts(frames[idx].time * 1000);
        }

        function clearAllFrameLayers({ dispose = true } = {}) {
            loadAborted = true;
            frameTransitionGeneration += 1;
            frameTransitionPending = false;
            removeComparisonRadarLayer();
            removePipRadarLayer();
            frameLayers.forEach(layer => {
                if (map.hasLayer(layer)) map.removeLayer(layer);
                if (dispose) layer.releaseFrame?.({ dropPreload: true });
                if (dispose) revokeLayerObjectUrl(layer);
            });
            frameLayers = [];
            framesLoaded = 0;
            framesReady = false;
            map.getContainer().dataset.radarHistoryHours = '0';
            level2Couplets = [];
            removeLayer('couplets');
            
            // Clean up hybrid radar layers
            cleanupRadarLayers();
            radarSystem.highZoomMode = false;
        }

        // ==================== ANIMATION ====================
        function updatePreloadWindowControl() {
            const slider = document.getElementById('preloadWindowSlider');
            const value = document.getElementById('preloadWindowValue');
            if (!slider || !value) return;
            const configured = normalizePreloadWindow(settings.preloadWindow);
            const effective = effectivePreloadWindow(configured, settings.reducedData);
            const frameText = t('preloadFrames', { count: effective });
            slider.value = String(configured);
            value.textContent = settings.reducedData && effective !== configured
                ? t('preloadReduced', { count: effective })
                : `±${effective}`;
            slider.setAttribute('aria-valuetext', settings.reducedData && effective !== configured
                ? t('preloadReducedAria', { value: frameText })
                : frameText);
        }

        function play() {
            if (isPlaying || !framesReady || frames.length < 2) return;
            isPlaying = true;
            document.getElementById('playIcon').innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
            lastFrameTime = performance.now();
            applyFramePreloadWindow(currentFrame);
            animationLoop();
        }

        function applyFramePreloadWindow(idx, { preserve = [] } = {}) {
            const radius = effectivePreloadWindow(settings.preloadWindow, settings.reducedData);
            const desired = new Set(frameWindowIndices(
                frameLayers.length,
                idx,
                radius,
                { loop: settings.loop }
            ));
            preserve.forEach(frameIndex => desired.add(frameIndex));

            frameLayers.forEach((layer, frameIndex) => {
                if (!layer) return;
                if (layer._stormviewOnDemandFrame) {
                    const shouldMount = frameIndex === currentFrame || preserve.includes(frameIndex);
                    if (shouldMount && !map.hasLayer(layer)) layer.addTo(map);
                    else if (!shouldMount && map.hasLayer(layer)) map.removeLayer(layer);
                    return;
                }
                if (layer._stormviewFrameAware) {
                    if (desired.has(frameIndex)) layer.preloadFrame?.();
                    const shouldMount = frameIndex === currentFrame || preserve.includes(frameIndex);
                    if (shouldMount && !map.hasLayer(layer)) layer.addTo(map);
                    else if (!shouldMount && map.hasLayer(layer)) map.removeLayer(layer);
                    if (!desired.has(frameIndex)) layer.releaseFrame?.({ dropPreload: true });
                    return;
                }
                if (desired.has(frameIndex)) {
                    if (!map.hasLayer(layer)) layer.addTo(map);
                    if (frameIndex === currentFrame) return;
                    const cont = layer.getContainer?.();
                    if (cont) {
                        cont.classList.remove('radar-crossfade');
                    }
                    layer.setOpacity(0);
                } else if (map.hasLayer(layer)) {
                    map.removeLayer(layer);
                }
            });
            const mapContainer = map.getContainer();
            mapContainer.dataset.preloadWindow = String(radius);
            mapContainer.dataset.preloadedFrames = String(
                frameLayers.filter((layer, frameIndex) => layer && (
                    map.hasLayer(layer)
                    || (desired.has(frameIndex) && Boolean(layer._stormviewFrameBlob))
                )).length
            );
        }

        function animationLoop() {
            if (!isPlaying) return;
            
            const now = performance.now();
            const elapsed = now - lastFrameTime;
            const frameDelay = settings.delay / speedMult;
            
            if (elapsed >= frameDelay && !frameTransitionPending) {
                if (elapsed > frameDelay * 1.5) {
                    diagnosticsState.performance.droppedFrames += Math.max(1, Math.floor(elapsed / frameDelay) - 1);
                }
                lastFrameTime = now;
                
                let next = currentFrame + 1;
                if (next >= frames.length) {
                    if (settings.loop) {
                        next = 0;
                        diagnosticsState.performance.loopCompletedAt = new Date().toISOString();
                    } else {
                        pause();
                        return;
                    }
                }
                showPreloadedFrame(next);
            }
            
            animationId = requestAnimationFrame(animationLoop);
        }

        function pause() {
            isPlaying = false;
            document.getElementById('playIcon').innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
        }

        function togglePlay() {
            isPlaying ? pause() : play();
        }

        function stepFrame(dir) {
            if (!framesReady || frames.length < 2) return;
            pause();
            let next = currentFrame + dir;
            if (next < 0) next = frames.length - 1;
            if (next >= frames.length) next = 0;
            showPreloadedFrame(next);
        }

        function cycleSpeed() {
            const speeds = [0.5, 1, 1.5, 2, 3];
            const idx = speeds.indexOf(speedMult);
            speedMult = speeds[(idx + 1) % speeds.length];
            document.getElementById('speedBtn').textContent = speedMult + 'x';
        }

        // ==================== WEATHER LAYERS ====================
        function disableRadarLayer() {
            radarAbortController?.abort(new DOMException('Radar layer disabled', 'AbortError'));
            radarLoadGeneration += 1;
            clearAllFrameLayers();
            disposeRadarState(retainedRadarState);
            retainedRadarState = null;
        }

        function disposeAlertsLayer() {
            removeLayer('alerts');
            currentAlertFeatures = [];
            renderNonMapAlerts([]);
            updateAlertCount(0);
            updateMobileAlertBanner([]);
            refreshComparisonAlerts();
            refreshPipAlerts();
        }

        function loadAlertsLayer() {
            if (replayMode) renderReplayAlerts(frames[currentFrame].time * 1000);
            else loadAlerts();
        }

        function simpleOverlayAdapter(id, load, dispose = () => removeLayer(id)) {
            return {
                load,
                cancel: () => layerRequests.get(id)?.abort(new DOMException('Provider cancelled', 'AbortError')),
                status: () => diagnosticsState.layerStates[id] || { state: settings.layers[id] ? 'idle' : 'disabled' },
                dispose
            };
        }

        const radarProviderAdapter = load => ({
            load,
            cancel: () => radarAbortController?.abort(new DOMException('Radar provider cancelled', 'AbortError')),
            status: () => diagnosticsState.provider,
            dispose: disableRadarLayer
        });

        const providerRegistry = createProviderRegistry({
            radar: {
                hrrr: radarProviderAdapter(loadHRRR),
                rainviewer: radarProviderAdapter(loadRainViewerPreloaded),
                mrms: radarProviderAdapter(loadMRMS),
                nowcoast: radarProviderAdapter(loadNowCOAST),
                eccc: radarProviderAdapter(loadGeometRadar),
                level2: {
                    ...radarProviderAdapter(loadLevel2),
                    cancel: () => disposeLevel2Worker(new DOMException('Level II provider cancelled', 'AbortError'))
                }
            },
            overlays: {
                radar: simpleOverlayAdapter('radar', loadRadarData, disableRadarLayer),
                couplets: simpleOverlayAdapter('couplets', renderLevel2Couplets),
                alerts: simpleOverlayAdapter('alerts', loadAlertsLayer, disposeAlertsLayer),
                spcOutlook: simpleOverlayAdapter('spcOutlook', loadSPCOutlook),
                stormReports: simpleOverlayAdapter('stormReports', loadStormReports),
                stormTracks: simpleOverlayAdapter('stormTracks', loadStormTracks),
                hailMesh: simpleOverlayAdapter('hailMesh', loadHailMesh),
                lightning: simpleOverlayAdapter('lightning', () => {
                    loadLightning();
                    layerRefs.lightning?.addTo(map);
                }),
                satellite: simpleOverlayAdapter('satellite', () => loadSatelliteLayer('visible')),
                satelliteIR: simpleOverlayAdapter('satelliteIR', () => loadSatelliteLayer('ir')),
                satelliteWV: simpleOverlayAdapter('satelliteWV', () => loadSatelliteLayer('wv')),
                satelliteGeoColor: simpleOverlayAdapter('satelliteGeoColor', () => loadSatelliteLayer('geocolor')),
                satelliteSandwich: simpleOverlayAdapter('satelliteSandwich', () => loadSatelliteLayer('sandwich')),
                satelliteMesoscale: simpleOverlayAdapter('satelliteMesoscale', () => loadSatelliteLayer('mesoscale')),
                riverGauges: simpleOverlayAdapter('riverGauges', loadRiverGauges),
                surfaceObs: simpleOverlayAdapter('surfaceObs', loadSurfaceObs),
                spcWatches: simpleOverlayAdapter('spcWatches', loadSPCWatches),
                spcMCD: simpleOverlayAdapter('spcMCD', loadSPCMCD),
                spcTornado: simpleOverlayAdapter('spcTornado', () => loadSPCProbability('tornado')),
                spcWind: simpleOverlayAdapter('spcWind', () => loadSPCProbability('wind')),
                spcHail: simpleOverlayAdapter('spcHail', () => loadSPCProbability('hail')),
                tropical: simpleOverlayAdapter('tropical', loadTropical),
                sigmets: simpleOverlayAdapter('sigmets', loadSIGMETs),
                temp: simpleOverlayAdapter('temp', () => toggleOWMLayer('temp'), () => toggleOWMLayer('temp')),
                wind: simpleOverlayAdapter('wind', () => toggleOWMLayer('wind'), () => toggleOWMLayer('wind')),
                clouds: simpleOverlayAdapter('clouds', () => toggleOWMLayer('clouds'), () => toggleOWMLayer('clouds')),
                pressure: simpleOverlayAdapter('pressure', () => toggleOWMLayer('pressure'), () => toggleOWMLayer('pressure')),
                states: simpleOverlayAdapter('states', loadStates),
                counties: simpleOverlayAdapter('counties', loadCounties),
                labels: simpleOverlayAdapter('labels', () => toggleLabelsLayer(true), () => toggleLabelsLayer(false)),
                highways: simpleOverlayAdapter('highways', loadHighwayEvents, disposeHighwayEvents),
                geofences: simpleOverlayAdapter('geofences', loadGeofenceLayer)
            },
            cancel: id => layerRequests.get(id)?.abort(new DOMException('Provider cancelled', 'AbortError')),
            status: id => diagnosticsState.layerStates[id] || diagnosticsState.provider
        });

        function handleLayerToggle(name, on, silent = false) {
            settings.layers[name] = on;
            saveSettings();
            syncAccessibleControlStates();
            providerRegistry.setOverlayEnabled(name, on);
        }

        function removeLayer(name) {
            const request = layerRequests.get(name);
            const trackedRequestState = Boolean(request || diagnosticsState.layerStates[name]);
            if (request) {
                request.abort(new DOMException('Layer disabled', 'AbortError'));
                layerRequests.delete(name);
            }
            if (layerRefs[name]) {
                revokeLayerObjectUrl(layerRefs[name]);
                map.removeLayer(layerRefs[name]);
                layerRefs[name].off?.();
                layerRefs[name].clearLayers?.();
                layerRefs[name] = null;
            }
            if (name === 'hailMesh' && meshLegendControl) {
                map.removeControl(meshLegendControl);
                meshLegendControl = null;
                meshMaximumMm = 0;
            }
            if (name === 'alerts' && alertAgeLegendControl) {
                map.removeControl(alertAgeLegendControl);
                alertAgeLegendControl = null;
            }
            if (name === 'stormReports') {
                stormReportPayload = null;
                stormReportRenderGeneration += 1;
                document.querySelectorAll('[data-layer="stormReports"]').forEach(element => {
                    element.dataset.renderedCount = '0';
                    element.dataset.clusterCount = '0';
                });
            }
            setLayerFeatureCount(name, 0);
            if (trackedRequestState) setLayerRequestState(name, 'disabled', `${getLayerName(name)} disabled`);
        }

        function setLayerFeatureCount(name, count) {
            diagnosticsState.layerCounts[name] = Math.max(0, Number(count) || 0);
            document.querySelectorAll(`[data-layer="${name}"]`).forEach(element => {
                element.dataset.featureCount = String(diagnosticsState.layerCounts[name]);
            });
            if (name === 'couplets') {
                document.querySelectorAll('[data-layer="couplets"] .analysis-count').forEach(element => {
                    element.textContent = diagnosticsState.layerCounts[name] || '';
                });
            }
            if (name === 'highways') {
                document.querySelectorAll('[data-layer="highways"] .road-event-count').forEach(element => {
                    element.textContent = diagnosticsState.layerCounts[name] || '';
                });
            }
            renderDiagnostics();
        }

        function getLayerName(key) {
            const names = {
                radar: 'Radar', alerts: 'NWS Alerts', spcOutlook: 'SPC Outlook',
                stormReports: 'Storm Reports', stormTracks: 'NEXRAD Storm Tracks',
                hailMesh: 'MRMS Hail Size', lightning: 'Lightning', satellite: 'Satellite',
                satelliteIR: 'Infrared Sat', satelliteWV: 'Water Vapor',
                satelliteGeoColor: 'NOAA GeoColor', satelliteSandwich: 'IR Sandwich',
                satelliteMesoscale: 'GOES Mesoscale Sectors',
                riverGauges: 'River Gauges', surfaceObs: 'Surface Obs',
                temp: 'Temperature', wind: 'Wind', clouds: 'Clouds', pressure: 'Pressure',
                spcWatches: 'SPC Watches', spcMCD: 'Mesoscale Discussions',
                spcTornado: 'Tornado Prob', spcWind: 'Wind Prob', spcHail: 'Hail Prob',
                tropical: 'Tropical Systems', sigmets: 'SIGMETs / AIRMETs',
                states: 'State Borders', counties: 'County Borders', labels: 'City Labels', highways: 'Iowa Road Events',
                geofences: 'Local Geofences', localOverlay: 'Local Map Overlay'
            };
            return names[key] || key;
        }

        function alertAudioTools() {
            if (!alertAudioToolsPromise) alertAudioToolsPromise = import('./alert-audio.js');
            return alertAudioToolsPromise;
        }

        function historicalReplayTools() {
            if (!historicalReplayToolsPromise) historicalReplayToolsPromise = import('./historical-replay.js');
            return historicalReplayToolsPromise;
        }

        function localDateTimeInputValue(date) {
            const pad = value => String(value).padStart(2, '0');
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
                + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
        }

        function setReplayControlState(status) {
            const statusElement = document.getElementById('replayStatus');
            if (statusElement) statusElement.textContent = status;
            const startButton = document.getElementById('startReplayBtn');
            const exitButton = document.getElementById('exitReplayBtn');
            if (startButton) startButton.disabled = replayMode || status === 'Loading replay…';
            if (exitButton) exitButton.disabled = !replayMode;
        }

        function alertFillTools() {
            if (!alertFillToolsPromise) alertFillToolsPromise = import('./alert-fill.js');
            return alertFillToolsPromise;
        }

        function alertSeriesTools() {
            if (!alertSeriesToolsPromise) alertSeriesToolsPromise = import('./alert-series.js');
            return alertSeriesToolsPromise;
        }

        function renderNonMapAlerts(features) {
            const container = document.getElementById('nonMapAlerts');
            const summary = document.getElementById('nonMapAlertsSummary');
            const list = document.getElementById('nonMapAlertsList');
            if (!container || !summary || !list) return;
            const unresolved = (Array.isArray(features) ? features : [])
                .filter(feature => !['Polygon', 'MultiPolygon'].includes(feature?.geometry?.type));
            list.replaceChildren();
            container.hidden = unresolved.length === 0;
            if (!unresolved.length) {
                container.open = false;
                return;
            }
            summary.textContent = t('nonMapAlerts', { count: unresolved.length });
            unresolved.slice(0, 20).forEach(feature => {
                const item = document.createElement('li');
                const properties = feature.properties || {};
                const event = safeText(properties.event || 'Weather Alert', 120);
                const area = safeText(properties.areaDesc || 'Area unavailable', 180);
                item.textContent = `${event} — ${area}`;
                list.appendChild(item);
            });
            if (unresolved.length > 20) {
                const item = document.createElement('li');
                item.textContent = t('additionalNonMapAlerts', { count: unresolved.length - 20 });
                list.appendChild(item);
            }
        }

        function formatAlertIssueAge(ageMinutes) {
            if (!Number.isFinite(ageMinutes) || ageMinutes < 0) return '';
            if (ageMinutes < 1) return t('alertIssuedJustNow');
            if (ageMinutes < 60) return t('alertIssuedMinutesAgo', { value: ageMinutes });
            return t('alertIssuedHoursAgo', { value: Math.round(ageMinutes / 60) });
        }

        function alertPolygonPresentation(feature, tools, referenceTime) {
            const profile = tools.alertIssuanceProfile(feature, referenceTime);
            const color = tools.alertHazardColor(feature, settings.visualPalette);
            return {
                profile,
                style: {
                    color,
                    weight: profile.lineWeight,
                    fillColor: color,
                    fillOpacity: profile.fillOpacity,
                    dashArray: alertPaletteDash(feature, settings.visualPalette)
                }
            };
        }

        function showAlertAgeLegend(features, tools, referenceTime) {
            if (alertAgeLegendControl) {
                map.removeControl(alertAgeLegendControl);
                alertAgeLegendControl = null;
            }
            const hasWarning = features.some(feature => (
                alertPolygonPresentation(feature, tools, referenceTime).profile.bucket !== 'static'
            ));
            if (!hasWarning) return;

            alertAgeLegendControl = L.control({ position: 'bottomleft' });
            alertAgeLegendControl.onAdd = () => {
                const container = L.DomUtil.create('div', 'alert-age-legend');
                container.setAttribute('role', 'img');
                container.setAttribute('aria-label', `${t('alertAgeTitle')}. ${t('alertAgeNote')}`);
                const title = document.createElement('strong');
                title.textContent = t('alertAgeTitle');
                const gradient = document.createElement('div');
                gradient.className = 'alert-age-gradient';
                const labels = document.createElement('div');
                labels.className = 'alert-age-labels';
                const newer = document.createElement('span');
                newer.textContent = t('alertAgeNew');
                const older = document.createElement('span');
                older.textContent = t('alertAgeOld');
                labels.append(newer, older);
                const note = document.createElement('div');
                note.className = 'alert-age-note';
                note.textContent = t('alertAgeNote');
                container.append(title, gradient, labels, note);
                L.DomEvent.disableClickPropagation(container);
                return container;
            };
            alertAgeLegendControl.addTo(map);
        }

        async function renderReplayAlerts(timestamp) {
            if (!replayMode) return;
            const [tools, alertTools] = await Promise.all([
                historicalReplayTools(),
                alertFillTools()
            ]);
            removeLayer('alerts');
            const activeWarnings = replayWarnings
                .filter(feature => tools.warningActiveAt(feature, timestamp))
                .slice(0, MAX_ALERT_FEATURES);
            currentAlertFeatures = activeWarnings;
            renderNonMapAlerts(activeWarnings);
            updateMobileAlertBanner(settings.layers.alerts ? activeWarnings : []);
            refreshComparisonAlerts();
            refreshPipAlerts();
            if (!settings.layers.alerts) return;
            layerRefs.alerts = L.geoJSON({ type: 'FeatureCollection', features: activeWarnings }, {
                pane: 'alertPane',
                style: feature => alertPolygonPresentation(feature, alertTools, timestamp).style,
                onEachFeature: (feature, layer) => {
                    const properties = feature.properties || {};
                    const event = properties.ps || 'Historical warning';
                    const profile = alertTools.alertIssuanceProfile(feature, timestamp);
                    const issueAge = formatAlertIssueAge(profile.ageMinutes);
                    const tags = [
                        properties.max_windtag ? `${properties.max_windtag} mph wind` : '',
                        properties.max_hailtag ? `${properties.max_hailtag} in hail` : '',
                        properties.max_is_pds ? 'PDS' : '',
                        properties.max_is_emergency ? 'Emergency' : ''
                    ].filter(Boolean).join(' · ');
                    layer.bindPopup(`
                        <div class="popup-content">
                            <h4>${escapeHTML(event, 120)}</h4>
                            <p><strong>WFO:</strong> ${escapeHTML(properties.wfo || 'N/A', 8)}</p>
                            ${tags ? `<p>${escapeHTML(tags, 120)}</p>` : ''}
                            <div class="meta">Issued: ${escapeHTML(formatExternalDate(properties.issue))}${issueAge ? ` · ${escapeHTML(issueAge)}` : ''}<br>Polygon valid to: ${escapeHTML(formatExternalDate(properties.polygon_end || properties.expire_utc))}</div>
                        </div>
                    `);
                }
            }).addTo(map);
            showAlertAgeLegend(activeWarnings, alertTools, timestamp);
            setLayerFeatureCount('alerts', activeWarnings.length);
            updateAlertCount(activeWarnings.length);
        }

        async function loadHistoricalReplayRange(startValue, endValue, { announce = true } = {}) {
            setReplayControlState('Loading replay…');
            replayAbortController?.abort(new DOMException('Replay superseded', 'AbortError'));
            const controller = new AbortController();
            replayAbortController = controller;
            try {
                const tools = await historicalReplayTools();
                const replayFrames = tools.buildReplayFrames(startValue, endValue);
                const start = new Date(replayFrames[0].time * 1000);
                const end = new Date(replayFrames.at(-1).time * 1000);
                const warningUrl = new URL(DATA_URLS.iemStormBasedWarnings);
                warningUrl.searchParams.set('sts', start.toISOString());
                warningUrl.searchParams.set('ets', end.toISOString());
                const response = await fetchWithTimeout(warningUrl.toString(), { signal: controller.signal });
                const warningPayload = await response.json();
                const warnings = featureList(warningPayload, 5000)
                    .filter(feature => ['Polygon', 'MultiPolygon'].includes(feature.geometry?.type));
                if (controller.signal.aborted) return;

                pause();
                radarAbortController?.abort(new DOMException('Historical replay started', 'AbortError'));
                radarLoadGeneration += 1;
                clearAllFrameLayers();
                disposeRadarState(retainedRadarState);
                retainedRadarState = null;
                removeLayer('alerts');
                replayMode = true;
                replayWarnings = warnings;
                frames = replayFrames;
                framesTotal = frames.length;
                framesLoaded = 0;
                framesReady = true;
                currentFrame = 0;
                lastPastFrame = frames.length - 1;
                loadAborted = false;
                frameLayers = frames.map(frame => createFrameAwareImageOverlay(
                    frame.path,
                    [[23, -126], [50, -65]],
                    {
                        opacity: 0,
                        crossOrigin: true,
                        pane: 'radarPane',
                        className: 'radar-layer historical-replay-frame',
                        alt: `Archived IEM NEXRAD composite ${new Date(frame.time * 1000).toISOString()}`
                    }
                ));
                frameLayers[0].addTo(map);
                frameLayers[0].setOpacity(settings.opacity);
                applyFramePreloadWindow(0);
                await renderReplayAlerts(frames[0].time * 1000);
                updatePlaybackVisibility();
                updateTimestamp();
                updateTimelineUI();
                setProviderStatus('current', `IEM replay: ${frames.length} frames`);
                setReplayControlState(`${frames.length} frames · ${warnings.length} warning polygons`);
                if (announce) showToast(`Historical replay loaded: ${frames.length} frames`, 'success', 3500);
                return { ok: true, frameCount: frames.length, warningCount: warnings.length };
            } catch (error) {
                if (error?.name === 'AbortError') return { ok: false, aborted: true };
                console.error('Historical replay error:', error);
                setReplayControlState(`Replay failed: ${safeText(error.message, 120)}`);
                if (announce) showToast(`Replay failed: ${safeText(error.message, 120)}`, 'error', 5000);
                return { ok: false, error: safeText(error.message, 120) };
            } finally {
                if (replayAbortController === controller) replayAbortController = null;
            }
        }

        async function startHistoricalReplay() {
            if (trainingScenario) resetTrainingMode();
            const startInput = document.getElementById('replayStartInput');
            const endInput = document.getElementById('replayEndInput');
            return loadHistoricalReplayRange(startInput.value, endInput.value);
        }

        function exitHistoricalReplay({ restoreTrainingView = true, announce = true } = {}) {
            if (trainingScenario) resetTrainingMode({ restoreView: restoreTrainingView });
            replayAbortController?.abort(new DOMException('Replay exited', 'AbortError'));
            replayAbortController = null;
            pause();
            replayMode = false;
            replayWarnings = [];
            clearAllFrameLayers();
            removeLayer('alerts');
            setReplayControlState(localizedStaticText('Live mode'));
            updatePlaybackVisibility();
            loadRadarData();
            if (settings.layers.alerts) loadAlerts();
            if (announce) showToast('Returned to live data', 'info', 2500);
        }

        async function playAlertTone(urgency = 'standard') {
            try {
                const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
                if (!AudioContextConstructor) return false;
                if (!alertAudioContext) alertAudioContext = new AudioContextConstructor();
                await alertAudioContext.resume();
                if (alertAudioContext.state !== 'running') return false;

                const patterns = {
                    standard: [660],
                    severe: [660, 880],
                    extreme: [880, 988, 1175],
                    test: [660, 880]
                };
                const frequencies = patterns[urgency] || patterns.standard;
                frequencies.forEach((frequency, index) => {
                    const start = alertAudioContext.currentTime + 0.02 + index * 0.2;
                    const oscillator = alertAudioContext.createOscillator();
                    const gain = alertAudioContext.createGain();
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(frequency, start);
                    gain.gain.setValueAtTime(0.0001, start);
                    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
                    oscillator.connect(gain);
                    gain.connect(alertAudioContext.destination);
                    oscillator.start(start);
                    oscillator.stop(start + 0.18);
                });
                alertAudioUnlocked = true;
                return true;
            } catch (error) {
                console.warn('Alert audio unavailable:', error);
                return false;
            }
        }

        async function processAlertAudio(features) {
            currentAlertFeatures = features;
            const tools = await alertAudioTools();
            const identified = features
                .map(feature => ({ feature, id: tools.alertIdentifier(feature) }))
                .filter(item => item.id);

            if (!alertAudioPrimed) {
                identified.forEach(item => seenAlertIds.add(item.id));
                alertAudioPrimed = true;
                return;
            }

            const newFeatures = identified
                .filter(item => !seenAlertIds.has(item.id))
                .map(item => item.feature);
            identified.forEach(item => seenAlertIds.add(item.id));
            if (seenAlertIds.size > 2000) {
                [...seenAlertIds].slice(0, seenAlertIds.size - 1000).forEach(id => seenAlertIds.delete(id));
            }
            if (!settings.alertAudioEnabled || !newFeatures.length) return;

            const center = map.getCenter();
            const alertAreas = settings.alertAudioArea === 'geofences'
                ? geofences.map(geofence => ({
                    point: { latitude: geofence.latitude, longitude: geofence.longitude },
                    distanceMiles: geofence.radiusMiles
                }))
                : [{
                    point: { latitude: center.lat, longitude: center.lng },
                    distanceMiles: settings.alertAudioDistanceMiles
                }];
            const matches = newFeatures.filter(feature => alertAreas.some(area => tools.alertMatchesAudioSettings(
                feature,
                { ...settings, alertAudioDistanceMiles: area.distanceMiles },
                area.point
            )));
            if (!matches.length) return;
            if (!alertAudioUnlocked) {
                showToast(t('alertAudioActivation'), 'warn', 5000);
                return;
            }
            const urgencies = matches.map(tools.alertUrgency);
            const urgency = urgencies.includes('extreme')
                ? 'extreme'
                : urgencies.includes('severe') ? 'severe' : 'standard';
            await playAlertTone(urgency);
            showToast(t('newMatchingAlerts', { count: matches.length }), 'warn', 4000);
        }

        function mobileAlertBannerTools() {
            if (!mobileAlertBannerToolsPromise) {
                mobileAlertBannerToolsPromise = import('./mobile-alert-banner.js');
            }
            return mobileAlertBannerToolsPromise;
        }

        function currentMapBounds() {
            if (!map) return null;
            const bounds = map.getBounds();
            return {
                west: bounds.getWest(),
                east: bounds.getEast(),
                south: bounds.getSouth(),
                north: bounds.getNorth()
            };
        }

        // The first-visit tip sits below the alert banner, whose height depends
        // on how far the event name wraps, so the clearance has to be measured.
        let bannerClearanceObserver = null;

        function publishBannerClearance() {
            const banner = document.getElementById('mobileAlertBanner');
            if (!banner) return;
            // The banner's height depends on how far the event name wraps, and it
            // can reflow after it is shown, so observe it rather than sampling once.
            if (!bannerClearanceObserver && typeof ResizeObserver === 'function') {
                bannerClearanceObserver = new ResizeObserver(() => publishBannerClearance());
                bannerClearanceObserver.observe(banner);
            }
            const clearance = banner.hidden ? 0 : Math.round(banner.getBoundingClientRect().bottom) + 12;
            document.documentElement.style.setProperty(
                '--banner-clearance',
                clearance > 0 ? `${clearance}px` : ''
            );
        }

        async function updateMobileAlertBanner(features = currentAlertFeatures) {
            const banner = document.getElementById('mobileAlertBanner');
            if (!banner || !map) return;
            try {
                const tools = await mobileAlertBannerTools();
                const selection = tools.selectMobileAlert(features, currentMapBounds(), dismissedMobileAlertIds);
                mobileAlertBannerSelection = selection.feature
                    ? { ...selection, feature: selection.feature }
                    : null;
                if (!selection.feature) {
                    banner.hidden = true;
                    publishBannerClearance();
                    return;
                }
                const properties = selection.feature.properties || {};
                const event = safeText(properties.event || properties.ps || 'Weather Alert', 120);
                const headline = safeText(properties.headline || properties.areaDesc || '', 220);
                const severity = safeText(properties.severity || 'unknown', 20).toLowerCase();
                banner.dataset.severity = ['extreme', 'severe', 'moderate', 'minor'].includes(severity)
                    ? severity : 'unknown';
                banner.setAttribute('aria-label', t('activeWeatherAlert'));
                document.getElementById('mobileAlertMeta').textContent = t('alertsInMap', { count: selection.count });
                document.getElementById('mobileAlertTitle').textContent = event;
                document.getElementById('mobileAlertHeadline').textContent = headline;
                document.getElementById('mobileAlertView').textContent = t('viewAlert');
                document.getElementById('mobileAlertDismiss').setAttribute('aria-label', t('dismissAlert'));
                banner.hidden = false;
                publishBannerClearance();
            } catch (error) {
                console.warn('Mobile alert banner unavailable:', error);
                banner.hidden = true;
                publishBannerClearance();
            }
        }

        async function focusMobileAlert() {
            if (!mobileAlertBannerSelection) return;
            const tools = await mobileAlertBannerTools();
            let targetLayer = null;
            layerRefs.alerts?.eachLayer?.(layer => {
                if (tools.alertBannerIdentifier(layer.feature) === mobileAlertBannerSelection.id) {
                    targetLayer = layer;
                }
            });
            if (targetLayer?.getBounds) {
                map.fitBounds(targetLayer.getBounds(), { padding: [28, 28], maxZoom: 9 });
                targetLayer.openPopup?.();
                return;
            }
            const bounds = tools.featureBounds(mobileAlertBannerSelection.feature);
            if (bounds) {
                map.fitBounds([[bounds.south, bounds.west], [bounds.north, bounds.east]], {
                    padding: [28, 28],
                    maxZoom: 9
                });
            }
        }

        async function dismissMobileAlert() {
            if (!mobileAlertBannerSelection) return;
            dismissedMobileAlertIds.add(mobileAlertBannerSelection.id);
            await updateMobileAlertBanner(currentAlertFeatures);
        }

        // NWS Alerts
        async function loadAlerts() {
            removeLayer('alerts');
            currentAlertFeatures = [];
            renderNonMapAlerts([]);
            updateMobileAlertBanner([]);
            refreshComparisonAlerts();
            refreshPipAlerts();
            const controller = beginLayerRequest('alerts');
            try {
                const [resp, tools, seriesTools] = await Promise.all([
                    fetchWithTimeout(DATA_URLS.nwsAlerts, { signal: controller.signal }),
                    alertFillTools(),
                    alertSeriesTools()
                ]);
                const data = await resp.json();
                if (controller.signal.aborted || !settings.layers.alerts) return;
                const referenceTime = Date.now();
                const normalized = seriesTools.normalizeAlertSeries(
                    featureList(data, MAX_ALERT_FEATURES),
                    { now: referenceTime }
                );
                const resolved = await seriesTools.resolveAlertZoneGeometries(normalized, {
                    cache: alertZoneGeometryCache,
                    now: referenceTime,
                    fetchZone: async url => {
                        const zoneResponse = await fetchWithTimeout(url, {
                            signal: controller.signal,
                            headers: { Accept: 'application/geo+json' }
                        });
                        return zoneResponse.json();
                    }
                });
                if (controller.signal.aborted || layerRequests.get('alerts') !== controller || !settings.layers.alerts) return;
                const features = resolved.features;

                layerRefs.alerts = L.geoJSON(features, {
                    pane: 'alertPane',
                    style: feature => alertPolygonPresentation(feature, tools, referenceTime).style,
                    onEachFeature: (f, layer) => {
                        const p = f.properties || {};
                        const evt = safeText(p.event || 'Alert', 120);
                        const headline = escapeHTML(p.headline || '', 300);
                        const desc = escapeHTML(p.description || '', 300);
                        const expires = escapeHTML(formatExternalDate(p.expires, 'N/A'));
                        const profile = tools.alertIssuanceProfile(f, referenceTime);
                        const issued = profile.issuedAt === null
                            ? 'N/A'
                            : escapeHTML(formatExternalDate(profile.issuedAt, 'N/A'));
                        const issueAge = formatAlertIssueAge(profile.ageMinutes);
                        let badgeClass = 'info';
                        if (evt.toLowerCase().includes('warning')) badgeClass = 'danger';
                        else if (evt.toLowerCase().includes('watch')) badgeClass = 'warning';
                        
                        layer.bindPopup(`
                            <div class="popup-content">
                                <h4><span class="badge ${badgeClass}">${escapeHTML(evt, 120)}</span></h4>
                                <p><strong>${headline}</strong></p>
                                <p>${desc}${desc.length >= 300 ? '...' : ''}</p>
                                <div class="meta">Issued: ${issued}${issueAge ? ` · ${escapeHTML(issueAge)}` : ''}<br>Expires: ${expires}</div>
                            </div>
                        `, { maxWidth: 300 });
                    }
                });

                if (settings.layers.alerts) layerRefs.alerts.addTo(map);
                showAlertAgeLegend(features, tools, referenceTime);
                setLayerFeatureCount('alerts', features.length);
                updateAlertCount(features.length);
                renderNonMapAlerts(features);
                updateMobileAlertBanner(features);
                await processAlertAudio(features);
                refreshComparisonAlerts();
                refreshPipAlerts();
            } catch(e) {
                if (e?.name === 'AbortError') return;
                console.error('Alerts error:', e);
            } finally {
                finishLayerRequest('alerts', controller);
            }
        }

        // SPC Outlook
        async function loadSPCOutlook() {
            try {
                const resp = await fetchWithTimeout(DATA_URLS.spcOutlookDay1);
                const data = await resp.json();

                removeLayer('spcOutlook');

                // Filter out features with empty geometries
                const validFeatures = featureList(data).filter(f => {
                    const geom = f.geometry || {};
                    if (geom.type === 'GeometryCollection') return (geom.geometries || []).length > 0;
                    return geom.coordinates && geom.coordinates.length > 0;
                });

                if (validFeatures.length === 0) return;

                const riskColors = {
                    'TSTM': '#c0e8c0', 'MRGL': '#66a366', 'SLGT': '#ffe066',
                    'ENH': '#ffa500', 'MDT': '#ff0000', 'HIGH': '#ff00ff'
                };
                const riskNames = {
                    'TSTM': 'Thunderstorm', 'MRGL': 'Marginal', 'SLGT': 'Slight',
                    'ENH': 'Enhanced', 'MDT': 'Moderate', 'HIGH': 'High'
                };

                layerRefs.spcOutlook = L.geoJSON({ type: 'FeatureCollection', features: validFeatures }, {
                    pane: 'alertPane',
                    style: (f) => {
                        const label = f.properties?.LABEL || f.properties?.label || '';
                        return {
                            color: riskColors[label] || '#999',
                            weight: 2,
                            fillColor: riskColors[label] || '#999',
                            fillOpacity: 0.25
                        };
                    },
                    onEachFeature: (f, layer) => {
                        const label = f.properties?.LABEL || f.properties?.label || '';
                        layer.bindPopup(`
                            <div class="popup-content">
                                <h4>Day 1 Convective Outlook</h4>
                                <p style="color:${riskColors[label] || '#fff'};font-weight:600;">${escapeHTML(riskNames[label] || label, 40)} Risk</p>
                                <div class="meta">Storm Prediction Center</div>
                            </div>
                        `);
                    }
                });

                if (settings.layers.spcOutlook) layerRefs.spcOutlook.addTo(map);
            } catch(e) {
                console.error('SPC Outlook error:', e);
            }
        }

        // Storm Reports (IEM)
        function stormReportClusterTools() {
            if (!stormReportClusterToolsPromise) {
                stormReportClusterToolsPromise = import('./storm-report-clusters.js');
            }
            return stormReportClusterToolsPromise;
        }

        function stormReportFeaturesInView(payload) {
            const bounds = map.getBounds();
            return featureList(payload, 5000)
                .filter(feature => {
                    if (feature.geometry?.type !== 'Point' || !Array.isArray(feature.geometry.coordinates)) return false;
                    const longitude = Number(feature.geometry.coordinates[0]);
                    const latitude = Number(feature.geometry.coordinates[1]);
                    return Number.isFinite(latitude)
                        && Number.isFinite(longitude)
                        && bounds.contains([latitude, longitude]);
                })
                .sort((left, right) => (
                    new Date(right.properties?.valid || 0).getTime()
                    - new Date(left.properties?.valid || 0).getTime()
                ))
                .slice(0, 1000);
        }

        function stormReportColor(type) {
            const colors = {
                'TORNADO': '#ff0000',
                'HAIL': '#00cc66',
                'TSTM WND DMG': '#0099ff',
                'TSTM WND GST': '#0099ff',
                'FLASH FLOOD': '#00aa00',
                'FUNNEL CLOUD': '#ff6600'
            };
            return colors[type] || '#ff6600';
        }

        function bindStormReportPopup(feature, layer) {
            const properties = feature.properties || {};
            layer.bindPopup(`
                <div class="popup-content">
                    <h4>${escapeHTML(properties.typetext || 'Report', 80)}</h4>
                    <p><strong>${escapeHTML(properties.city || '', 80)}, ${escapeHTML(properties.state || '', 40)}</strong></p>
                    ${properties.magnitude ? `<p>Magnitude: ${escapeHTML(properties.magnitude, 30)}</p>` : ''}
                    <p>${escapeHTML(properties.remark || '', 500)}</p>
                    <div class="meta">${escapeHTML(properties.valid || '', 80)}</div>
                </div>
            `);
        }

        async function renderStormReports() {
            if (!settings.layers.stormReports || !stormReportPayload) return;
            const generation = ++stormReportRenderGeneration;
            const tools = await stormReportClusterTools();
            if (generation !== stormReportRenderGeneration || !settings.layers.stormReports) return;
            const reports = stormReportFeaturesInView(stormReportPayload);
            const rendered = tools.clusterStormReports(reports, map.getZoom(), {
                individualZoom: 9,
                gridSize: 72,
                maxReports: 1000
            });
            const group = L.layerGroup();
            let clusterCount = 0;

            for (const item of rendered) {
                if (item.kind === 'cluster') {
                    clusterCount += 1;
                    const typeCounts = tools.stormReportTypeCounts(item.features);
                    const dominantType = typeCounts[0]?.[0] || 'Report';
                    const summary = typeCounts.slice(0, 4)
                        .map(([type, count]) => `${type}: ${count}`)
                        .join(' · ');
                    const diameter = Math.max(32, Math.min(52, 28 + Math.sqrt(item.count) * 3));
                    const marker = L.marker([item.latitude, item.longitude], {
                        pane: 'markerPane',
                        keyboard: true,
                        icon: L.divIcon({
                            className: 'storm-report-cluster-icon',
                            html: `<span style="--cluster-color:${stormReportColor(dominantType)}">${item.count > 999 ? '999+' : item.count}</span>`,
                            iconSize: [diameter, diameter],
                            iconAnchor: [diameter / 2, diameter / 2]
                        })
                    });
                    const label = `${item.count} storm reports. ${summary}. Zoom in for individual reports.`;
                    marker.bindTooltip(escapeHTML(label, 300), { direction: 'top' });
                    marker.on('add', () => {
                        const element = marker.getElement();
                        if (element) {
                            element.setAttribute('aria-label', label);
                            element.setAttribute('role', 'button');
                        }
                    });
                    marker.on('click', () => {
                        map.flyTo(
                            [item.latitude, item.longitude],
                            Math.min(9, map.getZoom() + 2),
                            { animate: !matchMedia('(prefers-reduced-motion: reduce)').matches }
                        );
                    });
                    group.addLayer(marker);
                    continue;
                }

                const feature = item.features[0];
                const type = safeText(feature.properties?.typetext, 80);
                const marker = L.circleMarker([item.latitude, item.longitude], {
                    pane: 'markerPane',
                    radius: type === 'TORNADO' ? 8 : 6,
                    fillColor: stormReportColor(type),
                    color: '#fff',
                    weight: 2,
                    fillOpacity: 0.9
                });
                marker.bindTooltip(escapeHTML(type || 'Storm report', 80), { direction: 'top' });
                bindStormReportPopup(feature, marker);
                group.addLayer(marker);
            }

            if (generation !== stormReportRenderGeneration || !settings.layers.stormReports) {
                group.clearLayers();
                return;
            }
            if (layerRefs.stormReports) {
                map.removeLayer(layerRefs.stormReports);
                layerRefs.stormReports.off?.();
                layerRefs.stormReports.clearLayers?.();
            }
            layerRefs.stormReports = group.addTo(map);
            setLayerFeatureCount('stormReports', reports.length);
            document.querySelectorAll('[data-layer="stormReports"]').forEach(element => {
                element.dataset.renderedCount = String(rendered.length);
                element.dataset.clusterCount = String(clusterCount);
            });
        }

        async function loadStormReports() {
            removeLayer('stormReports');
            const controller = beginLayerRequest('stormReports');
            try {
                const resp = await fetchWithTimeout(DATA_URLS.iemLSR, { signal: controller.signal });
                const data = await resp.json();
                if (controller.signal.aborted || !settings.layers.stormReports) return;
                stormReportPayload = data;
                await renderStormReports();
            } catch(e) {
                if (e?.name === 'AbortError') return;
                console.error('Storm reports error:', e);
            } finally {
                finishLayerRequest('stormReports', controller);
            }
        }

        function stormTrackTools() {
            if (!stormTrackToolsPromise) stormTrackToolsPromise = import('./storm-tracks.js');
            return stormTrackToolsPromise;
        }

        function stormTop3dTools() {
            if (!stormTop3dToolsPromise) stormTop3dToolsPromise = import('./storm-top-3d.js');
            return stormTop3dToolsPromise;
        }

        function loadCesiumRuntime() {
            if (window.Cesium) return Promise.resolve(window.Cesium);
            if (cesiumRuntimePromise) return cesiumRuntimePromise;
            window.CESIUM_BASE_URL = new URL('vendor/cesium/', document.baseURI).href;
            cesiumRuntimePromise = import('../vendor/cesium/engine.js').then(Cesium => {
                window.Cesium = Cesium;
                return Cesium;
            }).catch(error => {
                cesiumRuntimePromise = null;
                throw error;
            });
            return cesiumRuntimePromise;
        }

        async function fetchStormAttributes(signal, valid = null) {
            const url = new URL(DATA_URLS.iemStormAttributes);
            if (valid) url.searchParams.set('valid', valid);
            const response = await fetchWithTimeout(url.toString(), { signal });
            return response.json();
        }

        function stormCellsInView(payload, tools) {
            const bounds = map.getBounds();
            const center = map.getCenter();
            const maxItems = Math.min(MAX_POINT_FEATURES, Math.max(100, (map.getZoom() - 3) * 100));
            return featureList(payload, 3000)
                .map(tools.normalizeStormFeature)
                .filter(cell => cell && bounds.contains([cell.latitude, cell.longitude]))
                .sort((left, right) => {
                    const threatDifference = tools.stormThreatScore(right) - tools.stormThreatScore(left);
                    if (threatDifference) return threatDifference;
                    const leftDistance = Math.hypot(left.latitude - center.lat, left.longitude - center.lng);
                    const rightDistance = Math.hypot(right.latitude - center.lat, right.longitude - center.lng);
                    return leftDistance - rightDistance;
                })
                .slice(0, maxItems);
        }

        function stormMotionLabel(cell) {
            if (settings.units === 'metric') {
                return `${Math.round(cell.speedKnots * 1.852)} km/h at ${Math.round(cell.direction)}°`;
            }
            return `${Math.round(cell.speedKnots * 1.15078)} mph at ${Math.round(cell.direction)}°`;
        }

        function stormTopLabel(cell) {
            if (settings.units === 'metric') return `${(cell.topKft * 0.3048).toFixed(1)} km`;
            return `${cell.topKft.toFixed(1)} kft`;
        }

        function stormHailLabel(cell) {
            if (settings.units === 'metric') return `${Math.round(cell.maxHailInches * 25.4)} mm`;
            return `${cell.maxHailInches.toFixed(1)} in`;
        }

        function renderStormTracks(cells, tools) {
            removeLayer('stormTracks');
            const group = L.layerGroup();
            const renderer = L.svg({ padding: 0.5 });
            group.addLayer(renderer);
            for (const cell of cells) {
                const color = tools.stormTrackColor(cell, settings.visualPalette);
                const history = stormTrackHistory.get(tools.stormCellKey(cell)) || [];
                if (history.length > 1) {
                    group.addLayer(L.polyline(
                        history.map(point => [point.latitude, point.longitude]),
                        {
                            className: 'storm-track-history',
                            color,
                            weight: 3,
                            opacity: 0.8,
                            dashArray: '2 5',
                            renderer
                        }
                    ));
                }

                if (cell.speedKnots > 0) {
                    const projected30 = tools.projectStormCell(cell, 30);
                    const projected60 = tools.projectStormCell(cell, 60);
                    group.addLayer(L.polyline([
                        [cell.latitude, cell.longitude],
                        [projected30.latitude, projected30.longitude],
                        [projected60.latitude, projected60.longitude]
                    ], {
                        className: 'storm-track-projection',
                        color,
                        weight: 2,
                        opacity: 0.75,
                        dashArray: '8 7',
                        renderer
                    }));
                    for (const [minutes, projected] of [[30, projected30], [60, projected60]]) {
                        group.addLayer(L.circleMarker([projected.latitude, projected.longitude], {
                            className: 'storm-track-forecast-point',
                            radius: 3,
                            color,
                            weight: 1,
                            fillColor: color,
                            fillOpacity: 0.65,
                            renderer
                        }).bindTooltip(`+${minutes}m`, { direction: 'top' }));
                    }
                }

                const hasTvs = cell.tvs && cell.tvs !== 'NONE';
                const hasMeso = cell.meso && cell.meso !== 'NONE' && cell.meso !== '0';
                const marker = L.circleMarker([cell.latitude, cell.longitude], {
                    className: 'storm-cell-marker',
                    radius: Math.max(5, Math.min(10, 5 + Math.max(0, cell.maxDbz - 40) / 8)),
                    color: '#ffffff',
                    weight: 2,
                    fillColor: color,
                    fillOpacity: 0.9,
                    renderer
                });
                marker.bindTooltip(`${escapeHTML(cell.radar, 4)}-${escapeHTML(cell.id, 8)}`, { direction: 'top' });
                marker.bindPopup(`
                    <div class="popup-content">
                        <h4>Storm ${escapeHTML(cell.radar, 4)}-${escapeHTML(cell.id, 8)}</h4>
                        ${hasTvs ? '<p><strong>TVS</strong></p>' : ''}
                        ${hasMeso ? `<p><strong>Mesocyclone:</strong> ${escapeHTML(cell.meso, 16)}</p>` : ''}
                        <p><strong>Max:</strong> ${Math.round(cell.maxDbz)} dBZ · <strong>Top:</strong> ${stormTopLabel(cell)}</p>
                        <p><strong>${t('hailSize')}:</strong> ${stormHailLabel(cell)} · <strong>POSH:</strong> ${Math.round(cell.posh)}%</p>
                        <p><strong>${t('stormMotion')}:</strong> ${escapeHTML(stormMotionLabel(cell), 40)}</p>
                        <p><strong>${t('stormHistory')}:</strong> ${history.length} · <strong>${t('stormProjection')}:</strong> 30/60 min</p>
                        <div class="meta">${escapeHTML(formatExternalDate(cell.valid))}<br>${escapeHTML(t('stormTrackCaution'), 160)}</div>
                    </div>
                `);
                group.addLayer(marker);
            }
            layerRefs.stormTracks = group.addTo(map);
            setLayerFeatureCount('stormTracks', cells.length);
        }

        async function renderStormTop3d() {
            if (!stormTop3dMode || !cesiumViewer) return [];
            const Cesium = window.Cesium;
            const tools = await stormTop3dTools();
            const columns = tools.buildStormTopColumns(currentStormCells, 200, settings.visualPalette);
            const displayScale = tools.stormTopDisplayScale(map.getZoom());
            const radiusScale = Math.min(4, Math.sqrt(displayScale));
            cesiumViewer.entities.removeAll();
            for (const [index, column] of columns.entries()) {
                const color = Cesium.Color.fromCssColorString(column.color);
                const topLabel = settings.units === 'metric'
                    ? `${(column.heightMeters / 1000).toFixed(1)} km`
                    : `${column.topKft.toFixed(1)} kft`;
                const displayHeight = column.heightMeters * displayScale;
                cesiumViewer.entities.add({
                    id: `storm-top-${column.id}`,
                    name: `Storm ${column.id}`,
                    position: Cesium.Cartesian3.fromDegrees(
                        column.longitude,
                        column.latitude,
                        displayHeight / 2
                    ),
                    cylinder: {
                        length: displayHeight,
                        topRadius: column.radiusMeters * radiusScale * 0.55,
                        bottomRadius: column.radiusMeters * radiusScale,
                        material: color.withAlpha(0.68),
                        outline: true,
                        outlineColor: color.brighten(0.35, new Cesium.Color()),
                        numberOfVerticalLines: 8
                    },
                    label: {
                        show: index < 16,
                        text: `${column.id}\n${topLabel}`,
                        font: '600 13px sans-serif',
                        fillColor: Cesium.Color.WHITE,
                        outlineColor: Cesium.Color.BLACK,
                        outlineWidth: 3,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        showBackground: true,
                        backgroundColor: Cesium.Color.BLACK.withAlpha(0.65),
                        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                        pixelOffset: new Cesium.Cartesian2(0, -8),
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3000000),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY
                    },
                    properties: {
                        echoTopKft: column.topKft,
                        maximumDbz: column.maxDbz,
                        probabilityOfSevereHail: column.posh
                    }
                });
            }
            const view = document.getElementById('cesiumView');
            view.dataset.entityCount = String(columns.length);
            view.dataset.heightScale = String(displayScale);
            document.getElementById('storm3dStatus').textContent = columns.length
                ? t('stormTopsCount', { count: columns.length })
                : t('stormTopsEmpty');
            document.getElementById('storm3dScale').textContent = t('stormTopsScale', { value: displayScale });
            cesiumViewer.scene.requestRender();
            return columns;
        }

        async function loadStormCellsFor3d(force = false) {
            if (!force && currentStormCells.length) return currentStormCells;
            const controller = new AbortController();
            const tools = await stormTrackTools();
            const payload = await fetchStormAttributes(controller.signal);
            currentStormCells = stormCellsInView(payload, tools);
            return currentStormCells;
        }

        async function enterStormTop3d() {
            if (chasecasterActive) stopChasecaster();
            const button = document.getElementById('stormTop3dBtn');
            const view = document.getElementById('cesiumView');
            if (settings.splitView) setSplitView(false);
            if (settings.pipRadar) setPipRadar(false);
            button.disabled = true;
            view.hidden = false;
            view.setAttribute('aria-hidden', 'false');
            document.body.classList.add('storm-3d-mode');
            document.getElementById('storm3dStatus').textContent = t('stormTopsLoading');
            try {
                const [Cesium] = await Promise.all([loadCesiumRuntime(), loadStormCellsFor3d(true)]);
                if (!cesiumViewer) {
                    cesiumViewer = new Cesium.CesiumWidget('cesiumContainer', {
                        baseLayer: false,
                        terrainProvider: new Cesium.EllipsoidTerrainProvider(),
                        requestRenderMode: true
                    });
                    const naturalEarth = await Cesium.TileMapServiceImageryProvider.fromUrl(
                        'vendor/cesium/Assets/Textures/NaturalEarthII'
                    );
                    cesiumViewer.imageryLayers.addImageryProvider(naturalEarth);
                    cesiumViewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#050b14');
                    cesiumViewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#07111f');
                    cesiumViewer.scene.screenSpaceCameraController.minimumZoomDistance = 50000;
                }
                stormTop3dMode = true;
                button.classList.add('active');
                button.setAttribute('aria-pressed', 'true');
                await renderStormTop3d();
                const center = map.getCenter();
                const altitude = Math.max(180000, Math.min(8000000, 60000000 / (2 ** map.getZoom())));
                cesiumViewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(center.lng, center.lat, altitude),
                    orientation: {
                        heading: 0,
                        pitch: Cesium.Math.toRadians(-48),
                        roll: 0
                    },
                    duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 0.8
                });
            } catch (error) {
                console.error('3D storm-top error:', error);
                exitStormTop3d();
                showToast(t('stormTopsUnavailable'), 'error', 4500);
            } finally {
                button.disabled = false;
            }
        }

        function exitStormTop3d() {
            stormTop3dMode = false;
            const button = document.getElementById('stormTop3dBtn');
            button.classList.remove('active');
            button.setAttribute('aria-pressed', 'false');
            document.body.classList.remove('storm-3d-mode');
            const view = document.getElementById('cesiumView');
            view.hidden = true;
            view.setAttribute('aria-hidden', 'true');
            view.dataset.entityCount = '0';
            if (cesiumViewer && !cesiumViewer.isDestroyed()) cesiumViewer.destroy();
            cesiumViewer = null;
            document.getElementById('cesiumContainer').replaceChildren();
        }

        function toggleStormTop3d() {
            if (stormTop3dMode) exitStormTop3d();
            else enterStormTop3d();
        }

        async function loadStormTracks() {
            removeLayer('stormTracks');
            const controller = beginLayerRequest('stormTracks');
            try {
                const tools = await stormTrackTools();
                const currentPayload = await fetchStormAttributes(controller.signal);
                if (controller.signal.aborted || !settings.layers.stormTracks) return;
                const cells = stormCellsInView(currentPayload, tools);
                currentStormCells = cells;
                const latestCellTime = cells.reduce((latest, cell) => Math.max(latest, cell.valid), 0);
                const referenceTime = latestCellTime || Date.now();

                if (!stormTrackHistoryHydrated && cells.length) {
                    const currentKeys = new Set(cells.map(tools.stormCellKey));
                    const baseTime = Number.isFinite(new Date(currentPayload.generated_at).getTime())
                        ? new Date(currentPayload.generated_at).getTime()
                        : referenceTime;
                    const snapshots = await Promise.all([45, 30, 15].map(async minutes => {
                        const valid = new Date(baseTime - minutes * 60 * 1000).toISOString();
                        try {
                            return await fetchStormAttributes(controller.signal, valid);
                        } catch (error) {
                            if (error?.name === 'AbortError') throw error;
                            console.warn(`Storm history snapshot ${minutes}m unavailable:`, error);
                            return null;
                        }
                    }));
                    for (const snapshot of snapshots) {
                        const historicalCells = featureList(snapshot, 3000)
                            .map(tools.normalizeStormFeature)
                            .filter(cell => cell && currentKeys.has(tools.stormCellKey(cell)));
                        tools.mergeStormHistory(stormTrackHistory, historicalCells, referenceTime);
                    }
                    stormTrackHistoryHydrated = true;
                }

                tools.mergeStormHistory(stormTrackHistory, cells, referenceTime);
                if (controller.signal.aborted || !settings.layers.stormTracks) return;
                renderStormTracks(cells, tools);
                if (stormTop3dMode) renderStormTop3d();
            } catch (error) {
                if (error?.name === 'AbortError') return;
                console.error('Storm tracks error:', error);
                setLayerFeatureCount('stormTracks', 0);
                showToast('Storm tracks are temporarily unavailable', 'error');
            } finally {
                finishLayerRequest('stormTracks', controller);
            }
        }

        // Lightning (IEM proxy)
        async function loadLightning() {
            try {
                removeLayer('lightning');
                
                layerRefs.lightning = L.tileLayer.cached('https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/q2-ltg/{z}/{x}/{y}.png', {
                    opacity: 0.8,
                    className: 'lightning-layer',
                    pane: 'radarPane',
                    maxNativeZoom: 8,
                    maxZoom: 18,
                    keepBuffer: 2,
                    updateWhenZooming: false,
                    updateWhenIdle: true,
                    attribution: IEM_ATTRIBUTION
                });

                if (settings.layers.lightning) layerRefs.lightning.addTo(map);
                setLayerFeatureCount('lightning', settings.layers.lightning ? 1 : 0);
            } catch(e) {
                console.error('Lightning error:', e);
            }
        }

        // Satellite (IEM GOES)
        function loadSatellite() {
            removeLayer('satellite');
            
            layerRefs.satellite = L.tileLayer.cached('https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes_east_conus_ch13/{z}/{x}/{y}.png', {
                opacity: 0.7,
                pane: 'satellitePane',
                maxNativeZoom: 8,
                maxZoom: 18,
                keepBuffer: 2,
                updateWhenZooming: false,
                updateWhenIdle: true,
                attribution: IEM_ATTRIBUTION
            });

            if (settings.layers.satellite) layerRefs.satellite.addTo(map);
        }

        // River Gauges (USGS)
        async function loadRiverGauges() {
            removeLayer('riverGauges');
            const controller = beginLayerRequest('riverGauges');
            try {
                const params = new URLSearchParams({
                    format: 'json',
                    bBox: conusViewportBbox(),
                    parameterCd: '00065',
                    siteStatus: 'active',
                    siteType: 'ST'
                });
                const resp = await fetchWithTimeout(`https://waterservices.usgs.gov/nwis/iv/?${params}`, { signal: controller.signal });
                const data = await resp.json();
                if (controller.signal.aborted || !settings.layers.riverGauges) return;
                layerRefs.riverGauges = L.layerGroup();
                
                const bounds = map.getBounds();
                const occupiedCells = new Set();
                const cellSize = Math.max(0.1, 8 / Math.max(map.getZoom(), 1));
                const sites = Array.isArray(data.value?.timeSeries) ? data.value.timeSeries : [];
                const limitedSites = sites.flatMap(site => {
                    const geo = site?.sourceInfo?.geoLocation?.geogLocation;
                    const lat = Number(geo?.latitude);
                    const lon = Number(geo?.longitude);
                    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !bounds.contains([lat, lon])) return [];
                    const cell = `${Math.floor(lat / cellSize)}:${Math.floor(lon / cellSize)}`;
                    if (occupiedCells.has(cell)) return [];
                    occupiedCells.add(cell);
                    return [site];
                }).slice(0, MAX_RIVER_GAUGES);
                
                limitedSites.forEach(site => {
                    try {
                        const geo = site.sourceInfo?.geoLocation?.geogLocation;
                        if (!geo) return;
                        
                        const lat = geo.latitude;
                        const lon = geo.longitude;
                        const name = site.sourceInfo?.siteName || 'Unknown';
                        const value = site.values?.[0]?.value?.[0]?.value || 'N/A';
                        
                        const marker = L.circleMarker([lat, lon], {
                            radius: 5,
                            fillColor: '#00ff88',
                            color: '#fff',
                            weight: 1,
                            fillOpacity: 0.8,
                            pane: 'markerPane'
                        });
                        
                        marker.bindPopup(`
                            <div class="popup-content">
                                <h4>River Gauge</h4>
                                <p><strong>${escapeHTML(name, 160)}</strong></p>
                                <p>Stage: ${escapeHTML(formatRiverStage(value), 30)}</p>
                                <div class="meta">USGS Water Services</div>
                            </div>
                        `);
                        
                        marker.addTo(layerRefs.riverGauges);
                    } catch(e) {}
                });

                if (settings.layers.riverGauges) layerRefs.riverGauges.addTo(map);
                setLayerFeatureCount('riverGauges', limitedSites.length);
            } catch(e) {
                if (e?.name === 'AbortError') return;
                console.error('River gauges error:', e);
            } finally {
                finishLayerRequest('riverGauges', controller);
            }
        }

        // Surface Observations (IEM)
        async function loadSurfaceObs() {
            removeLayer('surfaceObs');
            const controller = beginLayerRequest('surfaceObs');
            try {
                const resp = await fetchWithTimeout('https://mesonet.agron.iastate.edu/api/1/currents.geojson?network=AWOS', { signal: controller.signal });
                const data = await resp.json();
                if (controller.signal.aborted || !settings.layers.surfaceObs) return;
                const observations = pointFeaturesInView(data);
                layerRefs.surfaceObs = L.geoJSON({ type: 'FeatureCollection', features: observations }, {
                    pane: 'markerPane',
                    pointToLayer: (f, latlng) => {
                        return L.circleMarker(latlng, {
                            radius: 5,
                            fillColor: '#ff69b4',
                            color: '#fff',
                            weight: 1,
                            fillOpacity: 0.8
                        });
                    },
                    onEachFeature: (f, layer) => {
                        const p = f.properties || {};
                        layer.bindPopup(`
                            <div class="popup-content">
                                <h4>${escapeHTML(p.station || 'Station', 40)}</h4>
                                <p><strong>${escapeHTML(p.name || '', 160)}</strong></p>
                                <p>Temp: ${formatObservationTemperature(p.tmpf)}</p>
                                <p>Wind: ${Number.isFinite(Number(p.sknt)) ? `${Number(p.sknt).toFixed(0)} kt` : 'N/A'} ${Number.isFinite(Number(p.drct)) ? `from ${Number(p.drct).toFixed(0)}°` : ''}</p>
                                <p>Dewpoint: ${formatObservationTemperature(p.dwpf)}</p>
                                <div class="meta">Updated: ${escapeHTML(p.local_valid || 'N/A', 80)}</div>
                            </div>
                        `);
                    }
                });

                if (settings.layers.surfaceObs) layerRefs.surfaceObs.addTo(map);
                setLayerFeatureCount('surfaceObs', observations.length);
            } catch(e) {
                if (e?.name === 'AbortError') return;
                console.error('Surface obs error:', e);
            } finally {
                finishLayerRequest('surfaceObs', controller);
            }
        }

        // OWM Layers
        let validatedOWMKey = '';

        async function validateOWMKey(key, signal) {
            if (validatedOWMKey === key) return;
            const center = map.getCenter();
            const params = new URLSearchParams({
                lat: center.lat.toFixed(4),
                lon: center.lng.toFixed(4),
                appid: key
            });
            await fetchWithTimeout(`https://api.openweathermap.org/data/2.5/weather?${params}`, { signal });
            validatedOWMKey = key;
        }

        async function toggleOWMLayer(name) {
            if (!settings.owmKey && settings.layers[name]) {
                showToast(t('owmKeyRequired'), 'warn', 5000);
                settings.layers[name] = false;
                saveSettings();
                syncAccessibleControlStates();
                setLayerRequestState(name, 'failed', 'OpenWeatherMap API key required');
                return;
            }

            const layerTypes = {
                temp: 'temp_new',
                wind: 'wind_new',
                clouds: 'clouds_new',
                pressure: 'pressure_new'
            };
            
            removeLayer(name);
            if (settings.layers[name]) {
                const controller = beginLayerRequest(name, true);
                const requestedKey = settings.owmKey;
                try {
                    await validateOWMKey(requestedKey, controller.signal);
                } catch (error) {
                    if (error?.name === 'AbortError') return;
                    const credentialFailure = /\bHTTP (?:401|403)\b/.test(error?.message || '');
                    settings.layers[name] = false;
                    saveSettings();
                    syncAccessibleControlStates();
                    const message = credentialFailure ? t('owmKeyRejected') : t('owmValidationFailed');
                    setLayerRequestState(name, 'failed', message, !credentialFailure);
                    showToast(message, credentialFailure ? 'error' : 'warn', 7000);
                    return;
                } finally {
                    finishLayerRequest(name, controller);
                }
                if (!settings.layers[name] || settings.owmKey !== requestedKey) return;
                const url = `https://tile.openweathermap.org/map/${layerTypes[name]}/{z}/{x}/{y}.png?appid=${requestedKey}`;
                layerRefs[name] = L.tileLayer.cached(url, {
                    opacity: 0.5, 
                    zIndex: 45,
                    maxNativeZoom: 12,
                    maxZoom: 19,
                    attribution: '&copy; <a href="https://openweathermap.org/">OpenWeather</a>',
                    errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
                });
                layerRefs[name].addTo(map);
                setLayerRequestState(name, 'current', `${getLayerName(name)} loaded from OpenWeatherMap`);
            }
        }

        // Boundary Layers
        async function loadStates() {
            try {
                if (!dataCache.statesGeo) {
                    const resp = await fetchWithTimeout(DATA_URLS.states);
                    const topology = await resp.json();
                    dataCache.statesGeo = topojson.feature(topology, topology.objects.states);
                }

                removeLayer('states');

                layerRefs.states = L.geoJSON(dataCache.statesGeo, {
                    pane: 'boundaryPane',
                    style: {
                        color: '#a78bfa',
                        weight: settings.stateBorderWidth,
                        opacity: settings.borderOpacity,
                        fillOpacity: 0
                    }
                });

                if (settings.layers.states) layerRefs.states.addTo(map);
            } catch(e) {
                console.error('States error:', e);
            }
        }

        async function loadCounties() {
            try {
                if (!dataCache.countiesGeo) {
                    const resp = await fetchWithTimeout(DATA_URLS.counties);
                    const topology = await resp.json();
                    dataCache.countiesGeo = topojson.feature(topology, topology.objects.counties);
                }

                removeLayer('counties');

                layerRefs.counties = L.geoJSON(dataCache.countiesGeo, {
                    pane: 'boundaryPane',
                    style: {
                        color: '#64748b',
                        weight: settings.countyBorderWidth,
                        opacity: settings.borderOpacity * 0.7,
                        fillOpacity: 0
                    }
                });

                if (settings.layers.counties) layerRefs.counties.addTo(map);
            } catch(e) {
                console.error('Counties error:', e);
            }
        }

        function toggleLabelsLayer(on) {
            removeLayer('labels');
            if (on) {
                const labelUrl = settings.theme === 'light' 
                    ? 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png'
                    : 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png';
                layerRefs.labels = L.tileLayer.cached(labelUrl, {
                    subdomains: 'abcd', 
                    opacity: 0.9, 
                    zIndex: 600, 
                    pane: 'overlayPane',
                    attribution: OSM_CARTO_ATTRIBUTION
                });
                layerRefs.labels.addTo(map);
            }
        }

        function roadEventPresentation(kind) {
            const presentations = {
                closure: { label: t('roadClosure') },
                laneClosure: { label: t('laneClosure') },
                restriction: { label: t('roadRestriction') },
                workZone: { label: t('roadWork') }
            };
            return presentations[kind] || presentations.workZone;
        }

        function bindRoadEventPopup(feature, layer) {
            const properties = feature.properties || {};
            const presentation = roadEventPresentation(properties.kind);
            const updated = properties.updatedAt ? formatExternalDate(properties.updatedAt, '') : '';
            const title = properties.headline || properties.phrase || presentation.label;
            const route = properties.route ? `<p><strong>${escapeHTML(properties.route, 80)}</strong></p>` : '';
            const description = properties.description ? `<p>${escapeHTML(properties.description, 500)}</p>` : '';
            const details = properties.details ? `<p>${escapeHTML(properties.details, 240)}</p>` : '';
            const restrictions = properties.restrictions
                ? `<p>${escapeHTML(t('roadEventRestrictions', { value: properties.restrictions }), 300)}</p>`
                : '';
            const alternateRoute = properties.alternateRoute
                ? `<p>${escapeHTML(t('roadEventAlternateRoute', { value: properties.alternateRoute }), 300)}</p>`
                : '';
            const updatedLine = updated ? `<div class="meta">${escapeHTML(t('roadEventUpdated', { updated }), 160)}</div>` : '';
            const sourceLink = properties.sourceUrl
                ? `<p><a href="${escapeHTML(properties.sourceUrl, 300)}" target="_blank" rel="noopener">${escapeHTML(t('roadEventDetails'), 100)}</a></p>`
                : '';
            layer.bindTooltip(`${escapeHTML(presentation.label, 80)}: ${escapeHTML(properties.route || title, 120)}`, { direction: 'top' });
            layer.bindPopup(`
                <div class="popup-content">
                    <span class="badge ${properties.kind === 'closure' ? 'danger' : 'warning'}">${escapeHTML(presentation.label, 80)}</span>
                    <h4>${escapeHTML(title, 240)}</h4>
                    ${route}${description}${details}${restrictions}${alternateRoute}${sourceLink}${updatedLine}
                    <div class="meta">${escapeHTML(t('roadEventSource'), 120)}</div>
                </div>
            `);
        }

        function roadEventMapBounds() {
            const bounds = map.getBounds();
            return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
        }

        async function loadHighwayEvents() {
            const controller = beginLayerRequest('highways', true);
            try {
                const query = buildIowa511Query(roadEventMapBounds());
                if (!query) {
                    commitOverlayLayer('highways', controller, L.layerGroup(), 0, t('roadEventsOutside'));
                    return;
                }
                const response = await fetchWithTimeout(query, { signal: controller.signal });
                const payload = await response.json();
                if (!isLayerRequestCurrent('highways', controller)) return;
                const roadEvents = normalizeIowa511Events(payload);
                const nextLayer = L.geoJSON(roadEvents, {
                    pane: 'markerPane',
                    pointToLayer: (feature, latlng) => {
                        const presentation = roadEventPresentation(feature.properties?.kind);
                        const kind = ['closure', 'laneClosure', 'restriction', 'workZone'].includes(feature.properties?.kind)
                            ? feature.properties.kind
                            : 'workZone';
                        const marker = L.marker(latlng, {
                            pane: 'markerPane',
                            keyboard: true,
                            title: `${presentation.label}: ${safeText(feature.properties?.route || feature.properties?.headline, 120)}`,
                            icon: L.divIcon({
                                className: `road-event-icon road-event-marker ${kind}`,
                                iconSize: [kind === 'closure' ? 16 : 14, kind === 'closure' ? 16 : 14],
                                iconAnchor: [kind === 'closure' ? 8 : 7, kind === 'closure' ? 8 : 7]
                            })
                        });
                        marker.on('add', () => {
                            const element = marker.getElement();
                            element?.setAttribute('role', 'button');
                            element?.setAttribute('aria-label', marker.options.title);
                        });
                        return marker;
                    },
                    onEachFeature: bindRoadEventPopup
                });
                const updated = roadEvents.updatedAt
                    ? formatExternalDate(roadEvents.updatedAt, t('latest'))
                    : t('latest');
                const message = roadEvents.features.length
                    ? t('roadEventsCurrent', { count: roadEvents.features.length, updated })
                    : t('roadEventsEmpty');
                commitOverlayLayer('highways', controller, nextLayer, roadEvents.features.length, message);
            } catch (error) {
                if (error?.name === 'AbortError') return;
                console.error('Iowa road events error:', error);
                failOverlayRequest('highways', error);
                showToast(t('roadEventsUnavailable', { message: safeText(error.message, 120) }), 'warn', 5000);
            } finally {
                finishLayerRequest('highways', controller);
            }
        }

        function disposeHighwayEvents() {
            clearTimeout(roadEventReloadTimeout);
            roadEventReloadTimeout = null;
            removeLayer('highways');
        }

        // ==================== UI ====================
        function updatePlaybackVisibility() {
            const playback = document.getElementById('playback');
            if (!playback) return;
            const capability = RADAR_CAPABILITIES[settings.source] || RADAR_CAPABILITIES.mrms;
            const configuredAnimation = capability.animation
                && (settings.source !== 'mrms' || settings.radarProduct === 'reflectivity');
            const loadedAnimation = framesReady && activeRadarSource === settings.source
                ? frames.length > 1
                : configuredAnimation;
            playback.style.display = replayMode || loadedAnimation ? '' : 'none';
        }

        function updateTimestamp() {
            const frame = frames[currentFrame];
            if (!frame) return;

            const date = new Date(frame.time * 1000);
            if (!Number.isFinite(date.getTime())) {
                setProviderStatus(
                    'error',
                    t('invalidProviderTime', { provider: RADAR_CAPABILITIES[settings.source].label }),
                    loadRadarData
                );
                return;
            }
            let timeStr;
            
            const formatOpts = { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true
            };

            if (settings.useLocalTime) {
                timeStr = formatLocalizedDate(date, formatOpts);
                const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
                document.getElementById('timestampTz').textContent = t('localTime');
                document.getElementById('timestampTz').title = localZone;
            } else {
                timeStr = formatLocalizedDate(date, { ...formatOpts, timeZone: 'UTC' });
                document.getElementById('timestampTz').textContent = 'UTC';
                document.getElementById('timestampTz').title = 'Coordinated Universal Time';
            }

            const isForecast = frame.isForecast === true;
            const frameKinds = { forecast: t('forecast'), analysis: t('analysis'), past: t('past'), latest: t('latest'), replay: localizedStaticText('Replay') };
            const frameKind = frameKinds[frame.kind] || (isForecast ? t('forecast') : t('latest'));
            document.getElementById('timestampText').textContent = `${timeStr} (${frameKind})`;
            const timestampBox = document.getElementById('timestampBox');
            timestampBox.classList.toggle('forecast', isForecast);
            timestampBox.dataset.providerTime = date.toISOString();
            timestampBox.dataset.kind = frame.kind || frameKind.toLowerCase();
            timestampBox.dataset.source = settings.source;
            timestampBox.dataset.modelInit = frame.modelInitTime
                ? new Date(frame.modelInitTime * 1000).toISOString()
                : '';
            
            // Update frame indicator
            updateFrameIndicator(isForecast, frameKind);
            
            // Update mobile timestamp
            updateMobileTimestamp(timeStr, isForecast, frameKind);
            refreshComparisonRadar();
            refreshPipRadar();
        }
        
        function formatProviderAge(frame) {
            const deltaSeconds = Math.round((Date.now() - frame.time * 1000) / 1000);
            const absoluteMinutes = Math.max(0, Math.round(Math.abs(deltaSeconds) / 60));
            if (deltaSeconds < -60) {
                if (absoluteMinutes < 60) return t('validInMinutes', { value: absoluteMinutes });
                return t('validInHours', { value: Math.round(absoluteMinutes / 60) });
            }
            if (absoluteMinutes < 1) return t('providerJustNow');
            if (absoluteMinutes < 60) return t('minutesOld', { value: absoluteMinutes });
            return t('hoursOld', { value: Math.round(absoluteMinutes / 60) });
        }

        function updateFrameIndicator(isForecast, frameKind) {
            const sourceEl = document.getElementById('fiSource');
            const frameEl = document.getElementById('fiFrame');
            const frame = frames[currentFrame];
            
            if (!sourceEl || !frameEl || !frame) return;
            
            sourceEl.textContent = replayMode ? 'IEM Replay' : (RADAR_CAPABILITIES[settings.source]?.label || settings.source);
            sourceEl.classList.toggle('forecast', isForecast);
            
            if (replayMode) {
                frameEl.textContent = `${localizedStaticText('Replay')} • ${currentFrame + 1}/${frames.length}`;
                frameEl.title = frame.timeSource || '';
            } else if (settings.source === 'hrrr') {
                const hour = frame.forecastHour || 0;
                if (hour === 0) {
                    frameEl.textContent = `${t('analysis')} • ${formatProviderAge(frame)} • 1/${frames.length}`;
                } else {
                    frameEl.textContent = `F${String(hour).padStart(2, '0')} ${t('forecast')} • ${formatProviderAge(frame)} • ${currentFrame + 1}/${frames.length}`;
                }
                frameEl.title = `Model initialized ${new Date(frame.modelInitTime * 1000).toISOString()}`;
            } else if (settings.source === 'level2') {
                const productNames = {
                    reflectivity: 'Reflectivity',
                    velocity: 'Velocity',
                    differentialReflectivity: 'ZDR',
                    correlationCoefficient: 'Correlation coefficient'
                };
                frameEl.textContent = `${frame.site} ${frame.elevationAngle.toFixed(1)}° • ${localizedStaticText(productNames[settings.radarProduct])} • ${formatProviderAge(frame)}`;
                frameEl.title = `${frame.timeSource || ''}: ${frame.path || ''}`;
            } else if (!RADAR_CAPABILITIES[settings.source]?.animation) {
                frameEl.textContent = `${frameKind} • ${formatProviderAge(frame)}`;
                frameEl.title = frame.timeSource || '';
            } else {
                frameEl.textContent = `${frameKind} • ${formatProviderAge(frame)} • ${currentFrame + 1}/${frames.length}`;
                frameEl.title = frame.timeSource || '';
            }
            
            const refreshEl = document.getElementById('fiRefreshed');
            if (refreshEl && lastRefreshTime) {
                const ago = Math.round((Date.now() - lastRefreshTime) / 60000);
                if (ago < 1) refreshEl.textContent = t('fetchedJustNow');
                else if (ago === 1) refreshEl.textContent = t('fetchedMinuteAgo');
                else refreshEl.textContent = t('fetchedMinutesAgo', { value: ago });
            }
        }
        
        function updateMobileTimestamp(timeStr, isForecast, frameKind) {
            const el = document.getElementById('mobileTimestamp');
            if (!el) return;

            el.replaceChildren(document.createTextNode(timeStr));
            const badge = document.createElement('span');
            badge.className = 'forecast-badge';
            if (isForecast && settings.source === 'hrrr') {
                const hour = frames[currentFrame]?.mins ? Math.round(frames[currentFrame].mins / 60) : 0;
                badge.textContent = `+${hour}hr`;
            } else if (isForecast) {
                badge.textContent = t('forecast');
            } else {
                badge.textContent = frameKind;
            }
            el.append(' ', badge);
        }

        function updateTimelineFill() {
            const pct = frames.length > 0 ? ((currentFrame + 1) / frames.length) * 100 : 0;
            document.getElementById('timelineFill').style.width = pct + '%';
            document.getElementById('timelineThumb').style.left = pct + '%';
            const timeline = document.getElementById('timeline');
            timeline.setAttribute('aria-valuemax', String(Math.max(1, frames.length)));
            timeline.setAttribute('aria-valuenow', String(Math.max(1, currentFrame + 1)));
            timeline.setAttribute('aria-valuetext', frames[currentFrame]
                ? `${RADAR_CAPABILITIES[settings.source]?.label || settings.source}, ${formatLocalizedDate(frames[currentFrame].time * 1000, { dateStyle: 'short', timeStyle: 'short' })}`
                : t('noRadarFrame'));
        }

        function updateTimelineUI() {
            const forecastStart = frames.findIndex(frame => frame.isForecast === true);
            if (forecastStart >= 0) {
                const start = (forecastStart / frames.length) * 100;
                document.getElementById('timelineForecast').style.width = (100 - start) + '%';
            } else {
                document.getElementById('timelineForecast').style.width = '0';
            }
            updateTimelineFill();
            buildTimelineTicks();
        }
        
        // Build tick marks on timeline for hour reference points
        function buildTimelineTicks() {
            const container = document.getElementById('timelineTicks');
            if (!container) return;
            container.innerHTML = '';
            
            if (frames.length < 3) return;
            
            if (settings.source === 'hrrr') {
                // Show ticks every 3 hours for HRRR
                for (let i = 0; i < frames.length; i++) {
                    const hour = frames[i].mins ? Math.round(frames[i].mins / 60) : i;
                    if (hour > 0 && hour % 3 === 0) {
                        const pct = ((i + 0.5) / frames.length) * 100;
                        const tick = document.createElement('div');
                        tick.className = 'timeline-tick major';
                        tick.style.left = pct + '%';
                        container.appendChild(tick);
                        
                        const label = document.createElement('div');
                        label.className = 'timeline-tick-label';
                        label.style.left = pct + '%';
                        label.textContent = `+${hour}h`;
                        container.appendChild(label);
                    }
                }
            } else if (settings.source === 'mrms' && settings.radarProduct === 'reflectivity') {
                radarHistoryTickIndices(frames).forEach(({ index, hoursAgo }) => {
                    const pct = ((index + 0.5) / frames.length) * 100;
                    const tick = document.createElement('div');
                    tick.className = 'timeline-tick major';
                    tick.style.left = pct + '%';
                    container.appendChild(tick);

                    const label = document.createElement('div');
                    label.className = 'timeline-tick-label';
                    label.style.left = pct + '%';
                    label.textContent = hoursAgo ? `−${hoursAgo}h` : t('now');
                    container.appendChild(label);
                });
            } else if (settings.source === 'rainviewer' && frames.length > 6) {
                // Show a tick at the past/forecast boundary
                if (lastPastFrame > 0 && lastPastFrame < frames.length - 1) {
                    const pct = ((lastPastFrame + 0.5) / frames.length) * 100;
                    const tick = document.createElement('div');
                    tick.className = 'timeline-tick major';
                    tick.style.left = pct + '%';
                    container.appendChild(tick);
                    
                    const label = document.createElement('div');
                    label.className = 'timeline-tick-label';
                    label.style.left = pct + '%';
                    label.textContent = t('now');
                    container.appendChild(label);
                }
            }
        }

        function showLoadProgress() {
            const progress = document.getElementById('loadProgress');
            progress.classList.add('show');
            progress.dataset.state = 'loading';
            document.getElementById('loadProgressRetry').hidden = true;
            document.getElementById('playBtn').classList.add('loading');
        }

        function hideLoadProgress() {
            document.getElementById('loadProgress').classList.remove('show');
            document.getElementById('playBtn').classList.remove('loading');
        }

        function updateLoadProgress(pct) {
            const value = Math.max(0, Math.min(100, Math.round(pct)));
            document.getElementById('loadProgressFill').style.width = value + '%';
            document.getElementById('loadProgressText').textContent = value + '%';
            document.getElementById('loadProgressBar').setAttribute('aria-valuenow', String(value));
        }

        function markRadarFrameLoaded() {
            framesLoaded = Math.min(framesTotal, framesLoaded + 1);
            markOfflineRadarFrameReady();
            if (diagnosticsState.performance.firstUsableFrameMs === null) {
                diagnosticsState.performance.firstUsableFrameMs = Math.round(performance.now() - diagnosticsState.performance.startupStartedAt);
            }
            updateLoadProgress(framesTotal ? framesLoaded / framesTotal * 100 : 100);
            renderDiagnostics();
        }

        function showLoadFailure() {
            const progress = document.getElementById('loadProgress');
            progress.classList.add('show');
            progress.dataset.state = 'error';
            document.getElementById('loadProgressText').textContent = 'Radar unavailable';
            document.getElementById('loadProgressRetry').hidden = false;
            document.getElementById('playBtn').classList.remove('loading');
        }

        function setProviderStatus(state, message, retry = null) {
            const el = document.getElementById('dataStatus');
            const dot = el.querySelector('.dot');
            const colors = {
                loading: 'blue',
                current: 'green',
                stale: 'yellow',
                fallback: 'yellow',
                error: 'red'
            };
            dot.className = `dot ${colors[state] || 'blue'}`;
            document.getElementById('dataStatusText').textContent = message;
            const startupStatus = document.getElementById('startupStatus');
            if (startupStatus && !document.getElementById('loading').classList.contains('hidden')) {
                startupStatus.textContent = message;
                document.getElementById('startupRetry').hidden = state !== 'error';
            }
            el.dataset.state = state;
            el.classList.add('show');
            el.classList.toggle('retryable', typeof retry === 'function');
            el.title = retry ? `${message}. Activate to retry.` : message;
            el.onclick = typeof retry === 'function' ? retry : null;
            diagnosticsState.provider = {
                state,
                message: safeText(message, 160),
                updatedAt: new Date().toISOString(),
                retryable: typeof retry === 'function'
            };
            renderDiagnostics();
        }

        function showDataStatus(msg) {
            const el = document.getElementById('tileStatus');
            document.getElementById('tileStatusText').textContent = msg;
            el.classList.add('show');
            setTimeout(() => el.classList.remove('show'), 3000);
        }
        
        // ==================== TOAST NOTIFICATIONS ====================
        function showToast(message, type = 'info', duration = 3500, action = null) {
            const container = document.getElementById('toastContainer');
            if (!container) return;
            
            const icons = {
                info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
                success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
                warn: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
                error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
            };
            
            const toast = document.createElement('div');
            toast.className = 'toast';
            const icon = document.createElement('span');
            const safeType = Object.hasOwn(icons, type) ? type : 'info';
            icon.className = `toast-icon ${safeType}`;
            icon.innerHTML = icons[safeType];
            const text = document.createElement('span');
            text.className = 'toast-msg';
            text.textContent = safeText(message, 500);
            toast.append(icon, text);
            if (action && typeof action.handler === 'function') {
                const button = document.createElement('button');
                button.className = 'toast-action';
                button.type = 'button';
                button.textContent = safeText(action.label || 'Undo', 40);
                button.addEventListener('click', () => {
                    action.handler();
                    toast.remove();
                }, { once: true });
                toast.appendChild(button);
            }
            container.appendChild(toast);
            
            // Limit visible toasts
            while (container.children.length > 4) {
                container.removeChild(container.firstChild);
            }
            
            setTimeout(() => {
                toast.classList.add('removing');
                setTimeout(() => toast.remove(), 250);
            }, duration);
        }
        
        // ==================== DYNAMIC LEGEND ====================
        function updateLegend() {
            const gradient = document.querySelector('.legend-gradient');
            const labels = document.querySelector('.legend-labels');
            if (!gradient || !labels) return;
            
            if (settings.radarProduct === 'velocity') {
                gradient.style.background = 'linear-gradient(to bottom, #ff0000 0%, #ff6600 15%, #ffaa00 30%, #ffffff 50%, #00aaff 70%, #0055ff 85%, #0000aa 100%)';
                if (settings.source === 'level2') {
                    labels.innerHTML = settings.units === 'metric'
                        ? '<span>+230 km/h</span><span>+145</span><span>+55</span><span>0</span><span>-55</span><span>-145</span><span>-230 km/h</span>'
                        : '<span>+125 kt</span><span>+80</span><span>+30</span><span>0</span><span>-30</span><span>-80</span><span>-125 kt</span>';
                } else {
                    labels.innerHTML = settings.units === 'metric'
                        ? '<span>+130 km/h</span><span>+93</span><span>+56</span><span>0</span><span>-56</span><span>-93</span><span>-130 km/h</span>'
                        : '<span>+70 kt</span><span>+50</span><span>+30</span><span>0</span><span>-30</span><span>-50</span><span>-70 kt</span>';
                }
            } else if (settings.radarProduct === 'differentialReflectivity') {
                gradient.style.background = 'linear-gradient(to bottom, #780082 0%, #d20064 25%, #ff8200 45%, #ffff00 65%, #e6e6e6 80%, #0096ff 100%)';
                labels.innerHTML = '<span>+8 dB</span><span>+6</span><span>+3</span><span>+1</span><span>0</span><span>-1</span><span>-4 dB</span>';
            } else if (settings.radarProduct === 'correlationCoefficient') {
                gradient.style.background = 'linear-gradient(to bottom, #1e3cb4 0%, #00aaff 25%, #50d250 45%, #ffdc00 65%, #ff6400 80%, #dc008c 92%, #501e78 100%)';
                labels.innerHTML = '<span>1.05</span><span>1.00</span><span>0.98</span><span>0.95</span><span>0.90</span><span>0.80</span><span>0.65</span>';
            } else if (settings.radarProduct === 'echoTops' && settings.source === 'mrms') {
                gradient.style.background = 'linear-gradient(to bottom, #ff00ff 0%, #ff0000 20%, #ff8800 40%, #ffff00 60%, #00ff00 80%, #0088ff 100%)';
                labels.innerHTML = settings.units === 'metric'
                    ? '<span>18 km</span><span>15</span><span>12</span><span>9</span><span>6</span><span>3 km</span>'
                    : '<span>60k ft</span><span>50k</span><span>40k</span><span>30k</span><span>20k</span><span>10k ft</span>';
            } else if (settings.radarProduct === 'precipAccum' && settings.source === 'mrms') {
                gradient.style.background = 'linear-gradient(to bottom, #ff00ff 0%, #ff0000 15%, #ff6600 30%, #ffcc00 45%, #00ff00 60%, #00ccff 75%, #0066ff 90%, #000066 100%)';
                labels.innerHTML = settings.units === 'metric'
                    ? '<span>152+ mm</span><span>102</span><span>76</span><span>51</span><span>25</span><span>13</span><span>3</span><span>Trace</span>'
                    : '<span>6.0"+</span><span>4.0"</span><span>3.0"</span><span>2.0"</span><span>1.0"</span><span>0.5"</span><span>0.1"</span><span>Trace</span>';
            } else if (settings.radarProduct === 'precipRate' && settings.source === 'eccc') {
                gradient.style.background = 'linear-gradient(to bottom, #2d004b 0%, #c400bc 20%, #ff003b 32%, #ff7600 45%, #ffe600 58%, #008000 70%, #00d84c 82%, #00b6ef 92%, #b9dcff 100%)';
                labels.innerHTML = '<span>200+ mm/h</span><span>100</span><span>50</span><span>24</span><span>12</span><span>4</span><span>1</span><span>0.1 mm/h</span>';
            } else {
                // Default reflectivity
                gradient.style.background = 'linear-gradient(to bottom, #ff00ff 0%, #ff0000 15%, #ff6600 25%, #ffc800 35%, #ffff00 45%, #7fff00 55%, #00c800 65%, #00b4ff 75%, #0064ff 85%, #000096 100%)';
                labels.innerHTML = '<span>75+ dBZ</span><span>65</span><span>55</span><span>45</span><span>35</span><span>25</span><span>15</span><span>5 dBZ</span>';
            }
        }

        function hideLoading() {
            document.getElementById('loading').classList.add('hidden');
            setTimeout(() => {
                initialLoadComplete = true;
                updatePwaInstallPrompt();
            }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 20 : 520);
        }

        // ==================== CLICK-TO-FORECAST (Open-Meteo) ====================
        let forecastMarker = null;
        let forecastAbort = null;

        const WMO_CODES = {
            0: { text: 'Clear Sky', icon: '\u2600\uFE0F', night: '\uD83C\uDF19' },
            1: { text: 'Mainly Clear', icon: '\uD83C\uDF24\uFE0F', night: '\uD83C\uDF19' },
            2: { text: 'Partly Cloudy', icon: '\u26C5', night: '\uD83C\uDF19' },
            3: { text: 'Overcast', icon: '\u2601\uFE0F', night: '\u2601\uFE0F' },
            45: { text: 'Fog', icon: '\uD83C\uDF2B\uFE0F', night: '\uD83C\uDF2B\uFE0F' },
            48: { text: 'Rime Fog', icon: '\uD83C\uDF2B\uFE0F', night: '\uD83C\uDF2B\uFE0F' },
            51: { text: 'Light Drizzle', icon: '\uD83C\uDF26\uFE0F', night: '\uD83C\uDF26\uFE0F' },
            53: { text: 'Drizzle', icon: '\uD83C\uDF27\uFE0F', night: '\uD83C\uDF27\uFE0F' },
            55: { text: 'Heavy Drizzle', icon: '\uD83C\uDF27\uFE0F', night: '\uD83C\uDF27\uFE0F' },
            56: { text: 'Freezing Drizzle', icon: '\uD83C\uDF28\uFE0F', night: '\uD83C\uDF28\uFE0F' },
            57: { text: 'Heavy Fzg Drizzle', icon: '\uD83C\uDF28\uFE0F', night: '\uD83C\uDF28\uFE0F' },
            61: { text: 'Light Rain', icon: '\uD83C\uDF26\uFE0F', night: '\uD83C\uDF26\uFE0F' },
            63: { text: 'Rain', icon: '\uD83C\uDF27\uFE0F', night: '\uD83C\uDF27\uFE0F' },
            65: { text: 'Heavy Rain', icon: '\uD83C\uDF27\uFE0F', night: '\uD83C\uDF27\uFE0F' },
            66: { text: 'Freezing Rain', icon: '\uD83C\uDF28\uFE0F', night: '\uD83C\uDF28\uFE0F' },
            67: { text: 'Heavy Fzg Rain', icon: '\uD83C\uDF28\uFE0F', night: '\uD83C\uDF28\uFE0F' },
            71: { text: 'Light Snow', icon: '\uD83C\uDF28\uFE0F', night: '\uD83C\uDF28\uFE0F' },
            73: { text: 'Snow', icon: '\u2744\uFE0F', night: '\u2744\uFE0F' },
            75: { text: 'Heavy Snow', icon: '\u2744\uFE0F', night: '\u2744\uFE0F' },
            77: { text: 'Snow Grains', icon: '\u2744\uFE0F', night: '\u2744\uFE0F' },
            80: { text: 'Light Showers', icon: '\uD83C\uDF26\uFE0F', night: '\uD83C\uDF26\uFE0F' },
            81: { text: 'Showers', icon: '\uD83C\uDF27\uFE0F', night: '\uD83C\uDF27\uFE0F' },
            82: { text: 'Heavy Showers', icon: '\uD83C\uDF27\uFE0F', night: '\uD83C\uDF27\uFE0F' },
            85: { text: 'Snow Showers', icon: '\uD83C\uDF28\uFE0F', night: '\uD83C\uDF28\uFE0F' },
            86: { text: 'Heavy Snow Shwrs', icon: '\u2744\uFE0F', night: '\u2744\uFE0F' },
            95: { text: 'Thunderstorm', icon: '\u26C8\uFE0F', night: '\u26C8\uFE0F' },
            96: { text: 'T-Storm w/ Hail', icon: '\u26C8\uFE0F', night: '\u26C8\uFE0F' },
            99: { text: 'Severe T-Storm', icon: '\u26C8\uFE0F', night: '\u26C8\uFE0F' }
        };

        function getWeatherIcon(code, isNight = false) {
            const entry = WMO_CODES[code] || WMO_CODES[0];
            return isNight ? (entry.night || entry.icon) : entry.icon;
        }
        function getWeatherText(code) {
            return (WMO_CODES[code] || WMO_CODES[0]).text;
        }
        function windDirection(deg) {
            const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
            return dirs[Math.round(deg / 22.5) % 16];
        }

        function initForecastPanel() {
            const overlay = document.getElementById('fcOverlay');
            const panel = document.getElementById('fcPanel');
            const closeBtn = document.getElementById('fcClose');

            function closePanel() {
                overlay.classList.remove('open');
                panel.classList.remove('open');
                if (forecastAbort) { forecastAbort.abort(); forecastAbort = null; }
                setAccessibleDialog(panel, overlay, false);
            }

            closeBtn.addEventListener('click', closePanel);
            overlay.addEventListener('click', closePanel);

            const openCenterForecast = () => {
                const center = map.getCenter();
                openForecast(center.lat, center.lng);
            };
            document.getElementById('centerForecastBtn').addEventListener('click', openCenterForecast);
            const mapContainer = map.getContainer();
            if (!mapContainer.hasAttribute('tabindex')) mapContainer.tabIndex = 0;
            mapContainer.addEventListener('keydown', event => {
                if (event.target !== mapContainer || event.altKey || event.ctrlKey || event.metaKey) return;
                if (event.key.toLowerCase() !== 'f') return;
                event.preventDefault();
                openCenterForecast();
            });

            // Map click handler
            map.on('click', (e) => {
                // Don't trigger if clicking on a popup, marker, or UI element
                if (e.originalEvent.target.closest('.leaflet-popup, .leaflet-marker-icon, .leaflet-interactive')) return;
                
                const { lat, lng } = e.latlng;
                openForecast(lat, lng);
            });
        }

        async function openForecast(lat, lng) {
            const overlay = document.getElementById('fcOverlay');
            const panel = document.getElementById('fcPanel');
            const body = document.getElementById('fcBody');
            const locEl = document.getElementById('fcLocation');
            const coordsEl = document.getElementById('fcCoords');

            // Cancel any in-flight requests
            if (forecastAbort) forecastAbort.abort();
            forecastAbort = new AbortController();
            const signal = forecastAbort.signal;

            // Place/update marker
            if (forecastMarker) {
                forecastMarker.setLatLng([lat, lng]);
            } else {
                forecastMarker = L.marker([lat, lng], {
                    icon: L.divIcon({ className: 'forecast-marker', iconSize: [20, 20], iconAnchor: [10, 10] }),
                    zIndexOffset: 1000
                }).addTo(map);
            }

            // Show panel with loading state
            locEl.textContent = t('loading');
            coordsEl.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            body.innerHTML = `<div class="fc-loading"><div class="fc-loading-spinner"></div><div class="fc-loading-text">${escapeHTML(t('fetchingForecast'))}</div></div>`;
            overlay.classList.add('open');
            panel.classList.add('open');
            setAccessibleDialog(panel, overlay, true, document.activeElement, () => document.getElementById('fcClose').click());

            try {
                // Parallel fetch: Open-Meteo forecast + NWS point metadata + NWS alerts for point
                const requestedUnits = settings.units === 'metric'
                    ? { temperature: 'celsius', wind: 'kmh', precipitation: 'mm' }
                    : { temperature: 'fahrenheit', wind: 'mph', precipitation: 'inch' };
                const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
                    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,precipitation,is_day` +
                    `&hourly=temperature_2m,weather_code,precipitation_probability,is_day` +
                    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max` +
                    `&temperature_unit=${requestedUnits.temperature}&wind_speed_unit=${requestedUnits.wind}&precipitation_unit=${requestedUnits.precipitation}&timezone=auto&forecast_days=7`;

                const nwsUrl = `https://api.weather.gov/points/${lat.toFixed(4)},${lng.toFixed(4)}`;
                const nwsAlertUrl = `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lng.toFixed(4)}&limit=3`;

                const [omResp, nwsResp, alertResp] = await Promise.allSettled([
                    fetchWithTimeout(omUrl, { signal }),
                    fetchWithTimeout(nwsUrl, { signal }),
                    fetchWithTimeout(nwsAlertUrl, { signal })
                ]);

                if (signal.aborted) return;

                // Parse Open-Meteo
                if (omResp.status !== 'fulfilled' || !omResp.value.ok) {
                    throw new Error('Open-Meteo API unavailable');
                }
                const om = await omResp.value.json();
                if (!om || typeof om.current !== 'object' || !om.hourly || !om.daily) {
                    throw new Error('Open-Meteo returned an invalid forecast payload');
                }

                // Parse NWS location name
                let locationName = `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
                if (nwsResp.status === 'fulfilled' && nwsResp.value.ok) {
                    const nws = await nwsResp.value.json();
                    const city = nws.properties?.relativeLocation?.properties?.city || '';
                    const state = nws.properties?.relativeLocation?.properties?.state || '';
                    if (city && state) locationName = `${city}, ${state}`;
                    else if (city) locationName = city;
                }

                // Parse active alerts
                let alerts = [];
                if (alertResp.status === 'fulfilled' && alertResp.value.ok) {
                    const alertData = await alertResp.value.json();
                    alerts = featureList(alertData, 3).map(f => safeText(f.properties?.event, 120)).filter(Boolean);
                }

                locEl.textContent = locationName;
                coordsEl.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)} \u2022 ${om.timezone || ''}`;
                currentForecastLocation = { name: locationName, lat, lng };
                updateForecastSaveState();
                renderForecast(om, alerts);

            } catch(e) {
                if (e.name === 'AbortError') return;
                console.error('Forecast error:', e);
                body.innerHTML = `<div class="fc-loading"><div class="fc-loading-text" style="color:var(--danger)">${escapeHTML(t('forecastFailed'))}</div></div>`;
            }
        }

        function renderForecast(om, alerts) {
            const body = document.getElementById('fcBody');
            const cur = om.current;
            const hourly = om.hourly;
            const daily = om.daily;
            const isNight = !cur.is_day;
            const units = unitProfile();
            const pressure = settings.units === 'metric'
                ? `${Math.round(cur.surface_pressure)} ${units.pressure}`
                : `${(cur.surface_pressure * 0.02953).toFixed(2)} ${units.pressure}`;

            let html = '';

            // Active alerts banner
            if (alerts.length > 0) {
                html += `<div class="fc-alert-banner">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    ${alerts.slice(0, 3).map(alert => escapeHTML(alert, 120)).join(' \u2022 ')}
                </div>`;
            }

            // Current conditions
            html += `<div class="fc-current">
                <div class="fc-current-icon">${getWeatherIcon(cur.weather_code, isNight)}</div>
                <div class="fc-current-temp">${Math.round(cur.temperature_2m)}${units.temperature}</div>
                <div class="fc-current-details">
                    <div class="fc-condition">${localizedStaticText(getWeatherText(cur.weather_code))}</div>
                    <div class="fc-stats">
                        <div><span class="fc-stat-label">${t('feels')} </span>${Math.round(cur.apparent_temperature)}${units.temperature}</div>
                        <div><span class="fc-stat-label">${t('humidity')} </span>${Math.round(finiteNumber(cur.relative_humidity_2m, 0, 100, 0))}%</div>
                        <div><span class="fc-stat-label">${t('wind')} </span>${windDirection(cur.wind_direction_10m)} ${Math.round(cur.wind_speed_10m)} ${units.speed}</div>
                        <div><span class="fc-stat-label">${t('gusts')} </span>${Math.round(cur.wind_gusts_10m)} ${units.speed}</div>
                        <div><span class="fc-stat-label">${t('pressure')} </span>${pressure}</div>
                        <div><span class="fc-stat-label">${t('precip')} </span>${finiteNumber(cur.precipitation, 0, 100, 0).toFixed(2)} ${units.precipitation}/h</div>
                    </div>
                </div>
            </div>`;

            // Hourly forecast (next 24h)
            if (hourly && hourly.time) {
                html += `<div class="fc-section-title">${t('hourlyForecast')}</div>`;
                html += `<div class="fc-hourly-scroll">`;
                const now = new Date();
                const startIdx = hourly.time.findIndex(t => new Date(t) >= now);
                const start = Math.max(0, startIdx);
                for (let i = start; i < Math.min(start + 24, hourly.time.length); i++) {
                    const d = new Date(hourly.time[i]);
                    const isHourNight = !hourly.is_day[i];
                    const label = i === start ? t('now') : formatLocalizedDate(d, { hour: 'numeric' });
                    const precip = hourly.precipitation_probability?.[i];
                    html += `<div class="fc-hour">
                        <div class="fc-hour-time">${label}</div>
                        <div class="fc-hour-icon">${getWeatherIcon(hourly.weather_code[i], isHourNight)}</div>
                        <div class="fc-hour-temp">${Math.round(hourly.temperature_2m[i])}${units.temperature}</div>
                        ${precip > 0 ? `<div class="fc-hour-precip">${precip}%</div>` : ''}
                    </div>`;
                }
                html += `</div>`;
            }

            // 7-day forecast
            if (daily && daily.time) {
                html += `<div class="fc-section-title">${t('sevenDayForecast')}</div>`;
                html += `<div class="fc-daily">`;

                // Find overall temp range for bar scaling
                const allHi = daily.temperature_2m_max;
                const allLo = daily.temperature_2m_min;
                const rangeMin = Math.min(...allLo);
                const rangeMax = Math.max(...allHi);
                const rangeDelta = rangeMax - rangeMin || 1;

                for (let i = 0; i < daily.time.length; i++) {
                    const d = new Date(daily.time[i] + 'T12:00:00');
                    const dayName = i === 0 ? t('today') : formatLocalizedDate(d, { weekday: 'short', month: 'short', day: 'numeric' });
                    const hi = Math.round(allHi[i]);
                    const lo = Math.round(allLo[i]);
                    
                    // Bar position within range
                    const barLeft = ((allLo[i] - rangeMin) / rangeDelta) * 100;
                    const barWidth = Math.max(8, ((allHi[i] - allLo[i]) / rangeDelta) * 100);

                    html += `<div class="fc-day">
                        <div class="fc-day-name">${dayName}</div>
                        <div class="fc-day-icon">${getWeatherIcon(daily.weather_code[i])}</div>
                        <div class="fc-day-bar-track"><div class="fc-day-bar" style="margin-left:${barLeft}%;width:${barWidth}%"></div></div>
                        <div class="fc-day-lo">${lo}${units.temperature}</div>
                        <div class="fc-day-hi">${hi}${units.temperature}</div>
                    </div>`;
                }
                html += `</div>`;
            }

            html += `<div class="fc-powered">Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> &amp; <a href="https://www.weather.gov/" target="_blank" rel="noopener">NWS</a></div>`;

            body.innerHTML = html;
        }

        // ==================== SAVED LOCATIONS ====================
        const BOOKMARKS_KEY = 'stormview_bookmarks';
        const MAX_BOOKMARKS = 100;
        let savedLocations = [];
        let currentForecastLocation = null; // {name, lat, lng}

        function loadBookmarks() {
            try {
                const parsed = JSON.parse(localStorage.getItem(BOOKMARKS_KEY)) || [];
                if (!Array.isArray(parsed)) throw new Error('Bookmarks must be an array');
                savedLocations = parsed.slice(0, MAX_BOOKMARKS).flatMap((bookmark, index) => {
                    const lat = Number(bookmark?.lat);
                    const lng = Number(bookmark?.lng);
                    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) return [];
                    return [{
                        name: safeText(bookmark.name || 'Saved location', 120),
                        lat,
                        lng,
                        id: Number.isSafeInteger(Number(bookmark.id)) ? Number(bookmark.id) : Date.now() + index
                    }];
                });
            } catch { savedLocations = []; }
        }

        function persistBookmarks(nextLocations) {
            try {
                localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(nextLocations));
                savedLocations = nextLocations;
                return true;
            } catch (error) {
                console.error('Saved location storage error:', error);
                showToast(
                    'Saved locations could not be stored. Export your current list, then remove entries or clear browser storage before retrying.',
                    'error',
                    8000
                );
                return false;
            }
        }

        function exportBookmarks() {
            const payload = {
                schemaVersion: 1,
                exportedAt: new Date().toISOString(),
                locations: savedLocations
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const anchor = document.createElement('a');
            anchor.href = URL.createObjectURL(blob);
            anchor.download = 'stormview-saved-locations.json';
            anchor.click();
            setTimeout(() => URL.revokeObjectURL(anchor.href), 0);
            showToast('Saved locations exported', 'success', 2500);
        }

        function radarProductLabel(product) {
            const names = {
                reflectivity: 'Reflectivity',
                velocity: 'Velocity',
                echoTops: 'Echo Tops',
                precipAccum: 'Precipitation',
                differentialReflectivity: 'Differential Reflectivity',
                correlationCoefficient: 'Correlation Coefficient'
            };
            return localizedStaticText(names[product] || product || 'Radar');
        }

        function mapCaptureOptions(frame = frames[currentFrame]) {
            const sourceLabel = RADAR_CAPABILITIES[settings.source]?.label || settings.source;
            const productLabel = radarProductLabel(settings.radarProduct);
            const attribution = map.attributionControl?.getContainer()?.textContent || '';
            const styles = getComputedStyle(document.body);
            return {
                scale: 1,
                title: `StormView Radar — ${sourceLabel} ${productLabel}`,
                frameLabel: `${document.getElementById('timestampText').textContent} • ${document.getElementById('timestampTz').textContent}`,
                attribution,
                backgroundColor: settings.theme === 'light' ? '#e2e8f0' : '#111827',
                accentColor: styles.getPropertyValue('--accent').trim() || '#38bdf8',
                sourceLabel,
                productLabel,
                frameDate: new Date((frame?.time || 0) * 1000)
            };
        }

        async function exportMapSnapshot() {
            if (stormTop3dMode) {
                showToast(t('snapshotMapOnly'), 'info', 3200);
                return;
            }
            const frame = frames[currentFrame];
            if (!framesReady || !frame) {
                showToast(t('snapshotUnavailable'), 'info', 3200);
                return;
            }

            const button = document.getElementById('snapshotBtn');
            button.disabled = true;
            button.setAttribute('aria-busy', 'true');
            showToast(t('snapshotCreating'), 'info', 1800);
            pause();
            map.stop();
            cachedTileLayers.forEach(layer => {
                if (layer._map === map) layer._webglRenderer?.render();
            });

            try {
                const captureOptions = mapCaptureOptions(frame);
                const blob = await captureLeafletSnapshot(map.getContainer(), { ...captureOptions, scale: 2 });
                const anchor = document.createElement('a');
                anchor.href = URL.createObjectURL(blob);
                anchor.download = snapshotFilename(captureOptions.sourceLabel, settings.radarProduct, captureOptions.frameDate);
                document.body.appendChild(anchor);
                anchor.click();
                anchor.remove();
                setTimeout(() => URL.revokeObjectURL(anchor.href), 1500);
                showToast(t('snapshotSaved'), 'success', 2600);
            } catch (error) {
                console.error('Map snapshot error:', error);
                showToast(t('snapshotFailed', { message: safeText(error?.message || error, 160) }), 'error', 6000);
            } finally {
                button.disabled = false;
                button.removeAttribute('aria-busy');
            }
        }

        function updateAnimationExportLanguage() {
            const panel = document.getElementById('animationExportPanel');
            if (!panel) return;
            document.getElementById('animationExportTitle').textContent = t('animationExportTitle');
            document.getElementById('animationExportCopy').textContent = t('animationExportCopy');
            document.getElementById('animationExportFormatLabel').textContent = t('animationExportFormat');
            document.getElementById('animationExportDelayLabel').textContent = t('animationExportDelay');
            document.querySelector('#animationExportFormat option[value="gif"]').textContent = t('animationExportGif');
            document.querySelector('#animationExportFormat option[value="mp4"]').textContent = t('animationExportMp4');
            document.getElementById('animationExportStart').textContent = t('animationExportStart');
            document.getElementById('animationExportCancel').textContent = t('animationExportCancel');
            updateAnimationExportControls();
        }

        function updateAnimationExportControls() {
            const format = document.getElementById('animationExportFormat');
            if (!format) return;
            const mp4Option = format.querySelector('option[value="mp4"]');
            const mp4Mime = supportedMp4MimeType();
            mp4Option.disabled = !mp4Mime;
            mp4Option.title = mp4Mime ? '' : t('animationExportMp4Unavailable');
            if (!mp4Mime && format.value === 'mp4') format.value = 'gif';
            const count = sampledFrameIndices(frames.length).length;
            const delayMs = Number(document.getElementById('animationExportDelay').value) || 500;
            const summary = t('animationExportSummary', {
                count,
                seconds: messageFormatter.number(count * delayMs / 1000, { maximumFractionDigits: 1 })
            });
            document.getElementById('animationExportSummary').textContent = mp4Mime
                ? summary
                : `${summary} · ${t('animationExportMp4Unavailable')}`;
            document.getElementById('animationExportStart').disabled = Boolean(animationExportController)
                || !framesReady || count < 2;
        }

        function setAnimationExportPanel(open) {
            const panel = document.getElementById('animationExportPanel');
            const button = document.getElementById('animationExportBtn');
            panel.hidden = !open;
            button.setAttribute('aria-expanded', String(open));
            button.classList.toggle('active', open);
            if (open) {
                updateAnimationExportControls();
                document.getElementById('animationExportFormat').focus({ preventScroll: true });
            }
        }

        function setAnimationExportProgress(current, total, message) {
            const wrapper = document.getElementById('animationExportProgress');
            const progress = document.getElementById('animationExportProgressBar');
            wrapper.hidden = false;
            progress.max = Math.max(1, total);
            progress.value = Math.max(0, Math.min(total, current));
            document.getElementById('animationExportProgressText').textContent = message;
        }

        function waitForAnimationLayer(layer, signal) {
            if (signal?.aborted) return Promise.reject(signal.reason || new DOMException('Export cancelled', 'AbortError'));
            const container = layer?.getContainer?.();
            const images = container ? [...container.querySelectorAll('img')] : [];
            const waiting = layer?._loading === true || images.some(image => !image.complete || image.naturalWidth < 1);
            if (!waiting) return Promise.resolve();
            return new Promise((resolve, reject) => {
                let settled = false;
                const finish = error => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timeout);
                    layer?.off?.('load', onLoad);
                    signal?.removeEventListener('abort', onAbort);
                    if (error) reject(error);
                    else resolve();
                };
                const onLoad = () => finish();
                const onAbort = () => finish(signal.reason || new DOMException('Export cancelled', 'AbortError'));
                const timeout = setTimeout(() => finish(new Error('A radar frame did not finish loading for export')), 7000);
                layer?.once?.('load', onLoad);
                signal?.addEventListener('abort', onAbort, { once: true });
            });
        }

        function nextPaint(signal) {
            return new Promise((resolve, reject) => {
                if (signal?.aborted) {
                    reject(signal.reason || new DOMException('Export cancelled', 'AbortError'));
                    return;
                }
                requestAnimationFrame(() => requestAnimationFrame(resolve));
            });
        }

        async function renderAnimationFrame(frameIndex, outputCanvas, signal) {
            if (signal.aborted) throw signal.reason;
            showPreloadedFrame(frameIndex);
            if (replayMode) await renderReplayAlerts(frames[frameIndex].time * 1000);
            await waitForAnimationLayer(frameLayers[frameIndex], signal);
            cachedTileLayers.forEach(layer => {
                if (layer._map === map) layer._webglRenderer?.render();
            });
            await nextPaint(signal);
            const captureOptions = mapCaptureOptions(frames[frameIndex]);
            const snapshotCanvas = await renderLeafletSnapshot(map.getContainer(), captureOptions);
            if (!outputCanvas.width || !outputCanvas.height) {
                const dimensions = animationDimensions(snapshotCanvas.width, snapshotCanvas.height);
                outputCanvas.width = dimensions.width;
                outputCanvas.height = dimensions.height;
            }
            const context = outputCanvas.getContext('2d', { alpha: false, willReadFrequently: true });
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
            context.drawImage(snapshotCanvas, 0, 0, outputCanvas.width, outputCanvas.height);
        }

        function downloadAnimation(blob, filename) {
            const anchor = document.createElement('a');
            anchor.href = URL.createObjectURL(blob);
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            setTimeout(() => URL.revokeObjectURL(anchor.href), 2000);
        }

        async function exportRadarAnimation() {
            if (stormTop3dMode) {
                showToast(t('animationExportMapOnly'), 'info', 3200);
                return;
            }
            const frameIndices = sampledFrameIndices(frames.length);
            if (!framesReady || frameIndices.length < 2) {
                showToast(t('animationExportUnavailable'), 'info', 3600);
                return;
            }
            const format = document.getElementById('animationExportFormat').value;
            const mp4Mime = supportedMp4MimeType();
            if (format === 'mp4' && !mp4Mime) {
                showToast(t('animationExportMp4Unavailable'), 'warn', 4500);
                updateAnimationExportControls();
                return;
            }
            const delayMs = Math.max(250, Math.min(750, Number(document.getElementById('animationExportDelay').value) || 500));
            const originalFrame = currentFrame;
            const wasPlaying = isPlaying;
            const controller = new AbortController();
            animationExportController = controller;
            pause();
            map.stop();
            document.body.classList.add('animation-exporting');
            document.getElementById('animationExportCancel').hidden = false;
            document.getElementById('animationExportClose').disabled = true;
            updateAnimationExportControls();
            const outputCanvas = document.createElement('canvas');
            outputCanvas.width = 0;
            outputCanvas.height = 0;
            try {
                let blob;
                const formatLabel = format === 'mp4' ? 'MP4' : 'GIF';
                if (format === 'mp4') {
                    const mapRect = map.getContainer().getBoundingClientRect();
                    const dimensions = animationDimensions(Math.round(mapRect.width), Math.round(mapRect.height) + 88);
                    outputCanvas.width = dimensions.width;
                    outputCanvas.height = dimensions.height;
                    blob = await recordCanvasMp4(outputCanvas, {
                        mimeType: mp4Mime,
                        frameCount: frameIndices.length,
                        delayMs,
                        signal: controller.signal,
                        drawFrame: async exportIndex => {
                            setAnimationExportProgress(exportIndex, frameIndices.length, t('animationExportCapturing', {
                                current: exportIndex + 1,
                                total: frameIndices.length
                            }));
                            await renderAnimationFrame(frameIndices[exportIndex], outputCanvas, controller.signal);
                        }
                    });
                } else {
                    const gifFrames = [];
                    for (let exportIndex = 0; exportIndex < frameIndices.length; exportIndex += 1) {
                        setAnimationExportProgress(exportIndex, frameIndices.length, t('animationExportCapturing', {
                            current: exportIndex + 1,
                            total: frameIndices.length
                        }));
                        await renderAnimationFrame(frameIndices[exportIndex], outputCanvas, controller.signal);
                        const context = outputCanvas.getContext('2d', { willReadFrequently: true });
                        gifFrames.push(rgbaToGifIndices(context.getImageData(0, 0, outputCanvas.width, outputCanvas.height).data));
                    }
                    setAnimationExportProgress(frameIndices.length, frameIndices.length, t('animationExportEncoding', { format: formatLabel }));
                    await nextPaint(controller.signal);
                    blob = encodeAnimatedGif({
                        width: outputCanvas.width,
                        height: outputCanvas.height,
                        frames: gifFrames,
                        delayMs
                    });
                }
                const firstFrame = frames[frameIndices[0]];
                const captureOptions = mapCaptureOptions(firstFrame);
                downloadAnimation(blob, animationFilename(
                    captureOptions.sourceLabel,
                    settings.radarProduct,
                    captureOptions.frameDate,
                    format
                ));
                showToast(t('animationExportSaved', { format: format === 'mp4' ? 'MP4' : 'GIF' }), 'success', 3200);
                setAnimationExportPanel(false);
            } catch (error) {
                if (error?.name === 'AbortError') {
                    showToast(t('animationExportCancelled'), 'info', 2800);
                } else {
                    console.error('Animation export error:', error);
                    showToast(t('animationExportFailed', { message: safeText(error?.message || error, 160) }), 'error', 6500);
                }
            } finally {
                if (frameLayers[originalFrame]) showPreloadedFrame(originalFrame);
                document.body.classList.remove('animation-exporting');
                animationExportController = null;
                document.getElementById('animationExportCancel').hidden = true;
                document.getElementById('animationExportClose').disabled = false;
                document.getElementById('animationExportProgress').hidden = true;
                updateAnimationExportControls();
                if (wasPlaying) play();
            }
        }

        function initAnimationExport() {
            const button = document.getElementById('animationExportBtn');
            button.addEventListener('click', () => {
                if (stormTop3dMode) {
                    showToast(t('animationExportMapOnly'), 'info', 3200);
                    return;
                }
                if (!framesReady || sampledFrameIndices(frames.length).length < 2) {
                    showToast(t('animationExportUnavailable'), 'info', 3600);
                    return;
                }
                setAnimationExportPanel(document.getElementById('animationExportPanel').hidden);
            });
            document.getElementById('animationExportClose').addEventListener('click', () => setAnimationExportPanel(false));
            document.getElementById('animationExportFormat').addEventListener('change', updateAnimationExportControls);
            document.getElementById('animationExportDelay').addEventListener('change', updateAnimationExportControls);
            document.getElementById('animationExportStart').addEventListener('click', exportRadarAnimation);
            document.getElementById('animationExportCancel').addEventListener('click', () => {
                animationExportController?.abort(new DOMException('Export cancelled', 'AbortError'));
            });
            updateAnimationExportLanguage();
        }

        function addBookmark(name, lat, lng) {
            name = safeText(name || 'Saved location', 120);
            lat = Number(lat);
            lng = Number(lng);
            if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
                showToast('That location could not be saved', 'error');
                return false;
            }
            if (savedLocations.length >= MAX_BOOKMARKS) {
                showToast(`Saved locations are limited to ${MAX_BOOKMARKS}`, 'warn');
                return false;
            }
            // Check for duplicate (within ~0.01 degree)
            const exists = savedLocations.some(b =>
                Math.abs(b.lat - lat) < 0.01 && Math.abs(b.lng - lng) < 0.01
            );
            if (exists) {
                showToast('Location already saved', 'warn');
                return false;
            }
            const nextLocations = [...savedLocations, { name, lat, lng, id: Date.now() }];
            if (!persistBookmarks(nextLocations)) return false;
            renderBookmarks();
            showToast(`Saved: ${name}`, 'success');
            return true;
        }

        function removeBookmark(id) {
            const index = savedLocations.findIndex(bookmark => bookmark.id === id);
            if (index < 0) return false;
            const removed = savedLocations[index];
            const nextLocations = savedLocations.filter(bookmark => bookmark.id !== id);
            if (!persistBookmarks(nextLocations)) return false;
            renderBookmarks();
            updateForecastSaveState();
            showToast(`Removed: ${removed.name}`, 'info', 7000, {
                label: 'Undo',
                handler: () => {
                    const restored = [...savedLocations];
                    restored.splice(Math.min(index, restored.length), 0, removed);
                    if (!persistBookmarks(restored)) return;
                    renderBookmarks();
                    updateForecastSaveState();
                    showToast(`Restored: ${removed.name}`, 'success', 2500);
                }
            });
            return true;
        }

        function clearBookmarks() {
            if (!savedLocations.length) return;
            const removed = [...savedLocations];
            if (!persistBookmarks([])) return;
            renderBookmarks();
            updateForecastSaveState();
            showToast('Cleared saved locations', 'info', 7000, {
                label: 'Undo',
                handler: () => {
                    if (!persistBookmarks(removed)) return;
                    renderBookmarks();
                    updateForecastSaveState();
                    showToast('Saved locations restored', 'success', 2500);
                }
            });
        }

        function renderBookmarks() {
            const list = document.getElementById('bmList');
            const count = document.getElementById('bmCount');
            if (!list) return;

            count.textContent = savedLocations.length > 0 ? `${savedLocations.length} saved` : '';
            document.getElementById('bmExport').disabled = savedLocations.length === 0;
            document.getElementById('bmClear').disabled = savedLocations.length === 0;

            if (savedLocations.length === 0) {
                list.innerHTML = `<div class="bm-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                    <div>No saved locations yet</div>
                    <div style="margin-top:4px;font-size:11px;">Click the map, then tap the bookmark icon in the forecast panel to save a location</div>
                </div>`;
                return;
            }

            list.innerHTML = savedLocations.map(b => `
                <div class="bm-item" data-bm-id="${b.id}">
                    <div class="bm-item-info">
                        <div class="bm-item-name">${escapeHTML(b.name, 120)}</div>
                        <div class="bm-item-coords">${b.lat.toFixed(4)}, ${b.lng.toFixed(4)}</div>
                    </div>
                    <div class="bm-item-actions">
                        <button class="bm-action forecast" type="button" title="Open forecast" aria-label="Open forecast for ${escapeHTML(b.name, 120)}" data-action="forecast">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>
                        </button>
                        <button class="bm-action delete" type="button" title="Remove" aria-label="Remove ${escapeHTML(b.name, 120)}" data-action="delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                    </div>
                </div>
            `).join('');

            // Wire click handlers
            list.querySelectorAll('.bm-item').forEach(item => {
                const id = parseInt(item.dataset.bmId);
                const bm = savedLocations.find(b => b.id === id);
                if (!bm) return;

                // Click row = fly to location
                item.addEventListener('click', (e) => {
                    if (e.target.closest('.bm-action')) return;
                    map.flyTo([bm.lat, bm.lng], 10);
                    closeBookmarksPanel();
                });

                // Forecast button
                item.querySelector('[data-action="forecast"]')?.addEventListener('click', () => {
                    openForecast(bm.lat, bm.lng);
                    closeBookmarksPanel();
                });

                // Delete button
                item.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
                    removeBookmark(id);
                });
            });
        }

        function updateForecastSaveState() {
            const btn = document.getElementById('fcSave');
            if (!btn || !currentForecastLocation) return;
            const isSaved = savedLocations.some(b =>
                Math.abs(b.lat - currentForecastLocation.lat) < 0.01 &&
                Math.abs(b.lng - currentForecastLocation.lng) < 0.01
            );
            btn.classList.toggle('saved', isSaved);
            // Switch icon to filled bookmark if saved
            if (isSaved) {
                btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>';
                btn.title = 'Location saved';
            } else {
                btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>';
                btn.title = 'Save this location';
            }
        }

        function closeBookmarksPanel() {
            document.getElementById('bookmarksPanel')?.classList.remove('open');
            document.getElementById('bookmarksBtn')?.classList.remove('active');
        }

        function initBookmarks() {
            loadBookmarks();
            renderBookmarks();

            const btn = document.getElementById('bookmarksBtn');
            const panel = document.getElementById('bookmarksPanel');

            // Toggle dropdown
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = panel.classList.toggle('open');
                btn.classList.toggle('active', isOpen);
            });

            // Close on outside click
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.bookmarks-wrap, #bookmarksPanel')) {
                    closeBookmarksPanel();
                }
            });

            // Save from forecast panel
            document.getElementById('fcSave').addEventListener('click', () => {
                if (!currentForecastLocation) return;
                const { name, lat, lng } = currentForecastLocation;
                
                // Toggle: if already saved, remove it
                const existing = savedLocations.find(b =>
                    Math.abs(b.lat - lat) < 0.01 && Math.abs(b.lng - lng) < 0.01
                );
                if (existing) {
                    removeBookmark(existing.id);
                } else {
                    addBookmark(name, lat, lng);
                }
                updateForecastSaveState();
            });
        }

        // ==================== SIDEBAR DRAWER ====================
        function initSidebarDrawer() {
            const toggle = document.getElementById('sidebarToggle');
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            
            function openSidebar() {
                sidebar.classList.add('open');
                overlay.classList.add('open');
                toggle.classList.add('active');
                toggle.setAttribute('aria-expanded', 'true');
            }
            function closeSidebar() {
                sidebar.classList.remove('open');
                overlay.classList.remove('open');
                toggle.classList.remove('active');
                toggle.setAttribute('aria-expanded', 'false');
            }
            
            toggle.addEventListener('click', () => {
                if (sidebar.classList.contains('open')) closeSidebar();
                else openSidebar();
            });
            overlay.addEventListener('click', closeSidebar);
            document.addEventListener('keydown', event => {
                if (event.key === 'Escape' && sidebar.classList.contains('open')) closeSidebar();
            });
        }

        // ==================== QUICK ACCESS TOOLBAR ====================
        function initQuickToolbar() {
            document.querySelectorAll('.qt-btn[data-qt]').forEach(btn => {
                const layer = btn.dataset.qt;
                btn.classList.toggle('active', settings.layers[layer]);
                
                btn.addEventListener('click', () => {
                    handleLayerToggle(layer, !settings.layers[layer]);
                });
            });
        }
        
        // Update alert count badge on quick toolbar and sidebar
        function updateAlertCount(count) {
            const badge = document.getElementById('qtAlertCount');
            if (badge) badge.textContent = count > 0 ? count : '';
            
            // Also update sidebar alert chip
            const sidebarBadge = document.querySelector('[data-layer="alerts"] .alert-count');
            if (sidebarBadge) sidebarBadge.textContent = count > 0 ? count : '';
        }

        // ==================== UI INITIALIZATION ====================
        function syncRadarCapabilities() {
            const capability = RADAR_CAPABILITIES[settings.source] || RADAR_CAPABILITIES.mrms;
            if (!capability.products.includes(settings.radarProduct)) {
                settings.radarProduct = capability.products[0];
                saveSettings();
            }

            document.querySelectorAll('[data-source]').forEach(el => {
                el.classList.toggle('active', el.dataset.source === settings.source);
            });
            document.querySelectorAll('[data-product]').forEach(el => {
                const supported = capability.products.includes(el.dataset.product);
                el.classList.toggle('active', el.dataset.product === settings.radarProduct);
                el.setAttribute('aria-disabled', String(!supported));
                el.title = supported ? '' : `${capability.label} does not provide this product`;
            });
            document.querySelectorAll('[data-layer="couplets"]').forEach(el => {
                const supported = settings.source === 'level2';
                el.setAttribute('aria-disabled', String(!supported));
                el.title = supported ? '' : 'Rotation candidates require a NEXRAD Level II volume';
            });

            document.querySelectorAll('.source-capability-note').forEach(note => {
                note.textContent = `${capability.note} Coverage: ${capability.coverage.label}.`;
            });
            syncComparisonProductControl();
            syncLevel2SiteControls();
            updateCoverageStatus();
            syncAccessibleControlStates();
        }

        function selectRadarSource(source) {
            if (!RADAR_CAPABILITIES[source]) return;
            settings.source = source;
            syncRadarCapabilities();
            saveSettings();
            pause();
            updatePlaybackVisibility();
            updateLegend();
            loadRadarData();
        }

        function selectRadarProduct(product) {
            const capability = RADAR_CAPABILITIES[settings.source] || RADAR_CAPABILITIES.mrms;
            if (!capability.products.includes(product)) {
                showToast(`${capability.label} does not provide that product`, 'warn');
                return;
            }
            settings.radarProduct = product;
            saveSettings();
            syncRadarCapabilities();
            pause();
            updateLegend();
            loadRadarData();
        }

        function initUI() {
            // Panel collapsing
            document.querySelectorAll('.panel-header').forEach(header => {
                header.addEventListener('click', () => header.closest('.panel-section').classList.toggle('collapsed'));
            });

            // Layer toggles (sidebar only - scoped to .sidebar)
            document.querySelectorAll('.sidebar [data-layer]').forEach(el => {
                const layer = el.dataset.layer;
                el.classList.toggle('active', settings.layers[layer]);
                el.addEventListener('click', () => {
                    if (el.getAttribute('aria-disabled') === 'true') {
                        showToast('Rotation candidates require NEXRAD Level II', 'warn');
                        return;
                    }
                    handleLayerToggle(layer, !settings.layers[layer]);
                });
            });

            // Source tabs (sidebar only)
            document.querySelectorAll('.sidebar [data-source]').forEach(el => {
                el.classList.toggle('active', el.dataset.source === settings.source);
                el.addEventListener('click', () => selectRadarSource(el.dataset.source));
            });
            
            // Radar product tabs (sidebar only)
            document.querySelectorAll('.sidebar [data-product]').forEach(el => {
                el.classList.toggle('active', el.dataset.product === settings.radarProduct);
                el.addEventListener('click', () => selectRadarProduct(el.dataset.product));
            });
            syncRadarCapabilities();

            document.getElementById('mobileAlertView').addEventListener('click', focusMobileAlert);
            document.getElementById('mobileAlertDismiss').addEventListener('click', dismissMobileAlert);
            document.getElementById('stormTop3dBtn').addEventListener('click', toggleStormTop3d);
            document.addEventListener('keydown', event => {
                if (event.key === 'Escape' && stormTop3dMode) exitStormTop3d();
            });

            // Basemap buttons (sidebar only)
            document.querySelectorAll('.sidebar [data-basemap]').forEach(el => {
                el.classList.toggle('active', el.dataset.basemap === settings.basemap);
                el.addEventListener('click', () => setBasemap(el.dataset.basemap));
            });

            // Playback controls
            document.getElementById('playBtn').addEventListener('click', togglePlay);
            document.getElementById('stepBackBtn').addEventListener('click', () => stepFrame(-1));
            document.getElementById('stepFwdBtn').addEventListener('click', () => stepFrame(1));
            document.getElementById('speedBtn').addEventListener('click', cycleSpeed);
            document.getElementById('loopBtn').addEventListener('click', () => {
                settings.loop = !settings.loop;
                document.getElementById('loopBtn').classList.toggle('active', settings.loop);
                document.getElementById('loopToggle')?.classList.toggle('on', settings.loop);
                saveSettings();
                applyFramePreloadWindow(currentFrame);
            });
            document.getElementById('loopBtn').classList.toggle('active', settings.loop);

            // Timeline scrubbing - click and drag support
            const timeline = document.getElementById('timeline');
            let isDraggingTimeline = false;
            
            function scrubToPosition(clientX) {
                if (!framesReady || frames.length < 2) return;
                const rect = timeline.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
                const idx = Math.min(Math.floor(pct * frames.length), frames.length - 1);
                showPreloadedFrame(idx);
            }
            
            // Mouse events
            timeline.addEventListener('mousedown', (e) => {
                e.preventDefault();
                isDraggingTimeline = true;
                pause();
                scrubToPosition(e.clientX);
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!isDraggingTimeline) return;
                e.preventDefault();
                scrubToPosition(e.clientX);
            });
            
            document.addEventListener('mouseup', () => {
                isDraggingTimeline = false;
            });
            
            // Touch events
            timeline.addEventListener('touchstart', (e) => {
                isDraggingTimeline = true;
                pause();
                scrubToPosition(e.touches[0].clientX);
            }, { passive: true });
            
            document.addEventListener('touchmove', (e) => {
                if (!isDraggingTimeline) return;
                scrubToPosition(e.touches[0].clientX);
            }, { passive: true });
            
            document.addEventListener('touchend', () => {
                isDraggingTimeline = false;
            });

            timeline.addEventListener('keydown', event => {
                if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                    event.preventDefault();
                    stepFrame(-1);
                } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    stepFrame(1);
                } else if (event.key === 'Home' && frames.length) {
                    event.preventDefault();
                    showPreloadedFrame(0);
                } else if (event.key === 'End' && frames.length) {
                    event.preventDefault();
                    showPreloadedFrame(frames.length - 1);
                }
            });

            // Header buttons
            document.getElementById('themeBtn').addEventListener('click', () => {
                settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
                applyTheme();
                saveSettings();
                if (settings.layers.labels) toggleLabelsLayer(true);
            });

            document.getElementById('snapshotBtn').addEventListener('click', exportMapSnapshot);

            document.getElementById('refreshBtn').addEventListener('click', async () => {
                if (replayMode) {
                    showToast('Exit historical replay before refreshing live data', 'info', 3000);
                    return;
                }
                showToast('Refreshing all data...', 'info', 2000);
                await loadRadarData();
                if (settings.layers.alerts) loadAlerts();
                if (settings.layers.spcOutlook) loadSPCOutlook();
                if (settings.layers.stormReports) loadStormReports();
                if (settings.layers.stormTracks) loadStormTracks();
                else if (stormTop3dMode) loadStormCellsFor3d(true).then(renderStormTop3d);
                if (settings.layers.hailMesh) loadHailMesh();
                if (settings.layers.satellite) loadSatelliteLayer('visible');
                if (settings.layers.satelliteIR) loadSatelliteLayer('ir');
                if (settings.layers.satelliteWV) loadSatelliteLayer('wv');
                if (settings.layers.satelliteGeoColor) loadSatelliteLayer('geocolor');
                if (settings.layers.satelliteSandwich) loadSatelliteLayer('sandwich');
                if (settings.layers.satelliteMesoscale) loadSatelliteLayer('mesoscale');
                if (settings.layers.spcWatches) loadSPCWatches();
                if (settings.layers.spcMCD) loadSPCMCD();
                if (settings.layers.tropical) loadTropical();
                if (settings.layers.sigmets) loadSIGMETs();
                if (settings.layers.highways) loadHighwayEvents();
            });

            document.getElementById('locBtn').addEventListener('click', goToLocation);
            document.getElementById('bmExport').addEventListener('click', exportBookmarks);
            document.getElementById('bmClear').addEventListener('click', clearBookmarks);
            const retryRadarLoad = async () => {
                showLoadProgress();
                await loadRadarData();
            };
            document.getElementById('loadProgressRetry').addEventListener('click', retryRadarLoad);
            document.getElementById('startupRetry').addEventListener('click', retryRadarLoad);
            
            document.getElementById('timestampTz').addEventListener('click', () => {
                settings.useLocalTime = !settings.useLocalTime;
                saveSettings();
                updateTimestamp();
            });

            // Settings panel
            initSettingsPanel();

            // Search
            initSearch();

            // Mobile
            initMobileSheet();
        }

        function updateLocalOverlayControls(statusMessage = '') {
            const toggle = document.getElementById('localOverlayToggleBtn');
            const remove = document.getElementById('localOverlayRemoveBtn');
            const status = document.getElementById('localOverlayStatus');
            if (!toggle || !remove || !status) return;
            const loaded = Boolean(localOverlayLayer);
            toggle.disabled = !loaded;
            remove.disabled = !loaded;
            toggle.textContent = localOverlayVisible ? t('localOverlayHide') : t('localOverlayShow');
            status.textContent = statusMessage || (loaded
                ? t('localOverlayLoaded', { count: localOverlayFeatureCount, name: localOverlayName })
                : t('localOverlayNone'));
        }

        function localOverlayPopup(feature) {
            const container = document.createElement('div');
            const entries = Object.entries(feature.properties || {}).filter(([, value]) =>
                ['string', 'number', 'boolean'].includes(typeof value) && String(value).trim()
            ).slice(0, 8);
            const title = document.createElement('strong');
            const named = entries.find(([key]) => key.toLowerCase() === 'name');
            title.textContent = safeText(named?.[1] || localOverlayName || 'Local overlay', 160);
            container.append(title);
            entries.filter(([key]) => key.toLowerCase() !== 'name').forEach(([key, value]) => {
                const row = document.createElement('div');
                row.textContent = `${safeText(key, 80)}: ${safeText(value, 300)}`;
                container.append(row);
            });
            return container;
        }

        function renderLocalOverlay(payload, fileName) {
            if (localOverlayLayer) {
                map.removeLayer(localOverlayLayer);
                localOverlayLayer.off();
            }
            const renderer = L.svg({ padding: 0.5 });
            localOverlayName = safeText(fileName, 160);
            localOverlayFeatureCount = payload.features.length;
            localOverlayLayer = L.geoJSON(payload, {
                renderer,
                style: {
                    color: '#f59e0b',
                    weight: 3,
                    opacity: 0.95,
                    fillColor: '#f59e0b',
                    fillOpacity: 0.16
                },
                pointToLayer: (_feature, latlng) => L.circleMarker(latlng, {
                    renderer,
                    radius: 7,
                    color: '#fff',
                    weight: 2,
                    fillColor: '#f59e0b',
                    fillOpacity: 0.9
                }),
                onEachFeature: (feature, layer) => layer.bindPopup(localOverlayPopup(feature))
            }).addTo(map);
            localOverlayVisible = true;
            map.getContainer().dataset.localOverlayFeatureCount = String(localOverlayFeatureCount);
            map.getContainer().dataset.localOverlayVisible = 'true';
            const bounds = localOverlayLayer.getBounds();
            if (bounds.isValid()) map.fitBounds(bounds.pad(0.1), { maxZoom: 12 });
            updateLocalOverlayControls();
        }

        function toggleLocalOverlay() {
            if (!localOverlayLayer) return;
            if (localOverlayVisible) map.removeLayer(localOverlayLayer);
            else localOverlayLayer.addTo(map);
            localOverlayVisible = !localOverlayVisible;
            map.getContainer().dataset.localOverlayVisible = String(localOverlayVisible);
            updateLocalOverlayControls(localOverlayVisible ? t('localOverlayShown') : t('localOverlayHidden'));
        }

        function removeLocalOverlay() {
            if (localOverlayLayer) {
                map.removeLayer(localOverlayLayer);
                localOverlayLayer.off();
            }
            localOverlayLayer = null;
            localOverlayVisible = false;
            localOverlayName = '';
            localOverlayFeatureCount = 0;
            map.getContainer().dataset.localOverlayFeatureCount = '0';
            map.getContainer().dataset.localOverlayVisible = 'false';
            updateLocalOverlayControls(t('localOverlayRemoved'));
        }

        function initLocalOverlayImport() {
            const input = document.getElementById('localOverlayFile');
            document.getElementById('localOverlayImportBtn').addEventListener('click', () => input.click());
            document.getElementById('localOverlayToggleBtn').addEventListener('click', toggleLocalOverlay);
            document.getElementById('localOverlayRemoveBtn').addEventListener('click', removeLocalOverlay);
            input.addEventListener('change', async event => {
                const file = event.target.files[0];
                if (!file) return;
                try {
                    if (file.size > LOCAL_OVERLAY_LIMITS.bytes) {
                        throw new Error(`Overlay exceeds ${LOCAL_OVERLAY_LIMITS.bytes} bytes`);
                    }
                    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
                    if (!['.json', '.geojson', '.kml'].includes(extension)) {
                        throw new Error('Choose a GeoJSON or KML file');
                    }
                    const payload = parseLocalOverlay(
                        await file.text(),
                        extension,
                        () => new DOMParser()
                    );
                    renderLocalOverlay(payload, file.name);
                    showToast(t('localOverlayLoaded', {
                        count: payload.features.length,
                        name: safeText(file.name, 160)
                    }), 'success', 4000);
                } catch (error) {
                    const message = t('localOverlayImportFailed', { message: safeText(error.message, 160) });
                    updateLocalOverlayControls(message);
                    showToast(message, 'error', 6000);
                } finally {
                    input.value = '';
                }
            });
            updateLocalOverlayControls();
        }

        function initSettingsPanel() {
            const overlay = document.getElementById('settingsOverlay');
            const panel = document.getElementById('settingsPanel');
            
            const opener = document.getElementById('settingsBtn');
            opener.addEventListener('click', () => {
                overlay.classList.add('open');
                panel.classList.add('open');
                setAccessibleDialog(panel, overlay, true, opener, closeSettings);
            });
            
            const closeSettings = () => {
                overlay.classList.remove('open');
                panel.classList.remove('open');
                setAccessibleDialog(panel, overlay, false);
            };
            
            overlay.addEventListener('click', closeSettings);
            document.getElementById('settingsClose').addEventListener('click', closeSettings);

            const settingsTabs = [...document.querySelectorAll('#settingsTabs .settings-tab')];
            initializeTabList(
                document.getElementById('settingsTabs'),
                settingsTabs,
                tab => document.getElementById(tab.getAttribute('aria-controls')),
                tab => {
                    if (tab.dataset.tab === 'diagnostics') renderDiagnostics();
                }
            );

            document.getElementById('copyDiagnosticsBtn').addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(JSON.stringify(diagnosticsSnapshot(), null, 2));
                    showToast('Redacted diagnostics copied', 'success', 2500);
                } catch {
                    showToast('Clipboard access was denied; use a secure browser context', 'error', 4500);
                }
            });
            document.getElementById('retryDiagnosticsBtn').addEventListener('click', () => {
                const status = document.getElementById('dataStatus');
                if (diagnosticsState.provider.retryable) status.click();
                else loadRadarData();
            });

            // Display settings
            const themeToggle = document.getElementById('themeToggle');
            themeToggle.classList.toggle('on', settings.theme === 'dark');
            themeToggle.addEventListener('click', () => {
                settings.theme = themeToggle.classList.toggle('on') ? 'dark' : 'light';
                applyTheme();
                saveSettings();
                if (settings.layers.labels) toggleLabelsLayer(true);
            });

            const legendToggle = document.getElementById('legendToggle');
            legendToggle.classList.toggle('on', settings.showLegend);
            legendToggle.addEventListener('click', () => {
                settings.showLegend = legendToggle.classList.toggle('on');
                // Empty string drops the inline declaration so the stylesheet's flex layout applies.
                document.getElementById('legend').style.display = settings.showLegend ? '' : 'none';
                saveSettings();
            });

            const reducedDataToggle = document.getElementById('reducedDataToggle');
            reducedDataToggle.classList.toggle('on', settings.reducedData);
            reducedDataToggle.addEventListener('click', () => {
                settings.reducedData = reducedDataToggle.classList.toggle('on');
                updatePreloadWindowControl();
                if (settings.reducedData) {
                    REDUCED_DATA_OPTIONAL_LAYERS.forEach(layer => {
                        if (settings.layers[layer]) handleLayerToggle(layer, false);
                    });
                    showToast(t('reducedDataEnabled'), 'info', 5000);
                }
                saveSettings();
                loadRadarData();
            });
            // Empty string drops the inline declaration so the stylesheet's flex layout applies.
                document.getElementById('legend').style.display = settings.showLegend ? '' : 'none';

            const languageSelect = document.getElementById('languageSelect');
            languageSelect.value = settings.language;
            languageSelect.addEventListener('change', () => {
                settings.language = languageSelect.value;
                saveSettings();
                applyLanguage();
                updateMobileAlertBanner(currentAlertFeatures);
                if (settings.layers.highways) loadHighwayEvents();
                if (stormTop3dMode) renderStormTop3d();
                showToast(t('languageUpdated'), 'success', 2200);
                if (layerRefs.hailMesh) showMeshLegend();
                if (currentForecastLocation) openForecast(currentForecastLocation.lat, currentForecastLocation.lng);
            });

            const unitsSelect = document.getElementById('unitsSelect');
            unitsSelect.value = settings.units;
            unitsSelect.addEventListener('change', () => {
                settings.units = unitsSelect.value;
                saveSettings();
                updateLegend();
                showToast(t('unitsUpdated'), 'success', 2200);
                if (settings.layers.surfaceObs) loadSurfaceObs();
                if (settings.layers.riverGauges) loadRiverGauges();
                if (layerRefs.couplets) renderLevel2Couplets();
                if (layerRefs.hailMesh) showMeshLegend();
                if (stormTop3dMode) renderStormTop3d();
                if (currentForecastLocation) openForecast(currentForecastLocation.lat, currentForecastLocation.lng);
            });

            // Border sliders
            initSlider('stateBorderSlider', 'stateBorderValue', 'stateBorderWidth', 'px', () => {
                if (layerRefs.states) layerRefs.states.setStyle({ weight: settings.stateBorderWidth });
            });
            initSlider('countyBorderSlider', 'countyBorderValue', 'countyBorderWidth', 'px', () => {
                if (layerRefs.counties) layerRefs.counties.setStyle({ weight: settings.countyBorderWidth });
            });
            initSlider('borderOpacitySlider', 'borderOpacityValue', 'borderOpacity', '%', () => {
                if (layerRefs.states) layerRefs.states.setStyle({ opacity: settings.borderOpacity });
                if (layerRefs.counties) layerRefs.counties.setStyle({ opacity: settings.borderOpacity * 0.7 });
                applyOverlayOpacity('states');
                applyOverlayOpacity('counties');
            }, true);
            initOverlayOpacityControls();

            // Radar settings
            initSlider('opacitySlider', 'opacityValue', 'opacity', '%', () => {
                // Update RainViewer layer
                if (frameLayers[currentFrame]) {
                    const zoom = map.getZoom();
                    const isHighZoom = zoom >= radarSystem.MRMS_PRIMARY_ZOOM && radarSystem.isUS;
                    frameLayers[currentFrame].setOpacity(isHighZoom ? settings.opacity * 0.5 : settings.opacity);
                }
                // Update MRMS layer
                if (radarSystem.mrmsBase) {
                    radarSystem.mrmsBase.setOpacity(settings.opacity);
                }
                compareRadarLayer?.setOpacity?.(settings.opacity);
                pipRadarLayer?.setOpacity?.(settings.opacity);
            }, true);
            initSlider('delaySlider', 'delayValue', 'delay', 'ms');
            initSlider('preloadWindowSlider', 'preloadWindowValue', 'preloadWindow', '', () => {
                settings.preloadWindow = normalizePreloadWindow(settings.preloadWindow);
                updatePreloadWindowControl();
                applyFramePreloadWindow(currentFrame);
                renderDiagnostics();
            });
            updatePreloadWindowControl();

            const smoothToggle = document.getElementById('smoothToggle');
            smoothToggle.classList.toggle('on', settings.smooth === 1);
            smoothToggle.addEventListener('click', () => {
                settings.smooth = smoothToggle.classList.toggle('on') ? 1 : 0;
                saveSettings();
            });

            const snowToggle = document.getElementById('snowToggle');
            snowToggle.classList.toggle('on', settings.snowColor === 1);
            snowToggle.addEventListener('click', () => {
                settings.snowColor = snowToggle.classList.toggle('on') ? 1 : 0;
                saveSettings();
            });

            const highResToggle = document.getElementById('highResToggle');
            highResToggle.classList.toggle('on', settings.highResMode);
            highResToggle.addEventListener('click', () => {
                settings.highResMode = highResToggle.classList.toggle('on');
                saveSettings();
                // Immediately apply/remove high-res mode
                const zoom = map.getZoom();
                updateHybridRadar(zoom);
                updateZoomIndicator(zoom);
            });

            const autoRefreshToggle = document.getElementById('autoRefreshToggle');
            autoRefreshToggle.classList.toggle('on', settings.autoRefresh);
            autoRefreshToggle.addEventListener('click', () => {
                settings.autoRefresh = autoRefreshToggle.classList.toggle('on');
                saveSettings();
            });

            const loopToggle = document.getElementById('loopToggle');
            loopToggle.classList.toggle('on', settings.loop);
            loopToggle.addEventListener('click', () => {
                settings.loop = loopToggle.classList.toggle('on');
                document.getElementById('loopBtn').classList.toggle('active', settings.loop);
                saveSettings();
                applyFramePreloadWindow(currentFrame);
            });

            const replayEndDefault = new Date(Date.now() - 10 * 60 * 1000);
            const replayStartDefault = new Date(replayEndDefault.getTime() - 60 * 60 * 1000);
            document.getElementById('replayStartInput').value = localDateTimeInputValue(replayStartDefault);
            document.getElementById('replayEndInput').value = localDateTimeInputValue(replayEndDefault);
            document.getElementById('startReplayBtn').addEventListener('click', startHistoricalReplay);
            document.getElementById('exitReplayBtn').addEventListener('click', () => exitHistoricalReplay());
            setReplayControlState(localizedStaticText('Live mode'));

            // Visual palettes
            document.querySelectorAll('#colorSchemes [data-visual-palette]').forEach(button => {
                button.addEventListener('click', async () => {
                    const nextPalette = normalizeVisualPalette(button.dataset.visualPalette, settings.visualPalette);
                    if (nextPalette === settings.visualPalette) return;
                    settings.visualPalette = nextPalette;
                    saveSettings();
                    await refreshVisualPaletteLayers();
                    showToast(t('visualPaletteUpdated', {
                        name: localizedStaticText(visualPaletteLabel(nextPalette))
                    }), 'success', 2600);
                });
            });
            syncVisualPaletteControls();

            // Alert audio
            const alertAudioToggle = document.getElementById('alertAudioToggle');
            const alertSeveritySelect = document.getElementById('alertSeveritySelect');
            const alertTypeSelect = document.getElementById('alertTypeSelect');
            const alertDistanceSelect = document.getElementById('alertDistanceSelect');
            const alertAreaSelect = document.getElementById('alertAreaSelect');
            const syncAlertAreaControls = () => {
                const usesGeofences = alertAreaSelect.value === 'geofences';
                alertDistanceSelect.disabled = usesGeofences;
                alertDistanceSelect.closest('.setting-row').style.opacity = usesGeofences ? '0.55' : '';
            };
            alertAudioToggle.classList.toggle('on', settings.alertAudioEnabled);
            alertSeveritySelect.value = settings.alertAudioSeverity;
            alertTypeSelect.value = settings.alertAudioType;
            alertDistanceSelect.value = String(settings.alertAudioDistanceMiles);
            alertAreaSelect.value = settings.alertAudioArea;
            syncAlertAreaControls();
            renderGeofenceList();
            alertAudioToggle.addEventListener('click', async () => {
                settings.alertAudioEnabled = alertAudioToggle.classList.toggle('on');
                saveSettings();
                if (settings.alertAudioEnabled) {
                    const played = await playAlertTone('test');
                    showToast(played ? t('alertAudioReady') : t('alertAudioUnavailable'), played ? 'success' : 'error', 3000);
                }
            });
            alertSeveritySelect.addEventListener('change', () => {
                settings.alertAudioSeverity = alertSeveritySelect.value;
                saveSettings();
            });
            alertTypeSelect.addEventListener('change', () => {
                settings.alertAudioType = alertTypeSelect.value;
                saveSettings();
            });
            alertDistanceSelect.addEventListener('change', () => {
                settings.alertAudioDistanceMiles = Number(alertDistanceSelect.value);
                saveSettings();
            });
            alertAreaSelect.addEventListener('change', () => {
                settings.alertAudioArea = alertAreaSelect.value;
                syncAlertAreaControls();
                saveSettings();
            });
            document.getElementById('testAlertSoundBtn').addEventListener('click', async () => {
                const played = await playAlertTone('test');
                showToast(played ? t('alertAudioReady') : t('alertAudioUnavailable'), played ? 'success' : 'error', 3000);
            });
            document.getElementById('addGeofenceBtn').addEventListener('click', addGeofenceAtMapCenter);

            // API keys
            document.getElementById('owmKeyInput').value = settings.owmKey;
            
            document.getElementById('saveKeysBtn').addEventListener('click', () => {
                const nextKey = document.getElementById('owmKeyInput').value.trim();
                if (nextKey !== settings.owmKey) validatedOWMKey = '';
                settings.owmKey = nextKey;
                if (saveSettings()) showToast(t('apiKeysSaved'), 'success', 2500);
            });

            // Import/Export
            document.getElementById('exportBtn').addEventListener('click', () => {
                const exportSettings = validateSettingsPayload(settings);
                delete exportSettings.owmKey;
                const payload = {
                    schemaVersion: SETTINGS_SCHEMA_VERSION,
                    exportedAt: new Date().toISOString(),
                    secretsOmitted: ['owmKey'],
                    settings: exportSettings
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'stormview-settings.json';
                a.click();
                setTimeout(() => URL.revokeObjectURL(a.href), 0);
                showToast(t('settingsExported'), 'success', 2500);
            });
            
            document.getElementById('importBtn').addEventListener('click', () => {
                document.getElementById('importFile').click();
            });
            
            document.getElementById('importFile').addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (file.size > MAX_SETTINGS_BYTES) {
                    showToast('Settings file is too large', 'error');
                    e.target.value = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const raw = typeof ev.target.result === 'string' ? ev.target.result : '';
                        if (new Blob([raw]).size > MAX_SETTINGS_BYTES) throw new Error('Settings file is too large');
                        Object.assign(settings, migrateSettingsPayload(JSON.parse(raw)));
                        if (!saveSettings()) throw new Error('Browser storage rejected the imported settings');
                        showToast('Settings imported', 'success');
                        setTimeout(() => location.reload(), 500);
                    } catch(err) {
                        console.error('Import error:', err);
                        showToast(`Import failed: ${safeText(err.message, 120)}`, 'error', 6000);
                    }
                };
                reader.onerror = () => showToast('Settings file could not be read', 'error');
                reader.readAsText(file);
                e.target.value = '';
            });
            initLocalOverlayImport();
        }

        function initSlider(sliderId, valueId, settingKey, unit, callback, isPercent = false) {
            const slider = document.getElementById(sliderId);
            const valueEl = document.getElementById(valueId);
            if (!slider || !valueEl) return;
            
            slider.value = settings[settingKey];
            valueEl.textContent = isPercent ? Math.round(settings[settingKey] * 100) + unit : settings[settingKey] + unit;
            
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                valueEl.textContent = isPercent ? Math.round(val * 100) + unit : val + unit;
                settings[settingKey] = val;
                saveSettings();
                if (callback) callback();
            });
        }

        function initOverlayOpacityControls() {
            const select = document.getElementById('overlayOpacityLayerSelect');
            const slider = document.getElementById('overlayOpacitySlider');
            const value = document.getElementById('overlayOpacityValue');
            if (!select || !slider || !value) return;

            OVERLAY_OPACITY_LAYER_IDS.forEach(id => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = getLayerName(id);
                select.append(option);
            });

            const syncControl = () => {
                const opacity = settings.layerOpacity[select.value] ?? 1;
                slider.value = String(opacity);
                value.textContent = `${Math.round(opacity * 100)}%`;
                slider.setAttribute('aria-label', `${getLayerName(select.value)} visibility`);
            };

            select.addEventListener('change', syncControl);
            slider.addEventListener('input', () => {
                const opacity = Number(slider.value);
                settings.layerOpacity[select.value] = opacity;
                value.textContent = `${Math.round(opacity * 100)}%`;
                applyOverlayOpacity(select.value);
                saveSettings();
            });
            syncControl();
        }

        function initSearch() {
            const input = document.getElementById('searchInput');
            const results = document.getElementById('searchResults');
            const clear = document.getElementById('searchClear');
            let activeResultIndex = -1;

            const setSearchOpen = open => {
                results.classList.toggle('open', open);
                input.setAttribute('aria-expanded', String(open));
                if (!open) {
                    activeResultIndex = -1;
                    input.removeAttribute('aria-activedescendant');
                }
            };

            const focusResult = index => {
                const items = [...results.querySelectorAll('.search-item[data-lat]')];
                if (!items.length) return;
                activeResultIndex = (index + items.length) % items.length;
                items.forEach((item, itemIndex) => item.setAttribute('aria-selected', String(itemIndex === activeResultIndex)));
                input.setAttribute('aria-activedescendant', items[activeResultIndex].id);
                items[activeResultIndex].scrollIntoView({ block: 'nearest' });
            };

            input.addEventListener('input', () => {
                const q = input.value.trim();
                clear.classList.toggle('show', q.length > 0);
                
                clearTimeout(searchTimeout);
                searchAbortController?.abort(new DOMException('Search superseded', 'AbortError'));
                searchAbortController = null;
                if (q.length < 2) {
                    setSearchOpen(false);
                    return;
                }
                
                searchTimeout = setTimeout(async () => {
                    const controller = new AbortController();
                    searchAbortController = controller;
                    try {
                        const resp = await searchNominatim(q, controller.signal);
                        const data = await resp.json();
                        if (controller.signal.aborted || input.value.trim() !== q) return;

                        results.replaceChildren();
                        const validResults = (Array.isArray(data) ? data : []).slice(0, 5).flatMap(result => {
                            const lat = Number(result?.lat);
                            const lon = Number(result?.lon);
                            if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) return [];
                            return [{ lat, lon, displayName: safeText(result.display_name || 'Unnamed location', 300) }];
                        });

                        if (validResults.length === 0) {
                            const item = document.createElement('div');
                            item.className = 'search-item';
                            item.setAttribute('role', 'option');
                            item.setAttribute('aria-disabled', 'true');
                            const name = document.createElement('div');
                            name.className = 'search-item-name';
                            name.textContent = 'No results found';
                            item.appendChild(name);
                            results.appendChild(item);
                        } else {
                            validResults.forEach((result, index) => {
                                const parts = result.displayName.split(',');
                                const item = document.createElement('div');
                                item.className = 'search-item';
                                item.id = `search-option-${index}`;
                                item.setAttribute('role', 'option');
                                item.setAttribute('aria-selected', 'false');
                                item.dataset.lat = String(result.lat);
                                item.dataset.lon = String(result.lon);
                                const name = document.createElement('div');
                                name.className = 'search-item-name';
                                name.textContent = parts[0] || 'Unnamed location';
                                const detail = document.createElement('div');
                                detail.className = 'search-item-detail';
                                detail.textContent = parts.slice(1, 3).join(',');
                                item.append(name, detail);
                                results.appendChild(item);
                            });
                        }
                        
                        setSearchOpen(true);
                        
                        results.querySelectorAll('.search-item[data-lat]').forEach(item => {
                            item.addEventListener('click', () => {
                                const lat = parseFloat(item.dataset.lat);
                                const lon = parseFloat(item.dataset.lon);
                                map.flyTo([lat, lon], 10);
                                primaryLocationName = shortLocationName(
                                    `${item.querySelector('.search-item-name')?.textContent || ''}, ${item.querySelector('.search-item-detail')?.textContent || ''}`,
                                    localizedStaticText('Primary view')
                                );
                                updateSplitViewLabels();
                                setSearchOpen(false);
                                input.value = '';
                                clear.classList.remove('show');
                            });
                        });
                    } catch(e) {
                        if (e?.name === 'AbortError') return;
                        console.error('Search error:', e);
                    } finally {
                        if (searchAbortController === controller) searchAbortController = null;
                    }
                }, 300);
            });

            clear.addEventListener('click', () => {
                clearTimeout(searchTimeout);
                searchAbortController?.abort(new DOMException('Search cleared', 'AbortError'));
                searchAbortController = null;
                input.value = '';
                clear.classList.remove('show');
                setSearchOpen(false);
                input.focus();
            });

            input.addEventListener('keydown', event => {
                const itemCount = results.querySelectorAll('.search-item[data-lat]').length;
                if (event.key === 'ArrowDown' && itemCount) {
                    event.preventDefault();
                    focusResult(activeResultIndex + 1);
                } else if (event.key === 'ArrowUp' && itemCount) {
                    event.preventDefault();
                    focusResult(activeResultIndex - 1);
                } else if (event.key === 'Enter' && activeResultIndex >= 0) {
                    event.preventDefault();
                    results.querySelectorAll('.search-item[data-lat]')[activeResultIndex]?.click();
                } else if (event.key === 'Escape') {
                    setSearchOpen(false);
                }
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.search-box')) {
                    setSearchOpen(false);
                }
            });
        }

        function initComparisonSearch() {
            const input = document.getElementById('compareSearchInput');
            const results = document.getElementById('compareSearchResults');
            let activeResultIndex = -1;

            const setOpen = open => {
                results.classList.toggle('open', open);
                input.setAttribute('aria-expanded', String(open));
                if (!open) {
                    activeResultIndex = -1;
                    input.removeAttribute('aria-activedescendant');
                }
            };
            const focusResult = index => {
                const items = [...results.querySelectorAll('.compare-search-result')];
                if (!items.length) return;
                activeResultIndex = (index + items.length) % items.length;
                items.forEach((item, itemIndex) => item.setAttribute('aria-selected', String(itemIndex === activeResultIndex)));
                input.setAttribute('aria-activedescendant', items[activeResultIndex].id);
                items[activeResultIndex].focus();
            };
            const chooseResult = result => {
                const name = shortLocationName(result.displayName);
                settings.compareLocation = normalizeComparisonLocation({
                    latitude: result.latitude,
                    longitude: result.longitude,
                    zoom: 10,
                    name
                });
                compareMap.flyTo([result.latitude, result.longitude], 10);
                input.value = '';
                setOpen(false);
                updateSplitViewLabels();
                saveSettings();
            };

            input.addEventListener('input', () => {
                const query = input.value.trim();
                clearTimeout(compareSearchTimeout);
                compareSearchAbortController?.abort(new DOMException('Comparison search superseded', 'AbortError'));
                compareSearchAbortController = null;
                if (query.length < 2) {
                    setOpen(false);
                    return;
                }
                compareSearchTimeout = setTimeout(async () => {
                    const controller = new AbortController();
                    compareSearchAbortController = controller;
                    try {
                        const response = await searchNominatim(query, controller.signal);
                        const payload = await response.json();
                        if (controller.signal.aborted || input.value.trim() !== query) return;
                        const locations = normalizeLocationResults(payload);
                        results.replaceChildren();
                        if (!locations.length) {
                            const empty = document.createElement('div');
                            empty.className = 'compare-search-result';
                            empty.setAttribute('role', 'option');
                            empty.setAttribute('aria-disabled', 'true');
                            empty.textContent = t('compareSearchEmpty');
                            results.append(empty);
                        } else {
                            locations.forEach((location, index) => {
                                const button = document.createElement('button');
                                button.type = 'button';
                                button.className = 'compare-search-result';
                                button.id = `compare-search-option-${index}`;
                                button.setAttribute('role', 'option');
                                button.setAttribute('aria-selected', 'false');
                                button.textContent = location.displayName;
                                button.addEventListener('click', () => chooseResult(location));
                                results.append(button);
                            });
                        }
                        setOpen(true);
                    } catch (error) {
                        if (error?.name !== 'AbortError') console.error('Comparison search error:', error);
                    } finally {
                        if (compareSearchAbortController === controller) compareSearchAbortController = null;
                    }
                }, 300);
            });
            input.addEventListener('keydown', event => {
                const count = results.querySelectorAll('.compare-search-result:not([aria-disabled="true"])').length;
                if (event.key === 'ArrowDown' && count) {
                    event.preventDefault();
                    focusResult(activeResultIndex + 1);
                } else if (event.key === 'ArrowUp' && count) {
                    event.preventDefault();
                    focusResult(activeResultIndex - 1);
                } else if (event.key === 'Escape') {
                    setOpen(false);
                }
            });
            results.addEventListener('keydown', event => {
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    focusResult(activeResultIndex + (event.key === 'ArrowDown' ? 1 : -1));
                } else if (event.key === 'Escape') {
                    input.focus();
                    setOpen(false);
                }
            });
            document.addEventListener('click', event => {
                if (!event.target.closest('.compare-search-wrap')) setOpen(false);
            });
        }

        function initSplitView() {
            document.getElementById('splitViewBtn').addEventListener('click', () => setSplitView(!settings.splitView));
            document.getElementById('compareMapClose').addEventListener('click', () => setSplitView(false));
            map.on('moveend zoomend', syncComparisonViewToPrimary);
            publishPrimaryView();
            initComparisonSearch();
            // The banner wraps differently at other widths, so the tip clearance
            // has to be recomputed when the viewport changes.
            window.addEventListener('resize', publishBannerClearance);
            window.addEventListener('resize', () => {
                if (!settings.splitView) return;
                map.invalidateSize();
                compareMap?.invalidateSize();
            });
            document.addEventListener('keydown', event => {
                if (event.key === 'Escape' && settings.splitView && document.activeElement?.closest('#compareMapPane')) {
                    setSplitView(false);
                    document.getElementById('splitViewBtn').focus();
                }
            });
            setSplitView(settings.splitView, { persist: false });
        }

        function initPipRadar() {
            document.getElementById('pipRadarBtn').addEventListener('click', () => setPipRadar(!settings.pipRadar));
            document.getElementById('pipRadarClose').addEventListener('click', () => {
                setPipRadar(false);
                document.getElementById('pipRadarBtn').focus();
            });
            document.getElementById('pipRadarRecenter').addEventListener('click', () => syncPipToPrimary(true));
            window.addEventListener('resize', () => {
                if (!settings.pipRadar || !pipMap) return;
                pipMap.invalidateSize();
                syncPipToPrimary();
            });
            document.addEventListener('keydown', event => {
                if (event.key !== 'Escape' || !settings.pipRadar || !document.activeElement?.closest('#pipRadarPanel')) return;
                setPipRadar(false);
                document.getElementById('pipRadarBtn').focus();
            });
            if (settings.pipRadar) setPipRadar(true, { persist: false });
            else {
                updatePipRadarLabel();
                updatePipFollowState();
            }
        }

        function initMobileSheet() {
            const fab = document.getElementById('mobileFab');
            const overlay = document.getElementById('sheetOverlay');
            const sheet = document.getElementById('bottomSheet');
            const layersTab = document.getElementById('mobileLayersTab');
            const sourcesTab = document.getElementById('mobileSourcesTab');
            const mapTab = document.getElementById('mobileMapTab');
            
            // Distribute sidebar panels into mobile tabs
            const sidebar = document.getElementById('sidebar');
            const panels = sidebar.querySelectorAll('.panel-section');
            
            panels.forEach(panel => {
                const title = panel.querySelector('.panel-title')?.textContent?.trim() || '';
                const clone = panel.cloneNode(true);
                
                if (title.includes('Radar Source') || title.includes('Radar Products')) {
                    sourcesTab.appendChild(clone);
                } else if (title.includes('Map Overlays') || title.includes('Base Map') || title.includes('Model Data')) {
                    mapTab.appendChild(clone);
                } else {
                    // Weather Layers, SPC, Satellite, Aviation, etc
                    layersTab.appendChild(clone);
                }
            });
            syncLevel2SiteControls();

            const sheetTabs = [...document.querySelectorAll('#sheetTabs .sheet-tab')];
            initializeTabList(
                document.getElementById('sheetTabs'),
                sheetTabs,
                tab => document.getElementById(tab.getAttribute('aria-controls'))
            );

            // Wire up all interactive elements in the sheet
            const content = document.getElementById('mobileContent');

            content.querySelectorAll('[data-layer]').forEach(el => {
                const layer = el.dataset.layer;
                el.classList.toggle('active', settings.layers[layer]);
                el.addEventListener('click', () => {
                    if (el.getAttribute('aria-disabled') === 'true') {
                        showToast('Rotation candidates require NEXRAD Level II', 'warn');
                        return;
                    }
                    handleLayerToggle(layer, !settings.layers[layer]);
                });
            });

            content.querySelectorAll('[data-source]').forEach(el => {
                el.classList.toggle('active', el.dataset.source === settings.source);
                el.addEventListener('click', () => selectRadarSource(el.dataset.source));
            });

            content.querySelectorAll('[data-basemap]').forEach(el => {
                el.classList.toggle('active', el.dataset.basemap === settings.basemap);
                el.addEventListener('click', () => setBasemap(el.dataset.basemap));
            });
            
            content.querySelectorAll('[data-product]').forEach(el => {
                el.classList.toggle('active', el.dataset.product === settings.radarProduct);
                el.addEventListener('click', () => selectRadarProduct(el.dataset.product));
            });
            
            // Panel collapsing in mobile
            content.querySelectorAll('.panel-header').forEach(header => {
                header.addEventListener('click', () => header.closest('.panel-section').classList.toggle('collapsed'));
            });

            fab.addEventListener('click', () => {
                overlay.classList.add('open');
                sheet.classList.add('open');
                fab.setAttribute('aria-expanded', 'true');
                setAccessibleDialog(sheet, overlay, true, fab, closeSheet);
            });

            const closeSheet = () => {
                overlay.classList.remove('open');
                sheet.classList.remove('open');
                fab.setAttribute('aria-expanded', 'false');
                setAccessibleDialog(sheet, overlay, false);
            };
            overlay.addEventListener('click', closeSheet);
            document.getElementById('sheetClose').addEventListener('click', closeSheet);
        }

        function chasecasterStatusMessage() {
            const keys = {
                waiting: 'chasecasterStarting',
                gps: 'chasecasterGpsOnly',
                absolute: 'chasecasterAbsolute',
                relative: 'chasecasterRelative',
                uncalibrated: 'chasecasterUncalibrated'
            };
            return t(keys[chasecasterCompassState] || 'chasecasterGpsOnly');
        }

        function updateChasecasterLanguage() {
            const title = document.getElementById('chasecasterTitle');
            const status = document.getElementById('chasecasterStatus');
            const accuracy = document.getElementById('chasecasterAccuracyLabel');
            const speed = document.getElementById('chasecasterSpeedLabel');
            const follow = document.getElementById('chasecasterFollow');
            const safety = document.getElementById('chasecasterSafety');
            if (title) title.textContent = 'Chasecaster';
            if (status) status.textContent = chasecasterStatusMessage();
            if (accuracy?.firstChild) accuracy.firstChild.nodeValue = t('chasecasterAccuracy');
            if (speed?.firstChild) speed.firstChild.nodeValue = t('chasecasterSpeed');
            if (follow) follow.textContent = chasecasterFollowing ? t('chasecasterFollowing') : t('chasecasterRecenter');
            if (safety) safety.textContent = t('chasecasterSafety');
        }

        function formatChasecasterAccuracy(meters) {
            if (!Number.isFinite(meters)) return '—';
            if (settings.units === 'metric') return `${Math.round(meters)} m`;
            const feet = meters * 3.28084;
            return feet < 5280 ? `${Math.round(feet)} ft` : `${(feet / 5280).toFixed(1)} mi`;
        }

        function formatChasecasterSpeed(metersPerSecond) {
            if (!Number.isFinite(metersPerSecond)) return '—';
            const converted = settings.units === 'metric' ? metersPerSecond * 3.6 : metersPerSecond * 2.23694;
            return `${Math.round(converted)} ${settings.units === 'metric' ? 'km/h' : 'mph'}`;
        }

        function setChasecasterFollowing(active) {
            chasecasterFollowing = Boolean(active);
            const button = document.getElementById('chasecasterFollow');
            button?.classList.toggle('active', chasecasterFollowing);
            button?.setAttribute('aria-pressed', String(chasecasterFollowing));
            if (button) button.textContent = chasecasterFollowing ? t('chasecasterFollowing') : t('chasecasterRecenter');
        }

        function updateChasecasterHeading(value) {
            chasecasterHeading = smoothHeading(chasecasterHeading, value);
            if (chasecasterHeading === null) return;
            const rounded = Math.round(chasecasterHeading) % 360;
            const cardinal = cardinalDirection(chasecasterHeading);
            const heading = document.getElementById('chasecasterHeading');
            const needle = document.getElementById('chasecasterNeedle');
            if (heading) heading.textContent = `${String(rounded).padStart(3, '0')}° ${cardinal}`;
            if (needle) needle.style.transform = `rotate(${chasecasterHeading.toFixed(1)}deg)`;
            const markerArrow = chasecasterMarker?.getElement()?.querySelector('.chasecaster-location-arrow');
            if (markerArrow) markerArrow.style.transform = `rotate(${chasecasterHeading.toFixed(1)}deg)`;
            const markerElement = chasecasterMarker?.getElement();
            if (markerElement) markerElement.setAttribute('aria-label', `Current location, heading ${rounded} degrees ${cardinal}`);
        }

        function handleChasecasterOrientation(event) {
            if (!chasecasterActive) return;
            const screenAngle = screen.orientation?.angle ?? window.orientation ?? 0;
            const reading = orientationHeading(event, screenAngle);
            if (!reading) return;
            clearTimeout(chasecasterCompassTimer);
            chasecasterCompassState = !reading.calibrated
                ? 'uncalibrated'
                : (reading.absolute ? 'absolute' : 'relative');
            updateChasecasterHeading(reading.heading);
            updateChasecasterLanguage();
        }

        async function enableChasecasterCompass() {
            const orientationApi = globalThis.DeviceOrientationEvent;
            if (typeof orientationApi !== 'function') return false;
            if (typeof orientationApi.requestPermission === 'function') {
                try {
                    if (await orientationApi.requestPermission() !== 'granted') return false;
                } catch {
                    return false;
                }
            }
            if (!chasecasterActive) return false;
            window.addEventListener('deviceorientationabsolute', handleChasecasterOrientation, true);
            window.addEventListener('deviceorientation', handleChasecasterOrientation, true);
            chasecasterCompassTimer = setTimeout(() => {
                if (!chasecasterActive || chasecasterHeading !== null) return;
                chasecasterCompassState = 'gps';
                updateChasecasterLanguage();
            }, 1800);
            return true;
        }

        function ensureChasecasterLayers(position) {
            const latlng = [position.latitude, position.longitude];
            if (!chasecasterAccuracyCircle) {
                chasecasterAccuracyCircle = L.circle(latlng, {
                    pane: 'markerPane',
                    radius: position.accuracyMeters || 0,
                    color: '#38bdf8',
                    weight: 1,
                    fillColor: '#38bdf8',
                    fillOpacity: 0.08,
                    interactive: false
                }).addTo(map);
            } else {
                chasecasterAccuracyCircle.setLatLng(latlng);
                chasecasterAccuracyCircle.setRadius(position.accuracyMeters || 0);
            }
            if (!chasecasterMarker) {
                chasecasterMarker = L.marker(latlng, {
                    pane: 'markerPane',
                    keyboard: false,
                    zIndexOffset: 1200,
                    icon: L.divIcon({
                        className: 'chasecaster-location-icon',
                        html: '<div class="chasecaster-location-arrow"></div>',
                        iconSize: [34, 34],
                        iconAnchor: [17, 17]
                    })
                }).addTo(map);
                chasecasterMarker.on('add', () => {
                    const element = chasecasterMarker?.getElement();
                    element?.setAttribute('role', 'img');
                    if (chasecasterHeading !== null) updateChasecasterHeading(chasecasterHeading);
                });
            } else {
                chasecasterMarker.setLatLng(latlng);
            }
        }

        function handleChasecasterPosition(rawPosition) {
            if (!chasecasterActive) return;
            const position = normalizeChasePosition(rawPosition);
            if (!position) return;
            const firstPosition = chasecasterPosition === null;
            chasecasterPosition = position;
            ensureChasecasterLayers(position);
            document.getElementById('chasecasterAccuracy').textContent = formatChasecasterAccuracy(position.accuracyMeters);
            document.getElementById('chasecasterSpeed').textContent = formatChasecasterSpeed(position.speedMps);
            if (chasecasterHeading === null && position.course !== null) updateChasecasterHeading(position.course);
            if (chasecasterCompassState === 'waiting' && !chasecasterCompassTimer) chasecasterCompassState = 'gps';
            updateChasecasterLanguage();
            if (chasecasterFollowing) {
                const zoom = firstPosition ? Math.max(map.getZoom(), 11) : map.getZoom();
                map.setView([position.latitude, position.longitude], zoom, { animate: false });
            }
            document.getElementById('chasecasterPanel').dataset.positionTimestamp = String(position.timestamp);
        }

        function handleChasecasterLocationError(error) {
            const denied = error?.code === 1;
            const message = denied ? t('chasecasterDenied') : t('chasecasterError');
            stopChasecaster();
            showToast(message, denied ? 'warn' : 'error', 6500);
        }

        function suspendChasecasterConflicts() {
            chasecasterSuspendedViews = {
                splitView: settings.splitView,
                pipRadar: settings.pipRadar
            };
            if (settings.splitView) setSplitView(false, { persist: false });
            if (settings.pipRadar) setPipRadar(false, { persist: false });
            if (stormTop3dMode) exitStormTop3d();
        }

        function restoreChasecasterConflicts() {
            const suspended = chasecasterSuspendedViews;
            chasecasterSuspendedViews = null;
            if (!suspended) return;
            if (suspended.splitView) setSplitView(true, { persist: false });
            if (suspended.pipRadar) setPipRadar(true, { persist: false });
        }

        async function startChasecaster() {
            if (chasecasterActive) return;
            if (!navigator.geolocation) {
                showToast(t('chasecasterUnavailable'), 'warn', 5000);
                return;
            }
            suspendChasecasterConflicts();
            chasecasterActive = true;
            chasecasterPosition = null;
            chasecasterHeading = null;
            chasecasterCompassState = 'waiting';
            setChasecasterFollowing(true);
            document.body.classList.add('chasecaster-mode');
            const panel = document.getElementById('chasecasterPanel');
            const button = document.getElementById('chasecasterBtn');
            panel.hidden = false;
            button.classList.add('active');
            button.setAttribute('aria-pressed', 'true');
            updateChasecasterLanguage();
            const compassEnabled = await enableChasecasterCompass();
            if (!chasecasterActive) return;
            if (!compassEnabled) {
                chasecasterCompassState = 'gps';
                updateChasecasterLanguage();
            }
            try {
                chasecasterWatchId = navigator.geolocation.watchPosition(
                    handleChasecasterPosition,
                    handleChasecasterLocationError,
                    { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
                );
            } catch (error) {
                handleChasecasterLocationError(error);
            }
        }

        function stopChasecaster({ restore = true } = {}) {
            if (chasecasterWatchId !== null) navigator.geolocation?.clearWatch?.(chasecasterWatchId);
            chasecasterWatchId = null;
            clearTimeout(chasecasterCompassTimer);
            chasecasterCompassTimer = null;
            window.removeEventListener('deviceorientationabsolute', handleChasecasterOrientation, true);
            window.removeEventListener('deviceorientation', handleChasecasterOrientation, true);
            if (chasecasterMarker) map.removeLayer(chasecasterMarker);
            if (chasecasterAccuracyCircle) map.removeLayer(chasecasterAccuracyCircle);
            chasecasterMarker = null;
            chasecasterAccuracyCircle = null;
            chasecasterPosition = null;
            chasecasterHeading = null;
            chasecasterActive = false;
            document.body.classList.remove('chasecaster-mode');
            const panel = document.getElementById('chasecasterPanel');
            const button = document.getElementById('chasecasterBtn');
            if (panel) {
                panel.hidden = true;
                delete panel.dataset.positionTimestamp;
            }
            button?.classList.remove('active');
            button?.setAttribute('aria-pressed', 'false');
            document.getElementById('chasecasterHeading').textContent = '—° —';
            document.getElementById('chasecasterAccuracy').textContent = '—';
            document.getElementById('chasecasterSpeed').textContent = '—';
            if (restore) restoreChasecasterConflicts();
            else chasecasterSuspendedViews = null;
        }

        function initChasecaster() {
            document.getElementById('chasecasterBtn').addEventListener('click', () => {
                if (chasecasterActive) stopChasecaster();
                else startChasecaster();
            });
            document.getElementById('chasecasterStop').addEventListener('click', stopChasecaster);
            document.getElementById('chasecasterFollow').addEventListener('click', () => {
                setChasecasterFollowing(true);
                if (chasecasterPosition) {
                    map.setView(
                        [chasecasterPosition.latitude, chasecasterPosition.longitude],
                        Math.max(map.getZoom(), 11),
                        { animate: false }
                    );
                }
            });
            map.on('dragstart', () => {
                if (chasecasterActive) setChasecasterFollowing(false);
            });
            window.addEventListener('pagehide', () => stopChasecaster({ restore: false }));
            updateChasecasterLanguage();
        }

        function selectedTrainingScenario() {
            const select = document.getElementById('trainingScenarioSelect');
            return getTrainingScenario(select?.value, settings.language)
                || trainingScenarioCatalog(settings.language)[0]
                || null;
        }

        function trainingOverlayColors() {
            const styles = getComputedStyle(document.body);
            return {
                warning: styles.getPropertyValue('--warning').trim() || '#fbbf24',
                accent: styles.getPropertyValue('--accent').trim() || '#38bdf8'
            };
        }

        function focusTrainingAnnotation(index) {
            if (!trainingLayer) return;
            let target = null;
            trainingLayer.eachLayer(layer => {
                if (layer.feature?.properties?.trainingIndex === index) target = layer;
            });
            if (!target) return;
            if (typeof target.getBounds === 'function' && target.getBounds().isValid()) {
                map.fitBounds(target.getBounds(), {
                    padding: [56, 56],
                    maxZoom: 9,
                    animate: !matchMedia('(prefers-reduced-motion: reduce)').matches
                });
            } else if (typeof target.getLatLng === 'function') {
                map.setView(target.getLatLng(), Math.max(map.getZoom(), 9), {
                    animate: !matchMedia('(prefers-reduced-motion: reduce)').matches
                });
            }
            target.openPopup?.();
        }

        function renderTrainingAnnotations(scenario) {
            if (trainingLayer) map.removeLayer(trainingLayer);
            trainingLayer = null;
            const list = document.getElementById('trainingAnnotations');
            list.replaceChildren();
            if (!scenario) {
                list.hidden = true;
                return;
            }
            const colors = trainingOverlayColors();
            trainingLayer = L.geoJSON(trainingFeatureCollection(scenario), {
                pane: 'markerPane',
                style: feature => ({
                    color: feature.properties.kind === 'area' ? colors.warning : colors.accent,
                    fillColor: colors.warning,
                    fillOpacity: feature.properties.kind === 'area' ? 0.06 : 0,
                    weight: 3,
                    opacity: 0.95,
                    dashArray: feature.properties.kind === 'area' ? '8 7' : '10 6'
                }),
                pointToLayer: (feature, latlng) => L.marker(latlng, {
                    keyboard: true,
                    zIndexOffset: 1300,
                    icon: L.divIcon({
                        className: 'training-marker-icon',
                        html: `<span class="training-marker">${feature.properties.trainingIndex}</span>`,
                        iconSize: [26, 26],
                        iconAnchor: [13, 13]
                    })
                }),
                onEachFeature: (feature, layer) => {
                    const properties = feature.properties;
                    layer.bindPopup(`
                        <div class="popup-content">
                            <h4>${properties.trainingIndex}. ${escapeHTML(properties.title, 160)}</h4>
                            <p>${escapeHTML(properties.detail, 500)}</p>
                            <div class="meta">${escapeHTML(t('trainingDisclosure'), 180)}</div>
                        </div>
                    `);
                    layer.on('click', () => focusTrainingAnnotation(properties.trainingIndex));
                }
            }).addTo(map);

            scenario.annotations.forEach(annotation => {
                const item = document.createElement('li');
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'training-annotation-button';
                button.dataset.trainingIndex = String(annotation.index);
                const number = document.createElement('span');
                number.className = 'training-annotation-index';
                number.textContent = String(annotation.index);
                const copy = document.createElement('span');
                copy.className = 'training-annotation-copy';
                const title = document.createElement('strong');
                title.textContent = annotation.title;
                const detail = document.createElement('span');
                detail.textContent = annotation.detail;
                copy.append(title, detail);
                button.append(number, copy);
                button.addEventListener('click', () => focusTrainingAnnotation(annotation.index));
                item.appendChild(button);
                list.appendChild(item);
            });
            list.hidden = false;
        }

        function populateTrainingScenarios(selectedId) {
            const select = document.getElementById('trainingScenarioSelect');
            const catalog = trainingScenarioCatalog(settings.language);
            const desiredId = selectedId || select.value || catalog[0]?.id;
            select.replaceChildren();
            catalog.forEach(scenario => {
                const option = document.createElement('option');
                option.value = scenario.id;
                option.textContent = scenario.title;
                select.appendChild(option);
            });
            if (catalog.some(scenario => scenario.id === desiredId)) select.value = desiredId;
            const selected = selectedTrainingScenario();
            document.getElementById('trainingSummary').textContent = selected?.summary || '';
        }

        function updateTrainingLanguage() {
            const panel = document.getElementById('trainingPanel');
            if (!panel) return;
            const selectedId = trainingScenario?.id || document.getElementById('trainingScenarioSelect')?.value;
            document.getElementById('trainingTitle').textContent = t('trainingTitle');
            document.getElementById('trainingDisclosure').textContent = t('trainingDisclosure');
            document.getElementById('trainingScenarioLabel').textContent = t('trainingScenario');
            document.getElementById('trainingLoad').textContent = t('trainingLoad');
            document.getElementById('trainingExit').textContent = t('trainingExit');
            populateTrainingScenarios(selectedId);
            if (trainingScenario) {
                trainingScenario = getTrainingScenario(trainingScenario.id, settings.language);
                renderTrainingAnnotations(trainingScenario);
                document.getElementById('trainingStatus').textContent = t('trainingActive', {
                    count: trainingScenario.annotations.length
                });
            } else {
                document.getElementById('trainingStatus').textContent = t('trainingChoose');
            }
        }

        function setTrainingPanelOpen(open) {
            const panel = document.getElementById('trainingPanel');
            const button = document.getElementById('trainingBtn');
            panel.hidden = !open;
            button.setAttribute('aria-expanded', String(open));
            if (open) document.getElementById('trainingScenarioSelect').focus({ preventScroll: true });
        }

        function suspendTrainingViews() {
            if (trainingSuspendedViews) return;
            trainingSuspendedViews = {
                splitView: settings.splitView,
                pipRadar: settings.pipRadar
            };
            if (settings.splitView) setSplitView(false, { persist: false });
            if (settings.pipRadar) setPipRadar(false, { persist: false });
        }

        function restoreTrainingViews() {
            const suspended = trainingSuspendedViews;
            trainingSuspendedViews = null;
            if (!suspended) return;
            if (suspended.splitView) setSplitView(true, { persist: false });
            if (suspended.pipRadar) setPipRadar(true, { persist: false });
        }

        function resetTrainingMode({ restoreView = true } = {}) {
            if (trainingLayer) map.removeLayer(trainingLayer);
            trainingLayer = null;
            trainingScenario = null;
            document.body.classList.remove('training-mode');
            document.getElementById('trainingBtn')?.classList.remove('active');
            document.getElementById('trainingExit').disabled = true;
            document.getElementById('trainingAnnotations').replaceChildren();
            document.getElementById('trainingAnnotations').hidden = true;
            document.getElementById('trainingStatus').textContent = t('trainingChoose');
            const returnView = trainingReturnView;
            trainingReturnView = null;
            if (restoreView && returnView) {
                map.setView(returnView.center, returnView.zoom, { animate: false });
            }
            restoreTrainingViews();
        }

        async function startTrainingScenario() {
            const scenario = selectedTrainingScenario();
            if (!scenario) return;
            const wasTraining = Boolean(trainingScenario);
            if (!trainingReturnView) {
                trainingReturnView = { center: map.getCenter(), zoom: map.getZoom() };
            }
            if (chasecasterActive) stopChasecaster();
            if (stormTop3dMode) exitStormTop3d();
            suspendTrainingViews();
            const loadButton = document.getElementById('trainingLoad');
            const status = document.getElementById('trainingStatus');
            loadButton.disabled = true;
            status.textContent = t('trainingLoading');
            const result = await loadHistoricalReplayRange(scenario.start, scenario.end, { announce: false });
            loadButton.disabled = false;
            if (!result?.ok) {
                if (!wasTraining) {
                    resetTrainingMode();
                    setTrainingPanelOpen(true);
                }
                if (!result?.aborted) {
                    status.textContent = t('trainingFailed', { message: result?.error || 'Unavailable' });
                    showToast(status.textContent, 'error', 5000);
                }
                return;
            }
            trainingScenario = scenario;
            document.body.classList.add('training-mode');
            document.getElementById('trainingBtn').classList.add('active');
            document.getElementById('trainingExit').disabled = false;
            renderTrainingAnnotations(scenario);
            map.setView(scenario.center, scenario.zoom, { animate: false });
            status.textContent = t('trainingActive', { count: scenario.annotations.length });
            setProviderStatus('current', `${scenario.title} · archived training · not live`);
            showToast(t('trainingLoaded'), 'success', 3200);
        }

        function exitTrainingScenario({ closePanel = false } = {}) {
            if (replayMode) exitHistoricalReplay({ restoreTrainingView: true, announce: true });
            else resetTrainingMode();
            if (closePanel) setTrainingPanelOpen(false);
        }

        function initTrainingOverlays() {
            populateTrainingScenarios();
            document.getElementById('trainingBtn').addEventListener('click', () => {
                if (trainingScenario) {
                    setTrainingPanelOpen(true);
                    return;
                }
                setTrainingPanelOpen(document.getElementById('trainingPanel').hidden);
            });
            document.getElementById('trainingClose').addEventListener('click', () => {
                if (trainingScenario) exitTrainingScenario({ closePanel: true });
                else setTrainingPanelOpen(false);
            });
            document.getElementById('trainingScenarioSelect').addEventListener('change', event => {
                const scenario = getTrainingScenario(event.target.value, settings.language);
                document.getElementById('trainingSummary').textContent = scenario?.summary || '';
            });
            document.getElementById('trainingLoad').addEventListener('click', startTrainingScenario);
            document.getElementById('trainingExit').addEventListener('click', () => exitTrainingScenario());
        }

        let locationPermissionBlocked = false;

        function setLocationControlStatus(message, state = 'idle') {
            const button = document.getElementById('locBtn');
            button.dataset.locationState = state;
            button.title = message;
            button.setAttribute('aria-label', message);
        }

        function goToLocation() {
            if (!navigator.geolocation) {
                const message = t('locationUnsupported');
                setLocationControlStatus(message, 'unsupported');
                showToast(message, 'warn', 6000);
                return;
            }
            if (locationPermissionBlocked) {
                showToast(t('locationDenied'), 'warn', 6000);
                return;
            }

            setLocationControlStatus(t('locationFinding'), 'loading');
            
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const {latitude, longitude} = pos.coords;
                    map.flyTo([latitude, longitude], 10);
                    setLocationControlStatus(t('myLocationAria'), 'ready');

                    if (locationMarker) locationMarker.setLatLng([latitude, longitude]);
                    else {
                        locationMarker = L.circleMarker([latitude, longitude], {
                            radius: 10, fillColor: '#38bdf8', fillOpacity: 1, color: '#fff', weight: 3
                        }).addTo(map);
                    }
                },
                (error) => {
                    const denied = error?.code === 1;
                    locationPermissionBlocked = denied;
                    const message = denied ? t('locationDenied') : t('locationFailed');
                    setLocationControlStatus(message, denied ? 'denied' : 'failed');
                    showToast(message, 'warn', 6000);
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }

        function startAutoRefresh() {
            // Main refresh interval
            setInterval(() => {
                if (settings.autoRefresh && !replayMode && !isPlaying && !document.hidden) {
                    if (settings.layers.radar) loadRadarData();
                    if (settings.layers.alerts) loadAlerts();
                    if (settings.layers.stormTracks) loadStormTracks();
                    else if (stormTop3dMode) loadStormCellsFor3d(true).then(renderStormTop3d);
                }
            }, 5 * 60 * 1000);
            
            // Update the "Updated X min ago" display every 30s
            setInterval(() => {
                if (lastRefreshTime) {
                    const refreshEl = document.getElementById('fiRefreshed');
                    if (refreshEl) {
                        const ago = Math.round((Date.now() - lastRefreshTime) / 60000);
                        if (ago < 1) refreshEl.textContent = 'Updated just now';
                        else if (ago === 1) refreshEl.textContent = 'Updated 1 min ago';
                        else refreshEl.textContent = `Updated ${ago}m ago`;
                    }
                }
            }, 30000);
            
            // Refresh when returning to tab after being away > 3 min
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden && settings.autoRefresh && !replayMode && lastRefreshTime) {
                    const staleMs = Date.now() - lastRefreshTime;
                    if (staleMs > 3 * 60 * 1000) {
                        showToast('Refreshing stale data...', 'info', 2000);
                        if (settings.layers.radar) loadRadarData();
                        if (settings.layers.alerts) loadAlerts();
                        if (settings.layers.stormTracks) loadStormTracks();
                        else if (stormTop3dMode) loadStormCellsFor3d(true).then(renderStormTop3d);
                    }
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.matches('input, textarea, select, button, [role]')) return;
            
            switch(e.key) {
                case ' ':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'ArrowLeft':
                    stepFrame(-1);
                    break;
                case 'ArrowRight':
                    stepFrame(1);
                    break;
                case 'r':
                    if (settings.layers.radar) loadRadarData();
                    break;
            }
        });

        // Global error handler for tile images - catches any broken images that slip through
        document.addEventListener('error', function(e) {
            if (e.target.tagName === 'IMG' && e.target.closest('.leaflet-tile-pane')) {
                e.target.style.opacity = '0';
                e.target.style.visibility = 'hidden';
                e.target.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
            }
        }, true);

        document.addEventListener('DOMContentLoaded', init);
    })();
