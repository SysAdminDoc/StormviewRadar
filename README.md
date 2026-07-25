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
- **Provider-Time Timeline** — Show model initialization, valid time, forecast lead, data age, timezone, and source coverage without substituting the client clock
- **Accessible Controls** — Keyboard-operable layers and timeline, labeled search suggestions, focus-managed dialogs, and reduced-motion/forced-colors support
- **Adjustable Opacity** — Fine-tune radar transparency for optimal map visibility
- **Smart Tile Caching** — Optimized loading with rate limit protection

### Weather Layers
- **NWS Alerts** — Real-time watches, warnings, and advisories with color-coded polygons
- **Alert Sounds** — Opt in to synthesized tones for newly issued alerts, filtered by NWS severity, event type, and distance from the map center
- **Private Geofences** — Save up to 20 named local alert radii at the map center, display them as optional overlays, and match alert sounds against their polygon intersections
- **SPC Outlooks** — Storm Prediction Center convective outlooks
- **Storm Reports** — View tornado, hail, and wind damage reports
- **Storm Tracks** — Plot current NEXRAD storm cells with an hour of observed positions, 30/60-minute motion projections, and TVS, mesocyclone, hail, VIL, and echo-top details
- **Lightning** — Near real-time lightning strike data
- **Satellite** — GOES satellite imagery overlay
- **River Gauges** — USGS water level monitoring stations
- **Surface Observations** — METAR station data display

### Additional Overlays (API Required)
- **Temperature** — OpenWeatherMap temperature layer
- **Wind** — Wind speed and direction visualization
- **Clouds** — Cloud cover overlay
- **Pressure** — Atmospheric pressure visualization

### Map Customization
- **5 Basemap Styles** — Dark, light, terrain, satellite, and streets
- **State & County Borders** — Toggleable political boundaries
- **City Labels** — Optional place name labels
- **Highway Overlay** — Road network visualization

### User Experience
- **Dark/Light Theme** — Full theme support with smooth transitions
- **Location Search** — Find any location with OpenStreetMap geocoding
- **Geolocation** — Jump to your current position with one click
- **Mobile Optimized** — Responsive design with bottom sheet navigation on mobile
- **Keyboard Shortcuts** — Quick controls for power users
- **Versioned Settings** — Validated preferences migrate forward in browser storage
- **Import/Export** — Backup and restore configuration without exporting API keys
- **Redacted Diagnostics** — Inspect provider freshness, fallback, coverage, resource counts, retry state, and request results without copying secrets or precise coordinates
- **Language & Units** — Persist English or Spanish UI plus US customary or metric weather units, with locale-aware dates and safe English fallback
- **Quiet-by-Default Audio** — The first alert load is silent; a user gesture unlocks audio and only unseen matching alerts can sound
- **Local-Only Alert Areas** — Geofences remain in the current browser profile and are not sent to StormView or included in settings exports

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
| Alerts | [NWS API](https://www.weather.gov/documentation/services-web-api) | Real-time |
| SPC Outlook | [SPC](https://www.spc.noaa.gov/) | Daily |
| Storm Reports | SPC | As reported |
| Storm tracks | [Iowa State Mesonet](https://mesonet.agron.iastate.edu/geojson/nexrad_attr.py?help=) | ~1 minute |
| Lightning | Iowa State Mesonet | ~5 minutes |
| Satellite | GOES East (IEM) | ~15 minutes |
| River Gauges | [USGS](https://waterservices.usgs.gov/) | Varies |

Location searches use the public [Nominatim](https://nominatim.openstreetmap.org/) service. Requests are limited to one per second, include the project contact address required by the service policy, and are not stored in StormView search history.

## Browser Support

- Current stable Chrome, Edge, and Firefox on desktop
- Current stable Safari on macOS and iOS
- Current stable Chrome on Android

Automated release coverage runs in current Chromium at desktop and 390px mobile
viewports. Firefox and Safari remain supported manual-test targets.

## Technology Stack

- **Leaflet** — Interactive mapping
- **TopoJSON Client** — Bundled boundary conversion
- **OpenStreetMap** — Base map tiles and geocoding
- **Vanilla JS** — No runtime framework or server component
- **CSS Variables** — Dynamic theming
- **LocalStorage** — Settings persistence

Leaflet 1.9.4, TopoJSON Client 3.1.0, and the Level II worker dependencies are
vendored or bundled from exact npm package versions. Level II bzip decoding and
polar image rendering run off the main thread. A Content Security Policy blocks
unapproved executable, style, and network origins. To verify a change locally:

```bash
npm ci
npx playwright install chromium
npm run release:check
```

The static checks compare vendored files with the lockfile-installed packages.
Dependabot checks npm dependencies weekly. GitHub Pages deployment runs only
after the complete browser suite and advisory check pass for `main`; the deploy
then verifies the hosted commit, version, social image, and runtime asset types.

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
├── scripts/            # Static checks and Level II worker build
├── src/                # Level II worker source and browser shims
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
