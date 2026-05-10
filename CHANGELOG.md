# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-05-10

### Added

- `inframap` CLI: YAML → `infra.json` generator with deterministic output (sorted by `id`, stable key order in `tags`/`links`, all optional fields written explicitly).
- Pydantic models with strict id (`^[a-z0-9][a-z0-9-]*$`), color (`#RRGGBB`), and URL validation.
- Cross-object validation: duplicate ids, duplicate `call.id`, self-call, unknown group/parent, self-parent, parent cycles. Warnings for broken call targets and missing owner/description.
- `inframap generate` and `inframap validate`, both with `--strict` and exit codes 0/1/2.
- `--output -` writes to stdout.
- JSON Schema (`v1.json`) auto-generated from Pydantic; sync verified by test and CI.
- Static Svelte 5 + Vite + TypeScript viewer at `cop1cat.github.io/inframap`. No backend, no analytics.
- Cytoscape.js + cose-bilkent layout with compound-node groups.
- Three input methods for the viewer: drag-and-drop, paste (`Ctrl+V`), and `#data=` URL fragment (gzip + base64url via native `CompressionStream`).
- Local cache of the last-loaded JSON in `localStorage`. Manual node positions persisted per JSON-content hash.
- Click-to-highlight neighbourhoods with edge animation, per-call-type styles (`sync`/`async`/`event`/`unknown`/`broken`), and ghost nodes for broken targets.
- Hover tooltips (tippy.js), per-service detail panel anchored to the clicked node, search with Owner/Group/Tag filter chips.
- Stats panel: totals, by call type, broken links, missing owner/description, top owners, group sizes — every row links back to the graph.
- Mini-map (cytoscape-navigator), zoom/fit controls, middle-click pan.
- Light/dark themes, English/Russian UI.
- SVG export with explicit theme choice (current / light / dark).
- Built-in sample shown on the empty state.
- `viewer/Dockerfile` — multi-stage (bun build → nginx:alpine) and `viewer/docker-compose.yml` with read-only filesystem, dropped capabilities, and tmpfs for nginx scratch dirs.
- `deploy/helm/inframap-viewer/` — Helm chart with Deployment, Service, Ingress, HPA, and optional NetworkPolicy (empty egress).
- CI workflow: pytest, ruff, mypy, JSON-schema sync check, viewer `svelte-check` and build.
- Pages workflow: viewer and `v1.json` published to GitHub Pages on `v*` tags.
- Docker workflow: viewer image published to GHCR on push to `main` and on version tags.

### Security

- Pre-commit, ruff, and mypy strict are enabled from the first commit.
- Viewer ships with `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy` headers (nginx config).
- Helm chart defaults to non-root, read-only filesystem, all capabilities dropped except `NET_BIND_SERVICE`.
- Viewer makes no network requests with user data; share links carry the data only inside the URL fragment, which never reaches the server.

[Unreleased]: https://github.com/cop1cat/inframap/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/cop1cat/inframap/releases/tag/v0.1.0
