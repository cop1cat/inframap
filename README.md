# InfraMap

**English** · [Русский](README.ru.md)

A CLI tool: one YAML describing services and groups → one `infra.json` for the [viewer](https://cop1cat.github.io/inframap).

## Install

From GitHub:

```bash
# uv (recommended)
uv tool install git+https://github.com/cop1cat/inframap

# pip
pip install git+https://github.com/cop1cat/inframap
```

After install the `inframap` command is on your PATH.

## Quick start

1. Write `infra.yaml` (see below).
2. Run `inframap generate infra.yaml` — you get `infra.json`.
3. Open the [viewer](https://cop1cat.github.io/inframap) and drop the file in.

```bash
inframap generate infra.yaml                  # → ./infra.json
inframap generate infra.yaml -o out.json
inframap generate infra.yaml -o -             # write to stdout
inframap generate infra.yaml --strict         # warnings → exit 2, no JSON written

inframap validate infra.yaml                  # validate only
inframap validate infra.yaml --strict
```

**Exit codes:** `0` — success, `1` — validation error, `2` — warnings present and `--strict` was passed.

---

## Writing the YAML

The YAML has three sections: `meta` (map title), `groups` (containers) and `services` (the services and their dependencies). All sections are optional, but you usually need at least `services`.

### Minimal example

```yaml
services:
  - id: api
    label: API
  - id: db
    label: Database
```

That's enough — two services, no relations. In practice you'll want more.

### Full example

```yaml
meta:
  title: "My Infrastructure"
  description: "Production services map"

groups:
  - id: cloud
    label: Cloud
  - id: aws
    label: AWS
    parent: cloud           # nested group
    color: "#FF9900"        # hint colour for the viewer

services:
  - id: api-gateway
    label: API Gateway
    kind: gateway
    group: aws
    description: "Entry point for all client traffic"
    owner: team-platform
    tags:
      tier: critical
      layer: edge
    links:
      docs: https://docs.example.com/api-gateway
      repo: https://github.com/org/api-gateway
      runbook: https://wiki.example.com/runbooks/api-gateway
    calls:
      - id: auth-service
        type: sync
      - id: billing-service
        type: async

  - id: auth-service
    label: Auth
    group: aws
    description: "Issues and validates JWTs"
    owner: team-platform
    calls:
      - id: users-db
        type: sync
      - id: sessions-cache
        type: sync

  - id: billing-service
    label: Billing
    group: aws
    description: "Charges and invoices"
    owner: team-billing
    calls:
      - id: events-bus
        type: event
      - id: stripe
        type: sync

  - id: users-db
    label: Users DB
    kind: database
    group: aws
    description: "PostgreSQL primary"
    owner: team-platform

  - id: sessions-cache
    label: Sessions
    kind: cache
    group: aws
    description: "Redis cluster"
    owner: team-platform

  - id: events-bus
    label: Events Bus
    kind: queue
    group: aws
    description: "Event bus"
    owner: team-platform

  - id: stripe
    label: Stripe
    kind: external
    description: "Payment provider"
    owner: team-billing
    links:
      docs: https://stripe.com/docs/api
```

### Sections in order

#### `meta` — map title

```yaml
meta:
  title: "My Infrastructure"      # rendered in the viewer's header
  description: "Optional"         # subtitle, can be omitted
```

If the section is absent, the title falls back to "Infrastructure Map".

#### `groups` — containers for services

Groups visually cluster services (by cloud, team, domain — whatever makes sense).

```yaml
groups:
  - id: aws            # unique id
    label: AWS         # human-readable name
    color: "#FF9900"   # optional: border colour in the viewer
    parent: cloud      # optional: nest into another group
```

**Nesting:** keep it within 2 levels. Deeper nesting starts to break the viewer's layout.

#### `services` — services and their dependencies

Each service is a node on the graph. `calls` describes outgoing dependencies (arrows on the graph).

```yaml
services:
  - id: api-gateway              # required, unique among services
    label: API Gateway           # required, shown on the node
    kind: gateway                # optional, defaults to service (see below)
    group: aws                   # optional: which group to place it in
    description: "..."           # optional but recommended
    owner: team-platform         # optional but recommended
    tags:                        # optional: arbitrary tags for filtering
      tier: critical
      layer: edge
    links:                       # optional: links shown in the tooltip
      docs: https://...
      repo: https://...
    calls:                       # optional: outgoing calls
      - id: auth-service         # id of the called service
        type: sync               # required
```

**Service kinds (`kind`):**

| `kind`     | What it represents                | How it's drawn                |
|------------|-----------------------------------|-------------------------------|
| `service`  | regular service (default)         | circle                        |
| `database` | RDBMS, NoSQL                      | rounded rectangle + 🗄        |
| `cache`    | Redis, Memcached                  | hexagon + ⚡                  |
| `queue`    | Kafka, SQS, event bus             | rounded rectangle + 💬        |
| `gateway`  | API gateway, edge                 | diamond + 🚪                  |
| `worker`   | background jobs                   | square + ⚙                   |
| `external` | third-party service               | dashed circle + 🌐            |
| `storage`  | S3, blob storage                  | rounded rectangle + 💾        |
| `function` | lambda, edge function             | pentagon + ⚡                 |

The field is optional and defaults to `service`. It's a semantic hint: you describe intent, the viewer decides how to draw it.

**Call types (`type`):**

| Value     | When to use                                     | How it's drawn |
|-----------|-------------------------------------------------|----------------|
| `sync`    | HTTP/gRPC request/response, you wait for result | Solid line     |
| `async`   | Fire-and-forget over a queue                    | Dashed         |
| `event`   | Pub/sub, bus, fan-out                           | Dotted         |
| `unknown` | You're not sure, but the link exists            | Grey line      |

There is **no default**: you have to pick one. If you don't know, write `unknown` — don't leave it blank.

### Naming rules

- **`id`** — lowercase Latin, digits and dashes: `^[a-z0-9][a-z0-9-]*$`. OK: `api-gateway`, `auth`, `svc-1`. Not OK: `API`, `auth_service`, `-leading-dash`.
- **`kind`** — one of the values from the table above. Free-form strings are not allowed.
- **`color`** — hex `#RRGGBB`: `#FF9900`, `#1a2b3c`. Short forms (`#f90`) and named colours are not supported.
- **`links.*`** — must be valid URLs (`http://...` or `https://...`).
- **`service.id`** and **`group.id`** live in separate namespaces — a service and a group can share an id, though it's discouraged for readability.

### What happens on errors

`inframap` validates the YAML before writing JSON. It exits with a clear message on:

- Duplicate `id`s among services or groups.
- The same `id` listed twice in a service's `calls`.
- A service referring to a non-existent group.
- A service calling itself.
- A group with a non-existent `parent`, a self-parent, or a parent cycle (A→B→A or longer).
- Invalid `id`, `color`, or URL format.

**Warnings** (don't fail by default; with `--strict` they cause exit 2):

- A service calls a service that doesn't exist → the JSON marks it `"broken": true` and the viewer paints it red.
- A service has no `owner` or no `description`.

Cycles between services in `calls` (A→B→A) are **fine**: real systems work like that.

---

## Self-hosting the viewer

The public instance lives at `cop1cat.github.io/inframap`. If you need to host it yourself (security/compliance), there's a Docker image and a Helm chart:

```bash
# Docker
cd viewer && docker compose up -d   # http://localhost:8080

# Kubernetes
helm install inframap deploy/helm/inframap-viewer \
  --set ingress.host=inframap.internal.example.com
```

See `deploy/README.md` for details. The viewer is purely client-side, so self-hosting only changes who serves the static bundle.

## Development

```bash
git clone https://github.com/cop1cat/inframap
cd inframap
uv sync --extra dev
uv run pre-commit install

uv run pytest
uv run ruff check .
uv run mypy

# regenerate schema/v1.json after changes to models.py
uv run python -m inframap.schema_dump
```

The viewer lives in `viewer/` — see `viewer/README.md`.
