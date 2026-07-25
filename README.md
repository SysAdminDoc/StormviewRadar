# StormView Radar

A modern, feature-rich weather radar visualization application built with vanilla JavaScript and Leaflet. Track severe weather in real-time with animated radar, NWS alerts, storm reports, and more.

<div align="center">

### ⛈️ [**Launch StormView Radar**](https://sysadmindoc.github.io/StormviewRadar/) ⛈️

[![Live Demo](https://img.shields.io/badge/🔴_LIVE-View_Demo-blue?style=for-the-badge&logoColor=white)](https://sysadmindoc.github.io/StormviewRadar/)

</div>

<img width="1399" height="1092" alt="StormView Pro v3 Screenshot" src="https://github.com/user-attachments/assets/e2937d6a-ec98-4a53-a7be-621b676701ad" />


## Features

### Radar & Animation
- **Four Radar Sources** — Switch between HRRR forecast guidance, RainViewer global history, MRMS US products, and NOAA nowCOAST
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
- **SPC Outlooks** — Storm Prediction Center convective outlooks
- **Storm Reports** — View tornado, hail, and wind damage reports
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
- **Settings Persistence** — All preferences saved to localStorage
- **Import/Export** — Backup and restore your configuration

## Quick Start

1. **Download** or clone the repository
2. **Open** `index.html` in any modern browser
3. **Done!** — No build process or dependencies required

```bash
git clone https://github.com/sysadmindoc/StormviewRadar.git
cd StormviewRadar
# Open index.html in your browser
```

> **Note:** When running locally from `file://`, RainViewer may be unavailable due to CORS restrictions. The app automatically falls back to MRMS radar in this case. For full functionality, serve via a local web server or use the hosted version.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause animation |
| `←` | Previous frame |
| `→` | Next frame |
| `R` | Refresh radar data |

## API Keys (Optional)

Some features require free API keys:

### OpenWeatherMap
Required for temperature, wind, clouds, and pressure layers.
1. Sign up at [openweathermap.org](https://openweathermap.org/api)
2. Copy your API key
3. Paste in Settings → API tab

## Data Sources

| Layer | Source | Update Frequency |
|-------|--------|------------------|
| Global radar history | [RainViewer](https://www.rainviewer.com/) | Provider dependent |
| HRRR forecast radar | [Iowa State Mesonet](https://mesonet.agron.iastate.edu/) | Model cycle |
| MRMS | [Iowa State Mesonet](https://mesonet.agron.iastate.edu/) | ~2 minutes |
| NOAA radar mosaic | [nowCOAST](https://nowcoast.noaa.gov/) | Provider dependent |
| Alerts | [NWS API](https://www.weather.gov/documentation/services-web-api) | Real-time |
| SPC Outlook | [SPC](https://www.spc.noaa.gov/) | Daily |
| Storm Reports | SPC | As reported |
| Lightning | Iowa State Mesonet | ~5 minutes |
| Satellite | GOES East (IEM) | ~15 minutes |
| River Gauges | [USGS](https://waterservices.usgs.gov/) | Varies |

Location searches use the public [Nominatim](https://nominatim.openstreetmap.org/) service. Requests are limited to one per second, include the project contact address required by the service policy, and are not stored in StormView search history.

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Technology Stack

- **Leaflet** — Interactive mapping
- **OpenStreetMap** — Base map tiles and geocoding
- **Vanilla JS** — No frameworks, no build tools
- **CSS Variables** — Dynamic theming
- **LocalStorage** — Settings persistence

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
- [Leaflet](https://leafletjs.com/) for the mapping library
- [OpenStreetMap](https://www.openstreetmap.org/) contributors
- [CARTO](https://carto.com/) for basemap tiles

---

<div align="center">

**StormView Radar** — Track storms like a pro. ⛈️

[![GitHub Pages](https://img.shields.io/badge/Hosted_on-GitHub_Pages-222?style=flat-square&logo=github)](https://sysadmindoc.github.io/StormviewRadar/)

</div>
