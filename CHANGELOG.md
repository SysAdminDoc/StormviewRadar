# Changelog

All notable changes to StormviewRadar will be documented in this file.

## [Unreleased]

- Map tooltips now escape the text they are given. Leaflet renders tooltip content as HTML and has no fix for CVE-2025-69993, and four tooltips passed alert names, storm cell identifiers, and saved geofence names through without escaping them. The release gate now refuses any Leaflet popup or tooltip fed by the truncate-only helper.
- NEXRAD Level II can now render any elevation cut in the volume rather than only the lowest one. The tilt list is built from whatever the decoded volume actually contains for the selected product, the choice persists, and an embed URL can pin it with `tilt=`.
- The NEXRAD Level II site picker now reports each radar's health. Sites in maintenance, sites that are not operating, and sites whose last volume is more than twenty minutes old are marked in the list, and the selected site shows its status and the age of its last volume instead of silently displaying an old scan.
- The first-visit tip now measures the alert banner instead of assuming its height, so it no longer covers a live warning when the event name wraps to two lines on a narrow screen.
- The radar legend keeps clear of the middle of the map down to a 320-pixel viewport, where the wider readable panel had started to overlap it.
- Layer icons in the quick toolbar are drawn in the system palette under Windows High Contrast. Their author colours previously survived forced-colors mode on SVG, leaving the yellow and cyan icons close to invisible on a light high-contrast theme.
- The app now asks the browser for durable storage at the moment it decides it has offline data worth keeping, and the Status tab reports what the browser actually answered. Cached radar frames and tiles previously sat in best-effort storage that a browser may evict at any time, while the install prompt advertised them as available offline.
- State and county boundaries now ship with the app instead of loading from a third-party CDN at runtime. They were the last remote asset, so the content security policy no longer allows any CDN origin at all, and the boundary files are covered by the same lockfile integrity check as every other vendored asset.
- Made the radar legend readable. Its tick labels were laid out in an 18-pixel column, so "75+ dBZ" and "5 dBZ" wrapped one character per line and the scale was unreadable at every screen size. The legend now sizes to its labels and keeps clear of the middle of the map.
- Moved the first-visit tip clear of the map chrome. It is a toast, and the toast container sat at the same height as the quick toolbar, so on a narrow screen the tip covered ten of the eleven layer buttons and the active-alert banner, and on a wide screen it covered the last button.
- Gave the radar, alerts, lightning, satellite, SPC, and reports buttons in the quick toolbar their own coloured icons. Below 768px the toolbar hides its text labels, and those six previously collapsed into identical seven-pixel dots that nothing distinguished.
- A first visit now opens on observed MRMS reflectivity over the dark basemap instead of HRRR forecast guidance over satellite imagery, so the opening view shows what is happening now and the radar ramp reads against a low-chroma ground. Saved profiles keep whatever source and basemap they already had.
- Fixed the tropical cyclone overlay, which drew nothing outside the Atlantic. Its East Pacific source pointed at a host that no longer resolves, and two of the four layer ids it queried on the Atlantic service are group layers that answer with an error rather than features. It now reads Atlantic, East Pacific, and Central Pacific storms plus the seven-day development areas from the one live NHC service, resolving layer ids by name and probing forecast-point counts first so an empty basin costs a single small response.
- Tropical requests that fail now say so. A basin whose probe returned an error used to be indistinguishable from a basin with no storm, and the overlay reported success either way.
- Upgraded CesiumJS to 1.145.0, which replaces the bundled DOMPurify 3.4.12 in the deployed engine with the patched 3.4.14, and tightened the release gate to fail on moderate advisories so a shipped-code advisory can no longer pass silently.

## [v0.2.0] - 2026-08-12

