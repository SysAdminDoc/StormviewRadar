# Changelog

All notable changes to StormviewRadar will be documented in this file.

## [Unreleased]

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

## [v0.1.0] - %Y->- (HEAD -> main, origin/main, origin/HEAD)

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
