import json
from pathlib import Path

from inframap.emitter import to_dict, to_json
from inframap.models import (
    CallType,
    Group,
    InfraConfig,
    Service,
    ServiceCall,
)
from inframap.parser import parse_file


def test_minimal_emit(valid_dir: Path) -> None:
    cfg = parse_file(valid_dir / "minimal.yaml")
    payload = to_dict(cfg)

    assert payload["schema_version"] == 1
    assert [s["id"] for s in payload["services"]] == [
        "api-gateway",
        "auth-service",
        "billing-service",
    ]
    assert [g["id"] for g in payload["groups"]] == ["aws", "cloud"]

    api = next(s for s in payload["services"] if s["id"] == "api-gateway")
    call_ids = [c["id"] for c in api["calls"]]
    assert call_ids == sorted(call_ids)
    assert all(c["broken"] is False for c in api["calls"])


def test_broken_call_marked() -> None:
    cfg = InfraConfig(
        services=[
            Service(
                id="a",
                label="A",
                calls=[ServiceCall(id="ghost", type=CallType.SYNC)],
            )
        ]
    )
    payload = to_dict(cfg)
    a = payload["services"][0]
    assert a["calls"][0] == {"id": "ghost", "type": "sync", "broken": True}


def test_links_preserve_yaml_order(tmp_path: Path) -> None:
    f = tmp_path / "x.yaml"
    f.write_text(
        "services:\n"
        "  - id: a\n"
        "    label: A\n"
        "    links:\n"
        "      docs: https://example.com/d\n"
        "      repo: https://example.com/r\n"
        "      runbook: https://example.com/b\n",
        encoding="utf-8",
    )
    cfg = parse_file(f)
    payload = to_dict(cfg)
    assert list(payload["services"][0]["links"].keys()) == ["docs", "repo", "runbook"]


def test_null_fields_emitted() -> None:
    cfg = InfraConfig(groups=[Group(id="g", label="G")])
    payload = to_dict(cfg)
    g = payload["groups"][0]
    assert g["color"] is None
    assert g["parent"] is None


def test_deterministic(valid_dir: Path) -> None:
    cfg = parse_file(valid_dir / "minimal.yaml")
    assert to_json(cfg) == to_json(cfg)
    # roundtrips through json
    assert json.loads(to_json(cfg)) == to_dict(cfg)