- Added Environment and Climate Change Canada's official 1 km North American radar rain-rate source with a three-hour six-minute GeoMet WMS timeline, on-demand single-frame retrieval, Reduced Data capping, truthful mm/h legend, cross-border coverage, and licence-linked attribution.
- Added a six-hour, five-minute MRMS reflectivity timeline backed by immutable IEM archive frames, bounded playhead-window prefetching, decoded-image release, persistent LRU reuse, one-hour Reduced Data capping, and current-tile freshness limits.
- Added bounded attributed radar-animation export with a built-in looping GIF encoder, runtime-gated MP4 canvas recording, 24-frame sampling, configurable timing, progress/cancellation, and deterministic playhead restoration.
- Added a standards-based PWA manifest and a localized install offer gated on browser install eligibility plus service-worker verification that both the offline shell and a completed last radar frame are cached, with standalone/embed suppression and bounded dismissal.
- Added three localized archived storm-training scenarios with replay-linked, numbered reflectivity study cues, official-warning separation, persistent not-live disclosure, mobile-safe controls, and deterministic return to live radar.
- Added a mobile Chasecaster field mode with high-accuracy GPS following, compass-assisted orientation and course fallback, readable speed/accuracy telemetry, explicit safety guidance, and complete sensor/map-layer teardown.
- Added deterministic, non-persistent iframe embed mode with bounded URL configuration for map view, radar/source presentation, credential-free overlays, localization, optional controls/legend/autoplay, visible attribution, and a full-map escape link.
- Added one-click, bounded 2× PNG snapshots of the visible primary map with its composed radar/overlay frame, provider-valid time, source/product identity, and current map/data attribution.
- Added persistent standard, high-contrast, and color-blind-safe visual palettes across provider radar, native Level II products, alert polygons, MESH hail, storm tracks, 3D threat markers, legends, and core interface colors.
- Added a persistent floating mini radar with synchronized frames and warning polygons, primary-map follow/recenter controls, responsive collision-free alert scrolling, visible attribution, diagnostics, and full Leaflet/WebGL teardown.
- Added a persistent two-city comparison mode with independent map navigation, shared radar frames and warning polygons, searchable comparison locations, responsive desktop/mobile layouts, and explicit second-map resource cleanup.
- Added a persistent, bounded radar preload window around the playhead with immediate resource reconciliation, Reduced Data capping, localized controls, and mounted-frame diagnostics.
- Added a bounded, credential-safe service-worker fallback for the app shell, recent radar frames/metadata, and NWS alert polygons with localized cached-data disclosure.
- Added single-frame WebGL radar compositing with linear texture filtering, seam-free padded rendering, GPU context release during animation/teardown, and automatic DOM-tile fallback.
- Added a credential-safe IndexedDB tile cache with read-recency tracking, entry/byte limits, LRU eviction, expiry policies, cache diagnostics, blob URL cleanup, and direct-image fallback.
- Added persistent per-overlay visibility controls for tile, marker, SVG, and canvas layers while preserving each layer's authored styling.
- Replaced the legacy line-tile road overlay with bounded, cancellable Iowa 511 closure/work-zone events, grouped duplicate endpoints, provider freshness, safe source links, and explicit Iowa-only coverage.
- Added bounded session-only GeoJSON/KML overlays with safe geometry/property parsing, escaped popups, explicit visibility/removal controls, and no persistence or network upload.
- Replaced exact-English UI rewriting with parity-checked English/Spanish message catalogs, centralized locale-aware plurals/numbers/dates/units, and localized primary ARIA labels plus recovery states.
- Kept startup loading visible until radar reaches ready/fallback/error, added semantic progress and retry states, exposed first-frame/loop/render/drop/byte diagnostics, and added Reduced Data mode with bounded frame preload and paused data-heavy overlays.
- Corrected provider/runtime/privacy documentation, documented key modules and coverage limits, and added a clean-tree release command that synchronizes every version surface, runs the release gate, commits, and tags.
- Upgraded the exact-pinned esbuild toolchain from 0.25.6 to 0.28.1 and rebuilt/revalidated the local Cesium and NEXRAD Level II worker bundles without dynamic evaluation.
- Made saved-location writes transactional with quota recovery guidance, JSON export, keyboard-labeled removal, and undoable delete/clear actions; location permission failures now explain recovery without repeated prompts, and rejected OpenWeatherMap keys disable only the requested layer with diagnostics.
- Extracted a capability-aware registry for all radar and overlay providers, replacing UI source/layer branches with uniform load, cancel, status, and disposal lifecycle dispatch.
- Completed modal isolation, focus return, visible layer-sheet closure, ARIA tab/tabpanel semantics with arrow navigation, WCAG 2.2 control targets, a named keyboard-accessible map-center forecast, and theme-independent 3D status contrast.
- Kept saved locations and header controls within 320px/390px viewports, exposed bookmark actions on touch and keyboard focus, and centralized duplicate layer, source, product, basemap, and ARIA state across desktop, quick, and mobile controls.
- Added full Chromium plus Firefox/WebKit startup, radar, keyboard, and ARIA release coverage; both production radar workers now decode deterministic binary fixtures, hosted checks cover lazy modules and Cesium assets, and local HTTP assets remain usable in WebKit without weakening hosted HTTPS.
- Made Level II and MESH cancellation terminate active worker computation, reject all pending work cleanly, ignore stale worker events, and recreate worker state on retry; radar refreshes now retain rollback layers until restore or one-time permanent disposal.
- Isolated tile failure windows and retry backoff by provider origin so one failing service cannot pause healthy radar or basemap tiles, with paused-provider diagnostics and retry times.
- Made SPC watch, MCD, probabilistic outlook, and SIGMET/AIRMET loads generation-safe, preserving stale overlays on refresh failure and reporting distinct lifecycle states in diagnostics.
- Consolidated NWS CAP updates and cancellations into stable alert series, resolved zone-only alerts through a bounded NWS geometry cache, and exposed any still-unmapped alerts in an explicit list.
- Replaced mislabeled Special Weather Statements with official SPC Mesoscale Discussion polygons and removed the duplicate false-PIREP control while retaining honest SIGMET/AIRMET coverage.
- Made clean-checkout builds license-complete by tracking the exact Cesium license and retaining dependency notices in the deployed engine bundle.
- Fixed RainViewer integration to use its supported past-radar frames, Universal Blue palette, and native zoom limit.
- Added source capability guidance and disabled unsupported radar products.
- Clarified analysis, forecast, past, and latest timestamps.
- Added cancellable, time-bounded HTTP requests with status validation and stale-response protection.
- Added persistent provider health states, retry actions, MRMS fallback status, and last-good radar restoration.
- Hardened provider popups, search, toasts, bookmarks, WebSocket data, and forecast alerts against HTML injection.
- Added bounded settings/bookmark validation and deterministic Playwright security tests in CI.
- Restored visible, clickable basemap and data-provider attribution and switched core identity images to bundled assets.
- Made Nominatim search requests cancellable, identified, and compliant with the public service's one-request-per-second limit.
- Scoped USGS river requests to the visible map, spatially sampled point overlays, and enforced hard feature budgets.
- Added cancellable overlay loads and deterministic teardown checks; removed the unused, leaky Blitzortung WebSocket implementation.
- Replaced client-clock radar timestamps with HRRR, MRMS, RainViewer, and nowCOAST provider metadata.
- Added model initialization, forecast lead, data age, timezone, capability-driven playback, and explicit global/CONUS coverage status.
- Added named keyboard controls, switch/radio state, accessible search suggestions, range labels, and focus-managed dialogs/sheets.
- Added reduced-motion and forced-colors styles plus automated WCAG A/AA, keyboard, focus, and 390px light-theme checks.
- Added a versioned settings schema with legacy basemap/source migration and validation for future imports.
- Removed API keys from settings exports, masked key inputs, documented browser-profile exposure, and surfaced quota/import recovery errors.
- Vendored exact Leaflet and TopoJSON runtime assets, added CSP origin controls, lockfile drift checks, weekly dependency updates, and high-severity advisory gating.
- Corrected the test server's CSS content type and strengthened forced-colors contrast and mobile settings-panel behavior.
- Added deterministic failed-provider fallback coverage and gated GitHub Pages deployment on the complete browser and advisory suite.
- Added a live diagnostics view with provider freshness, coverage, fallback/retry state, resource counts, redacted request history, and copyable secret-free reports.
- Unified the v0.1.0 identity across package, page metadata, loading UI, diagnostics, README, and release notes, with automated drift and hosted-commit checks.
- Removed the unused WAQI credential field and migrated schema v2 settings to discard that unimplemented secret surface.
- Added schema v3 language and unit preferences, Spanish UI/forecast localization, locale-aware dates, metric provider requests, and converted observation/radar units with English fallback.
- Added schema v4 NEXRAD Level II single-site mode with nearest-site selection, NOAA/Unidata archive discovery, off-thread bzip decoding, and native reflectivity, velocity, ZDR, and correlation-coefficient rendering.
- Added a bounded Level II rotation-candidate overlay that requires sustained adjacent-gate shear inside precipitation, clusters nearby detections, and labels every result as an automated heuristic rather than a warning.
- Added an optional NOAA MRMS MESH hail-size overlay with direct S3 discovery, worker-based GRIB2/PNG decoding, safety limits, localized units, and explicit estimate-not-warning guidance.
- Added NOAA/NESDIS GeoColor and IR-sandwich satellite layers, and fixed infrared/water-vapor toggles so disabling them releases the correct tile resources.
- Added a combined current GOES-East M1/M2 mesoscale-sector overlay with lifecycle diagnostics and full resource cleanup.
- Added current NEXRAD storm-cell tracks with one-hour archived history, bounded live updates, 30/60-minute motion projections, threat-aware styling, and explicit automated-guidance labeling.
- Added opt-in Web Audio alert tones with silent first-load priming, unseen-alert deduplication, urgency patterns, and configurable severity, event-type, and map-center distance filters.
- Added named local geofences with bounded validation, optional map overlays, persistent browser-only storage, and polygon-distance alert-audio matching.
- Added six-hour historical event replay with five-minute IEM NEXRAD composites, frame-synchronized warning polygons, and bounded single-image rendering.
- Added a mobile-first visible-map alert banner with threat prioritization, session dismissal, polygon focus, accessible touch targets, and reduced-motion behavior.
- Added an on-demand Cesium 3D storm-top globe with measured IEM echo-top labels, threat-prioritized columns, explicit display scaling, local imagery, and CSP-safe teardown.
- Added issuance-age warning fills that fade over three hours while preserving hazard-colored borders, issued/expires popup times, a localized age legend, and historical-replay timing.
- Added bounded, type-aware storm-report clustering at overview zooms with keyboard-labeled zoom-in markers and automatic individual-pin rendering at zoom 9.

