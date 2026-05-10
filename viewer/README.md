# InfraMap Viewer

Static, client-side viewer for `infra.json`. Drop a file (or paste, or share a `#data=` link) and explore your services as an interactive graph.

**Public instance:** https://cop1cat.github.io/inframap

**Privacy:** all data stays in the browser. No server, no analytics, no uploads. Share-links encode the JSON directly into the URL fragment (`#data=…`) using gzip + base64 — nothing is sent to GitHub Pages.

## Stack

Svelte 5 + Vite + TypeScript + Cytoscape.js (cose-bilkent layout, navigator minimap, SVG export) + tippy.js + lucide-svelte.

## Develop

```bash
bun install
bun run dev          # http://localhost:5173
bun run check        # svelte-check
bun run build        # → dist/
```

## Self-hosting

For teams that don't want to use the public instance, the viewer is a static bundle and ships with both a Docker image and a Helm chart.

### Docker

```bash
cd viewer
docker compose up -d
# open http://localhost:8080
```

Or build the image directly:

```bash
docker build -t inframap-viewer .
docker run -p 8080:80 inframap-viewer
```

### Kubernetes (Helm)

```bash
helm install inframap deploy/helm/inframap-viewer \
  --set ingress.host=inframap.internal.example.com
```

See [`deploy/helm/inframap-viewer/values.yaml`](../deploy/helm/inframap-viewer/values.yaml) for all knobs.

## Generate `infra.json`

Use the [`inframap` CLI](../README.md) — point it at your `infra.yaml` and it produces the viewer's input.
