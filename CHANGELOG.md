# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/cop1cat/inframap/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/cop1cat/inframap/releases/tag/v0.1.0
