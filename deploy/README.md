# Self-hosting InfraMap viewer

For teams that prefer not to use the public instance at `cop1cat.github.io/inframap`. The viewer is a static bundle, so deployment is simple.

## Docker

```bash
cd viewer
docker compose up -d
# http://localhost:8080
```

The compose file runs the container read-only, drops all capabilities except `NET_BIND_SERVICE`, and uses tmpfs for `/var/cache/nginx`.

## Kubernetes (Helm)

```bash
helm install inframap deploy/helm/inframap-viewer \
  --set ingress.host=inframap.internal.example.com \
  --set image.repository=ghcr.io/your-org/inframap-viewer \
  --set image.tag=v0.1.0
```

Defaults:
- 2 replicas, no autoscaling.
- Read-only filesystem, non-root, all capabilities dropped.
- ClusterIP + Ingress (toggle with `ingress.enabled`).
- Optional NetworkPolicy with empty egress (the viewer doesn't talk to anything server-side).

See `deploy/helm/inframap-viewer/values.yaml` for everything that's configurable.

## Privacy notes

The viewer is purely client-side. It loads `infra.json` from drag-and-drop, paste, or a `#data=…` URL fragment. It never makes a network request with that data. Hosting it inside your perimeter just means the static asset itself is served from your network.
