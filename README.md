# StormView Radar

A modern, feature-rich weather radar visualization application built with vanilla JavaScript and Leaflet. Track severe weather in real-time with animated radar, NWS alerts, storm reports, and more.

<div align="center">

### 🌩️ [**Launch StormView Radar**](https://sysadmindoc.github.io/StormviewRadar/) 🌩️

[![Live Demo](https://img.shields.io/badge/🔴_LIVE-View_Demo-blue?style=for-the-badge&logoColor=white)](https://sysadmindoc.github.io/StormviewRadar/)

</div>

<img width="1399" height="1092" alt="2026-01-29 21_31_33-StormView Pro v3 - Chromium" src="https://github.com/user-attachments/assets/e2937d6a-ec98-4a53-a7be-621b676701ad" />


## Features

### Radar & Animation
- **Dual Radar Sources** — Switch between RainViewer (animated) and MRMS (Iowa State Mesonet)
- **Smooth Animation** — Play, pause, and step through radar frames with customizable speed (0.5x–3x)
- **Nowcast/Forecast** — View predicted precipitation up to 30 minutes ahead
- **8 Color Schemes** — Choose from multiple radar color palettes
- **Adjustable Opacity** — Fine-tune radar transparency for optimal map visibility

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
- **Air Quality** — WAQI air quality index (optional)

### Map Customization
- **5 Basemap Styles** — Dark, light, terrain, satellite, and streets
- **State & County Borders** — Toggleable political boundaries with adjustable width/opacity
- **City Labels** — Optional place name labels
- **Highway Overlay** — Road network visualization

### User Experience
- **Dark/Light Theme** — Full theme support with smooth transitions
- **Location Search** — Find any US location with OpenStreetMap geocoding
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

### WAQI (Air Quality)
Optional layer for air quality data.
1. Get a token at [aqicn.org](https://aqicn.org/data-platform/token/)
2. Enter in Settings → API tab

## Data Sources

| Layer | Source | Update Frequency |
|-------|--------|------------------|
| Radar | [RainViewer](https://www.rainviewer.com/) | ~10 minutes |
| MRMS | [Iowa State Mesonet](https://mesonet.agron.iastate.edu/) | ~2 minutes |
| Alerts | [NWS API](https://www.weather.gov/documentation/services-web-api) | Real-time |
| SPC Outlook | [SPC](https://www.spc.noaa.gov/) | Daily |
| Storm Reports | SPC | As reported |
| River Gauges | [USGS](https://waterservices.usgs.gov/) | Varies |

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

## Configuration Options

Access the settings panel (⚙️) to customize:

**General**
- Theme (dark/light)
- Show legend
- Border widths and opacity

**Radar**
- Opacity (30%–100%)
- Smooth interpolation
- Snow color mode
- Color scheme selection
- Frame delay (200ms–1200ms)
- Auto-refresh (5 min interval)
- Loop animation

## Project Structure

```
StormviewRadar/
├── index.html      # Single-file application
└── README.md       # Documentation
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
- [National Weather Service](https://www.weather.gov/) for alerts and forecasts
- [Storm Prediction Center](https://www.spc.noaa.gov/) for severe weather outlooks
- [Leaflet](https://leafletjs.com/) for the mapping library
- [OpenStreetMap](https://www.openstreetmap.org/) contributors

---

<div align="center">

**StormView Radar** — Track storms like a pro. 🌩️

[![GitHub Pages](https://img.shields.io/badge/Hosted_on-GitHub_Pages-222?style=flat-square&logo=github)](https://sysadmindoc.github.io/StormviewRadar/)

</div>
