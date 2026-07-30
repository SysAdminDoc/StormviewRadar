# Changelog

All notable changes to StormviewRadar will be documented in this file.

## [Unreleased]

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
