from __future__ import annotations

import json
from typing import Any

from inframap.models import Group, InfraConfig, Service, ServiceCall

SCHEMA_VERSION = 1


def _call_dict(call: ServiceCall, broken: bool) -> dict[str, Any]:
    return {"id": call.id, "type": call.type.value, "broken": broken}


def _link_str(url: Any) -> str:
    # Pydantic HttpUrl normalizes bare hosts to include a trailing slash.
    # Strip it for bare domains so users see the URL they wrote in the YAML.
    s = str(url)
    if s.endswith("/") and s.count("/") == 3:  # scheme://host/
        s = s[:-1]
    return s


def _service_dict(s: Service, service_ids: set[str]) -> dict[str, Any]:
    return {
        "id": s.id,
        "label": s.label,
        "kind": s.kind.value,
        "group": s.group,
        "description": s.description,
        "owner": s.owner,
        "tags": dict(s.tags),
        "links": {k: _link_str(v) for k, v in s.links.items()},
        "calls": [
            _call_dict(c, broken=c.id not in service_ids)
            for c in sorted(s.calls, key=lambda c: c.id)
        ],
    }


def _group_dict(g: Group) -> dict[str, Any]:
    return {
        "id": g.id,
        "label": g.label,
        "color": g.color,
        "parent": g.parent,
    }


def to_dict(config: InfraConfig) -> dict[str, Any]:
    service_ids = {s.id for s in config.services}
    return {
        "schema_version": SCHEMA_VERSION,
        "meta": {
            "title": config.meta.title,
            "description": config.meta.description,
        },
        "groups": [_group_dict(g) for g in sorted(config.groups, key=lambda g: g.id)],
        "services": [
            _service_dict(s, service_ids) for s in sorted(config.services, key=lambda s: s.id)
        ],
    }


def to_json(config: InfraConfig) -> str:
    return json.dumps(to_dict(config), indent=2, ensure_ascii=False) + "\n"
