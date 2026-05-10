# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-05-10

Initial public release. CLI + viewer + self-hosting artifacts.

### CLI (`inframap`)

- YAML → `infra.json` generator with deterministic output (sorted by `id`,
  stable key order in `tags`/`links`, all optional fields explicit).
- Pydantic models with strict id (`^[a-z0-9][a-z0-9-]*$`), color (`#RRGGBB`),
  and URL validation.
- Cross-object validation: duplicate ids, duplicate `call.id`, self-call,
  unknown group/parent, self-parent, parent cycles. Warnings for broken
  call targets and missing owner/description.
- `inframap generate` and `inframap validate`, both with `--strict` and
  exit codes 0/1/2.
- `--output -` writes to stdout.
- JSON Schema (`v1.json`) auto-generated from Pydantic; sync verified by
  test and CI.
- Tooling: ruff, mypy strict, pytest, pre-commit.

### Viewer (`viewer/`)

- Static Svelte 5 + Vite + TypeScript bundle. No backend, no analytics.
- Cytoscape.js + cose-bilkent layout with compound-node groups.
- Three input methods: drag-n-drop, paste (`Ctrl+V`), and `#data=` URL
  fragment (gzip + base64url via native `CompressionStream`).
- Local cache of last-loaded JSON in `localStorage`. Manual node positions
  are persisted per JSON-content hash.
- Click-to-highlight neighbourhoods (Obsidian-style) with edge animation,
  per-call-type styles (`sync`/`async`/`event`/`unknown`/`broken`), and
  ghost nodes for broken targets.
- Hover tooltips (tippy.js), per-service detail panel anchored to the
  clicked node, search with Owner/Group/Tag filter chips.
- Stats panel: totals, by call type, broken links, missing owner/desc,
  top owners, group sizes — every row links back to the graph.
- Mini-map (cytoscape-navigator), zoom/fit controls, middle-click pan.
- Light/dark themes, English/Russian UI.
- SVG export with explicit theme choice (current / light / dark).
- Built-in sample for the empty state.

### Self-hosting

- `viewer/Dockerfile` — multi-stage (bun build → nginx:alpine) with
  read-only-friendly defaults.
- `viewer/docker-compose.yml` — drops capabilities, tmpfs for nginx
  scratch dirs, no privilege escalation.
- `deploy/helm/inframap-viewer/` — Helm chart with Deployment, Service,
  Ingress, HPA, optional NetworkPolicy (empty egress — viewer is purely
  client-side).

### CI/CD

- `ci.yml` — pytest, ruff, mypy, schema-sync check, viewer build.
- `pages.yml` — viewer + JSON Schema published to GitHub Pages on tag.
- `docker.yml` — GHCR image build on push to main and version tags.

[Unreleased]: https://github.com/cop1cat/inframap/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/cop1cat/inframap/releases/tag/v0.1.0
