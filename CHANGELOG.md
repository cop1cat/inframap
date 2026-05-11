# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.4] - 2026-05-12

### Fixed

- Stats panel did not reappear after being closed: cytoscape canvases gave the `.graph` flex item a large intrinsic min-size, preventing `StatsPanel` from claiming its 280px on remount. Added `min-width: 0` and `overflow: hidden` to `.graph`.
- "Drop infra.json here" overlay could get stuck on screen when a drag was cancelled or left the window. `attachDragAndDrop` now uses a dragenter/dragleave depth counter and clears on `dragend`/window `blur`.

### Changed

- Mobile topbar (<=720px): title and burger now share one row; `SearchBar` drops to its own full-width row and filter chips (owner/group/tag/kind) wrap below the input instead of squeezing it.

## [0.2.3] - 2026-05-11

### Changed

- Mobile topbar (<=720px): controls (share, export, stats, language, theme, help, close, legend) collapsed behind a burger button so only title, search, and burger are visible at rest. Recovers ~70% of vertical space on phones.
- `SearchBar` no longer enforces `min-width: 600px`; on narrow viewports the input shrinks instead of overflowing the topbar.
- Minimap defaults to off on first load when viewport is <=720px (toggle still available in zoom controls).

### Fixed

- GitHub Pages deploy: `pages.yml` now sets `INFRAMAP_BASE=/<repo>/` for the viewer build so asset URLs in `index.html` resolve under the project sub-path. 0.2.1 shipped without this and the published site failed to load any JS chunks (MIME `text/html` on 404).

## [0.2.1] - 2026-05-11 [YANKED]

> Yanked: the published GitHub Pages build had `base=/`, so all asset requests went to `cop1cat.github.io/assets/...` and 404'd. Code changes are otherwise good and are re-released as 0.2.2.

### Security

- Sanitize service link `href`s to `http(s)`/`mailto` only — blocks `javascript:` XSS from crafted `infra.json` delivered via share links.
- Cap gzip decompression of share-link payloads at 8 MB to refuse gzip-bomb input.
- Whitelist `Service.kind` and `ServiceCall.type` before they reach Cytoscape class names.
- `Content-Security-Policy` header in nginx config: `default-src 'self'`, no remote scripts, no inline JS, `frame-ancestors 'self'`, `form-action 'none'`.
- Switch container image to `nginxinc/nginx-unprivileged` (runs as non-root on port 8080).

### Fixed

- Stats panel toggle: graph no longer becomes unresponsive after hiding/showing the panel (forced `cy.resize()` on toggle).
- Share button: fall back to `execCommand("copy")` and a manual-copy modal when the Clipboard API is blocked (HTTP origin, lost focus, mobile).
- Race where `positionsKey` resolved after `infra` was set, causing saved node positions to never load on first render.
- Reload-with-new-JSON no longer leaks Cytoscape event listeners, `requestAnimationFrame` handles, animation intervals, or `window` mouse listeners.
- `SearchBar` tag filter (`$derived` was returning a function, not the value).
- Manual node positions stored in `localStorage` now use real LRU (timestamped) instead of lexical sort of hashes.

### Changed

- Responsive layout for mobile: topbar wraps, side panels become sheets, zoom controls reflow.
- `<html lang>` and drop-zone overlay text now follow the active UI language.
- Help overlay and share modal manage focus on open/close.
- `vite.config.ts` `base` now configurable via `INFRAMAP_BASE` env (default `/`, set `./` for sub-path / GitHub Pages builds).
- CLI emitter strips Pydantic's trailing slash from bare-host service link URLs.

## [0.2.0] - 2026-05-10

### Added

- `Service.kind` (semantic, not visual): `service` (default), `database`, `cache`, `queue`, `gateway`, `worker`, `external`, `storage`, `function`. Drives shape and inline icon in the viewer; `By kind` breakdown in stats; `Kind` filter chip in search. Optional and additive — existing `infra.json` keeps rendering as before.
- Reset-layout button: discards manual node positions for the current `infra.json` and re-runs the cose-bilkent layout without reload.
- `meta.description` is now shown as a subtitle in the topbar.

### Changed

- Vite build splits into separate chunks: app code (~36 KB gzip), cytoscape vendor (~174 KB gzip), tippy. Caching survives app-only changes.
- Viewer-side validation no longer drops events on a stuck hover tooltip; tooltip hides on tap, drag, and pointer leave.

### Removed

- `cytoscape-expand-collapse` dependency: the double-click conflict it caused outweighed the rarely-used collapse feature.

## [0.1.0] - 2026-05-10

### Added

- `inframap` CLI (Python 3.12, click) with `generate` and `validate` commands.
- `infra.json` schema v1, generated from Pydantic; published alongside the viewer.
- Validation: id/color/URL formats, duplicate ids, duplicate `call.id`, self-call, unknown/cyclic group parents. Warnings for broken call targets and missing owner/description.
- `--strict` (warnings → exit 2, no JSON written), `--output -` (stdout).
- Deterministic JSON output (sorted arrays by `id`, explicit `null`s, stable `tags`/`links` order).
- Static Svelte 5 viewer with Cytoscape.js + cose-bilkent.
- Three input methods: drag-and-drop, paste, `#data=` URL fragment (gzip + base64url, no upload).
- Highlight on click, edge animation, per-call-type styles, ghost nodes for broken targets.
- Hover tooltips, anchored service detail panel, search with Owner/Group/Tag filters, stats panel.
- Mini-map, zoom controls, middle-click pan, SVG export with theme choice, EN/RU UI, light/dark themes.
- Manual node positions persisted in `localStorage` per JSON-content hash.
- `viewer/Dockerfile` + `docker-compose.yml`.
- Helm chart at `deploy/helm/inframap-viewer/` (Deployment, Service, Ingress, HPA, optional NetworkPolicy).
- GitHub Actions: CI (pytest, ruff, mypy, schema sync, viewer build), Pages deploy on `v*` tags, GHCR image build.

[Unreleased]: https://github.com/cop1cat/inframap/compare/v0.2.4...HEAD
[0.2.4]: https://github.com/cop1cat/inframap/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/cop1cat/inframap/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/cop1cat/inframap/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/cop1cat/inframap/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/cop1cat/inframap/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/cop1cat/inframap/releases/tag/v0.1.0
