# StormView Radar

A modern, feature-rich weather radar visualization application built with vanilla JavaScript and Leaflet. Track severe weather in real-time with animated radar, NWS alerts, storm reports, and more.

<div align="center">

### ⛈️ [**Launch StormView Radar**](https://sysadmindoc.github.io/StormviewRadar/) ⛈️

[![Live Demo](https://img.shields.io/badge/🔴_LIVE-View_Demo-blue?style=for-the-badge&logoColor=white)](https://sysadmindoc.github.io/StormviewRadar/)
[![Version](https://img.shields.io/badge/version-0.1.0-blue)](https://github.com/SysAdminDoc/StormviewRadar/releases)

</div>

<img width="1399" height="1092" alt="StormView Radar screenshot" src="https://github.com/user-attachments/assets/e2937d6a-ec98-4a53-a7be-621b676701ad" />


## Features

### Radar & Animation
- **Five Radar Sources** — Switch between HRRR forecast guidance, RainViewer global history, MRMS US products, NOAA nowCOAST, and native NEXRAD Level II
- **NEXRAD Level II** — Select the nearest or a named CONUS site and render current 0.5° reflectivity, velocity, ZDR, or correlation coefficient directly from the NOAA/Unidata AWS archive
- **Rotation Candidates** — Overlay up to 20 clustered, reflectivity-backed velocity couplets with explicit automated-heuristic and not-a-warning labeling
- **MESH Hail Size** — Decode NOAA's current 2-minute MRMS MESH grid off-thread and overlay color-scaled hail-size estimates with metric/US legends
- **Satellite Enhancements** — Layer NOAA/NESDIS GeoColor or a GeoColor + enhanced Band 13 IR sandwich alongside visible, infrared, and water-vapor channels
- **GOES Mesoscale Sectors** — Fetch both current GOES-East M1 and M2 visible sectors as a single high-frequency severe-weather overlay
- **Hybrid High-Res Mode** — Automatic MRMS enhancement at high zoom levels (US only)
- **Smooth Animation** — Play, pause, and step through radar frames with customizable speed (0.5x–3x)
- **Model Forecast** — View HRRR reflectivity guidance through 18 hours
- **RainViewer History** — Animate approximately two hours of past global radar using the provider's Universal Blue palette (native zoom 7)
- **Historical Event Replay** — Select up to six hours and replay five-minute IEM NEXRAD composites with storm-based warning polygons synchronized to each frame
- **Provider-Time Timeline** — Show model initialization, valid time, forecast lead, data age, timezone, and source coverage without substituting the client clock
- **Accessible Controls** — Keyboard-operable layers and timeline, labeled search suggestions, focus-managed dialogs, and reduced-motion/forced-colors support
- **Adjustable Opacity** — Fine-tune radar transparency for optimal map visibility
- **Smart Tile Caching** — Optimized loading with rate limit protection

### Weather Layers
- **NWS Alerts** — Real-time watches, warnings, and advisories with hazard-colored borders and warning fills that fade by time since issuance
- **Alert Sounds** — Opt in to synthesized tones for newly issued alerts, filtered by NWS severity, event type, and distance from the map center
- **Private Geofences** — Save up to 20 named local alert radii at the map center, display them as optional overlays, and match alert sounds against their polygon intersections
- **SPC Outlooks** — Storm Prediction Center convective outlooks
- **SPC Mesoscale Discussions** — Active official SPC discussions with their valid polygons, affected areas, and summaries
- **Storm Reports** — Cluster the latest IEM tornado, hail, wind, and flood reports at overview zooms, then expand to individual report pins at zoom 9+
- **Storm Tracks** — Plot current NEXRAD storm cells with an hour of observed positions, 30/60-minute motion projections, and TVS, mesocyclone, hail, VIL, and echo-top details
- **3D Storm Tops** — Toggle a Cesium globe that extrudes current IEM NEXRAD echo-top estimates, prioritizes threat cells, labels measured heights, and discloses its zoom-dependent display scale
- **Lightning** — Near real-time lightning strike data
- **Satellite** — GOES satellite imagery overlay
- **River Gauges** — USGS water level monitoring stations
- **Surface Observations** — METAR station data display
- **Aviation Hazards** — Browser-safe NWS SIGMET and AIRMET alert polygons; pilot reports are intentionally omitted because the official PIREP API disallows direct browser access

### Additional Overlays (API Required)
- **Temperature** — OpenWeatherMap temperature layer
- **Wind** — Wind speed and direction visualization
- **Clouds** — Cloud cover overlay
- **Pressure** — Atmospheric pressure visualization

### Map Customization
- **5 Basemap Styles** — Dark, light, terrain, satellite, and streets
- **State & County Borders** — Toggleable political boundaries
- **City Labels** — Optional place name labels
- **Iowa Road Events** — Show credential-free Iowa 511 closures, lane closures, restrictions, and work zones with visible-map queries, provider freshness, source links, and explicit Iowa-only coverage

### User Experience
- **Dark/Light Theme** — Full theme support with smooth transitions
- **Location Search** — Find any location with OpenStreetMap geocoding
- **Geolocation** — Jump to your current position with one click
- **Mobile Optimized** — Responsive design with bottom sheet navigation on mobile
- **Keyboard Shortcuts** — Quick controls for power users
- **Versioned Settings** — Validated preferences migrate forward in browser storage
- **Import/Export** — Backup and restore configuration without exporting API keys
- **Session-Only Map Files** — Load bounded GeoJSON or KML overlays locally, hide or remove them, and keep their contents out of settings, diagnostics, and network requests
- **Redacted Diagnostics** — Inspect provider freshness, fallback, coverage, resource counts, retry state, and request results without copying secrets or precise coordinates
- **Reduced Data Mode** — Limit radar frames and pause data-heavy optional overlays on constrained connections
- **Language & Units** — Persist English or Spanish UI plus US customary or metric weather units, with locale-aware dates and safe English fallback
- **Quiet-by-Default Audio** — The first alert load is silent; a user gesture unlocks audio and only unseen matching alerts can sound
- **Local-Only Alert Areas** — Geofences remain in the current browser profile and are not sent to StormView or included in settings exports
- **Mobile Alert Banner** — Prioritize alerts intersecting the visible map with dismissible, 44px actions and reduced-motion support

## Quick Start

1. **Download** or clone the repository
2. **Serve** the repository with any static HTTP server
3. **Open** the local URL — runtime dependencies are bundled; no build step is required

```bash
git clone https://github.com/sysadmindoc/StormviewRadar.git
cd StormviewRadar
python -m http.server 8000
# Open http://127.0.0.1:8000/
```

> **Note:** Direct `file://` use is not supported because weather providers enforce CORS. Use a local HTTP server or the hosted version.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause animation |
| `←` | Previous frame |
| `→` | Next frame |
| `R` | Refresh radar data |
| `F` (while the map is focused) | Open the forecast at map center |
| `←` / `→` (on a settings or layer tab) | Move between tabs |

## API Keys (Optional)

The optional OpenWeatherMap overlays require a free API key:

### OpenWeatherMap
Required for temperature, wind, clouds, and pressure layers.
1. Sign up at [openweathermap.org](https://openweathermap.org/api)
2. Copy your API key
3. Paste in Settings → API tab

API keys are stored unencrypted in the current browser profile and sent directly to their providers. Anyone with local access to that browser profile can read them. StormView settings exports omit all API keys.

## Data Sources

| Layer | Source | Update Frequency |
|-------|--------|------------------|
| Global radar history | [RainViewer](https://www.rainviewer.com/) | Provider dependent |
| HRRR forecast radar | [Iowa State Mesonet](https://mesonet.agron.iastate.edu/) | Model cycle |
| MRMS | [Iowa State Mesonet](https://mesonet.agron.iastate.edu/) | ~2 minutes |
| MRMS MESH | [NOAA Open Data on AWS](https://registry.opendata.aws/noaa-mrms-pds/) | ~2 minutes |
| NOAA radar mosaic | [nowCOAST](https://nowcoast.noaa.gov/) | Provider dependent |
| NEXRAD Level II | [NOAA / NSF Unidata on AWS](https://registry.opendata.aws/noaa-nexrad/) | Per volume scan |
| Historical radar and warnings | [Iowa State Mesonet](https://mesonet.agron.iastate.edu/GIS/rasters.php?rid=2) | 5-minute frames |
| Alerts | [NWS API](https://www.weather.gov/documentation/services-web-api) | Real-time |
| SPC Outlook | [SPC](https://www.spc.noaa.gov/) | Daily |
| SPC Mesoscale Discussions | [SPC](https://www.spc.noaa.gov/products/md/) | Provider dependent |
| SIGMETs and AIRMETs | [NWS API](https://www.weather.gov/documentation/services-web-api) | Real-time |
| Storm Reports | [Iowa State Mesonet](https://mesonet.agron.iastate.edu/geojson/lsr.php) | As reported |
| Storm tracks | [Iowa State Mesonet](https://mesonet.agron.iastate.edu/geojson/nexrad_attr.py?help=) | ~1 minute |
| Lightning | Iowa State Mesonet | ~5 minutes |
| Satellite | GOES East (IEM) | ~15 minutes |
| River Gauges | [USGS](https://waterservices.usgs.gov/) | Varies |
| Iowa road events | [Iowa DOT 511](https://iowadot.gov/travel-tools/iowa-511/511-data-feeds) | As events change |

Location searches use the public [Nominatim](https://nominatim.openstreetmap.org/) service. Requests are limited to one per second, include the project contact address required by the service policy, and are not stored in StormView search history.

## Browser Support

- Current stable Chrome, Edge, and Firefox on desktop
- Current stable Safari on macOS and iOS
- Current stable Chrome on Android

Automated release coverage runs the full suite in current Chromium plus a
startup, radar, keyboard, and ARIA smoke in current Firefox and WebKit.

## Technology Stack

- **Leaflet** — Interactive mapping
- **CesiumJS Engine** — On-demand 3D storm-top globe rendered from bundled assets
- **TopoJSON Client** — Bundled boundary conversion
- **OpenStreetMap** — Base map tiles and geocoding
- **Vanilla JS** — No runtime framework or server component
- **CSS Variables** — Dynamic theming
- **LocalStorage** — Settings persistence

Leaflet 1.9.4, CesiumJS 1.143.0, TopoJSON Client 3.1.0, and the Level II worker
dependencies are vendored or bundled from exact npm package versions. The
Cesium engine is tree-shaken into a lazy, CSP-safe bundle and uses its local
Natural Earth imagery. Level II bzip decoding and polar image rendering run off
the main thread. A Content Security Policy blocks unapproved executable, style,
and network origins. Development and release checks require Node.js 22 or newer:

```bash
npm ci
npx playwright install chromium firefox webkit
npm run release:check
```

The static checks compare vendored files with the lockfile-installed packages.
Dependabot checks npm dependencies weekly. GitHub Pages deployment runs only
after the complete browser suite and advisory check pass for `main`; the deploy
then verifies the hosted commit, version, social image, lazy modules, worker
scripts, and representative Cesium runtime asset types.

StormView has no application server, account system, or telemetry endpoint.
The static browser client requests map/weather data directly from the providers
listed above. Settings, saved locations, geofences, and optional API keys remain
in the current browser profile; exports omit API keys and diagnostics redact
keys and precise coordinates. Provider coverage is not uniform: Level II,
MRMS, IEM reports, and most severe-weather analysis are US-focused, RainViewer
supplies global past radar, and a transparent or stale layer can reflect an
upstream outage rather than an all-clear.

## Release process

Start from a clean `main` checkout after all release changes are committed.
The release command validates the semver, synchronizes package, page, README,
CLAUDE, and changelog versions, runs the complete release gate, creates a
`chore(release)` commit, and adds the matching annotated tag:

```bash
npm run release -- 0.2.0
git push origin main --follow-tags
```

The command refuses a dirty tree, an existing tag, a non-increasing version, or
a failed test/audit gate, so a release never depends on hand-editing version
strings.

## Performance Optimizations

StormView includes several optimizations for smooth performance:

- **Batched Frame Loading** — Radar frames load in small batches to avoid rate limiting
- **Custom Cached TileLayer** — Extended Leaflet TileLayer with intelligent caching
- **Seamless Zoom** — Tiles remain visible during zoom, new tiles load in background
- **Memory Management** — Only nearby frames kept in memory during animation
- **Bounded Overlays** — River requests follow the visible map area; report and observation markers are spatially sampled with hard limits
- **Graceful Error Handling** — Failed tiles display transparently without broken image icons

## Configuration Options

Access the settings panel (⚙️) to customize:

**General**
- Theme (dark/light)
- Language (English/Spanish)
- Units (US customary/metric)
- Show legend
- Border widths and opacity
- Independent overlay visibility (10%–100% per layer)

**Radar**
- Opacity (30%–100%)
- High-res mode (MRMS enhancement)
- Smooth interpolation
- Snow color mode
- Frame delay (200ms–1200ms)
- Auto-refresh (5 min interval)
- Loop animation

## Project Structure

```
StormviewRadar/
├── index.html          # Single-file application
├── package.json        # Locked test and vendored-runtime dependencies
├── scripts/            # Builds, release automation, and static/hosted checks
├── src/                # Provider registry, analysis modules, workers, and browser shims
├── tests/              # Deterministic Playwright browser tests
├── vendor/             # Pinned Leaflet, TopoJSON, and NEXRAD runtime assets
├── README.md           # Documentation
├── LICENSE             # MIT License
└── logo/               # App icons and favicons
    ├── StormView.ico
    ├── StormView-16x16.png
    ├── StormView-32x32.png
    ├── StormView-48x48.png
    ├── StormView-64x64.png
    ├── StormView-96x96.png
    ├── StormView-128x128.png
    ├── StormView-192x192.png
    └── StormView-512x512.png
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [RainViewer](https://www.rainviewer.com/) for radar data API
- [Iowa State Mesonet](https://mesonet.agron.iastate.edu/) for MRMS, lightning, and satellite data
- [National Weather Service](https://www.weather.gov/) for alerts and forecasts
- [Storm Prediction Center](https://www.spc.noaa.gov/) for severe weather outlooks
- [USGS](https://waterservices.usgs.gov/) for river gauge data
- [NOAA and NSF Unidata](https://registry.opendata.aws/noaa-nexrad/) for the public NEXRAD Level II archive
- [Leaflet](https://leafletjs.com/) for the mapping library
- [OpenStreetMap](https://www.openstreetmap.org/) contributors
- [CARTO](https://carto.com/) for basemap tiles

---

<div align="center">

**StormView Radar** — Track storms like a pro. ⛈️

[![GitHub Pages](https://img.shields.io/badge/Hosted_on-GitHub_Pages-222?style=flat-square&logo=github)](https://sysadmindoc.github.io/StormviewRadar/)

</div>