## [v0.1.0] - 2026-07-25

- Added: Add files via upload
- Added: Add files via upload
- Changed: Update index.html
- Added: Add files via upload
- Changed: Update README.md
- Changed: Update index.html
- logo upload
- Many optimizations
- Revise README for StormView Radar application
- Added: Add files via upload

## Roadmap archive — 2026-08-10 — ROADMAP.md

<details>
<summary>Original roadmap snapshot</summary>

```markdown
# StormView Radar Roadmap

Incomplete, actionable work only.

## Planned Features

### Map and overlays

- Highway overlay with state DOT closure feeds where available
  Research note: start with the public USDOT WZDx Feed Registry and Iowa DOT’s credential-free WZDx/ArcGIS feeds; show jurisdiction, freshness, and feed coverage rather than implying national completeness.
- Overlay opacity individually controllable per layer, not only radar

### Performance and resilience

- IndexedDB tile cache with LRU eviction to replace the in-memory-only cache
- WebGL tile layer for smoother zoom and interpolation
- Service Worker offline fallback with cached last frames and alert polygons
- Configurable preload window around the playhead

### UX

- Split-screen two-city mode
- Picture-in-picture mini radar that remains visible while scrolling alerts
- High-contrast and color-blind-safe palettes
- One-click attributed PNG snapshot of the current view and frame
- Embed mode with configurable URL parameters

### Later product ideas

- Chasecaster mode with compass-assisted mobile field orientation
- Training overlays with annotated example storms
- PWA install prompt tied to offline last-frame availability
- Animated GIF/MP4 export through canvas capture
- Six-hour radar-history slider with frame-aware caching
- Environment Canada radar source for cross-border coverage
```

</details>
