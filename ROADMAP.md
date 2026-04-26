# StormView Radar Roadmap

Roadmap for StormView Radar, a single-file Leaflet-based weather radar app with NWS alerts, SPC outlooks, storm reports, lightning, and USGS integration.

## Planned Features

### Radar & data layers
- NEXRAD Level II single-site mode (via NOAA AWS S3) for high-res base reflectivity + velocity + ZDR/CC dual-pol
- Tornado velocity couplet auto-detection and overlay (heuristic on velocity data)
- Hail size estimation overlay using MESH product from MRMS
- ECMWF / HRRR nowcast overlay as an alternate radar forecast source
- Satellite enhancement layers: IR sandwich, water vapor, GeoColor
- Lightning density heatmap (not just point strikes) over a user-chosen time window
- GOES-16 mesoscale sector auto-fetcher for active severe events

### Alerts & tracking
- Storm cell tracking from MRMS with per-cell history and projected path
- Alert audio notifications (configurable by severity, type, distance)
- User geofences ("alert me only if polygon intersects my home 10mi buffer")
- Push/Webhook integration: Discord, Slack, Pushover, ntfy.sh
- Historical event replay (fetch a date range and replay radar + alerts)
- Mobile-first alert banner that respects reduced-motion preferences

### Map & overlays
- Cesium 3D mode toggle for storm-top-height visualization
- County warnings polygon fill with time-of-issuance gradient
- Storm reports clustering at low zoom, individual pins at high zoom
- User-contributed report overlay via mSpotter / CoCoRaHS feeds (opt-in)
- Highway overlay with state DOT closure feeds where available
- Overlay opacity individually controllable per layer (not just radar)

### Performance
- IndexedDB tile cache with LRU eviction (replace current in-memory only cache)
- WebGL tile layer for smoother zoom + interpolation
- Service Worker offline-first fallback (cached last frames + alert polygons)
- Preload window configurable (currently fixed window around playhead)

### UX
- Split-screen "two cities" mode
- Picture-in-picture mini radar that stays visible while scrolling the alerts list
- Dark / High-contrast / Color-blind-safe palettes
- One-click share snapshot - exports current view + frame as PNG with attribution
- Embed mode with configurable URL params for iframe use on other sites

## Competitive Research

- **RadarScope** - industry standard; strength is NEXRAD Level II + storm tracks + built-in SAILS/MRLE awareness. Matching Level II single-site is the single highest-value addition.
- **MyRadar / Radarscope Lite** - focus on casual UX with quick-alerts push. StormView already has NWS alerts but push/webhook + audio alerts are the last 10% for daily use.
- **Windy.com** - best-in-class for model visualization; borrow their model switcher UX pattern for HRRR/ECMWF/GFS nowcast.
- **College of DuPage NEXLAB** - strength is flexible stitched CONUS mosaics + dual-pol; consider linking out to CoD products when a user zooms into a site they're tracking.
- **Blitzortung / LightningMaps** - free lightning source better than Iowa State for CONUS density; add as alternate source.

## Nice-to-Haves

- Chasecaster mode with geolocation + compass for mobile field use
- Training overlays (learn-the-radar tutorial with annotated example storms)
- PWA install prompt with offline-first last-frames cache
- Export animated GIF/MP4 of the current loop via `MediaRecorder` + Canvas capture
- "Radar then" time slider going back 6h with frame-smart caching
- Cross-border: Environment Canada radar (`geo.weather.gc.ca`) as alternate source for Canadian users
- Public API mode (URL query parameters) so other sites can embed a preconfigured view

## Open-Source Research (Round 2)

### Related OSS Projects
- https://github.com/rainviewer/rainviewer-api-example — Official RainViewer reference: API fetch, frame animation, product switching, perf/memory optimizations
- https://github.com/willwood/radar-map-viewer — Self-hosted PHP/Leaflet radar with 7 styles (Universal Blue, TWC, NEXRAD Level-3, Dark Sky, SELEX-SI, etc.), embeddable iframe
- https://github.com/dpaulat/supercell-wx — C++ NEXRAD Level 2/3 + NWS alerts desktop viewer; reference for how to render warning polygons from `api.weather.gov/alerts/active`
- https://github.com/Makin-Things/weather-radar-card — Home Assistant Lovelace Leaflet card (good small-viewport layout)
- https://github.com/jalibu/MMM-RAIN-MAP — MagicMirror module; smart marker + 10-min refresh cycle
- https://github.com/topics/national-weather-service — NWS-related projects
- https://github.com/topics/weather-radar — Broader topic hub
- https://api.weather.gov/openapi.json — Official NWS API spec (alerts, warnings, forecasts, observations)

### Features to Borrow
- 7 radar color-palette styles (Universal Blue, TWC, NEXRAD Level-3, Dark Sky, SELEX-SI, TITAN, Original) (radar-map-viewer)
- Per-frame memory-release optimizations from the official RainViewer example — `removeLayer` old frames, avoid Chrome image-cache blowup (rainviewer-api-example)
- NWS warning-polygon overlay from `api.weather.gov/alerts/active` with severity-based fill (Supercell Wx behavior in a web context)
- Hail-size + storm-tracks overlay from MRMS storm attribute table (Supercell Wx)
- Local NEXRAD Level-3 tile fallback via IEM Mesonet when MRMS is down (iemrsem has public tile endpoints)
- Marker clustering for spotter/report pins at low zoom (willwood uses leaflet-markercluster)
- Frame-smart caching — preload next 3 future + past 3 frames, evict beyond window (rainviewer-api-example)

### Patterns & Architectures Worth Studying
- Time-indexed tile layer pool — maintain N TileLayers keyed by epoch, swap opacity instead of add/remove to avoid TileLayer reinit latency (rainviewer-api-example optimization)
- NWS alert SSE stream via `api.weather.gov/alerts/active?area=XX&stream=1` — live polygon updates without polling (Supercell Wx does this in C++)
- Dual-source stitching at tile level — RainViewer globally, MRMS high-res mask in US bbox; already your "Hybrid High-Res Mode", formalize as an adapter interface
- Leaflet plugin modular layout — each layer (radar, alerts, spotters, storm-tracks, mesocyclones) as a separate ES module registered against a central map instance
- IndexedDB frame cache with versioned schema for offline-last-frames PWA mode
