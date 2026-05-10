from pathlib import Path

import pytest

from inframap.models import (
    CallType,
    Group,
    InfraConfig,
    Service,
    ServiceCall,
)
from inframap.parser import parse_file
from inframap.validator import ValidationError, validate


def _validate_file(p: Path) -> None:
    validate(parse_file(p))


@pytest.mark.parametrize(
    "name,match",
    [
        ("duplicate_service_ids.yaml", "duplicate service id"),
        ("duplicate_group_ids.yaml", "duplicate group id"),
        ("duplicate_call_id.yaml", "duplicate call id"),
        ("self_call.yaml", "calls itself"),
        ("unknown_group.yaml", "unknown group"),
        ("unknown_parent.yaml", "unknown parent"),
        ("self_parent.yaml", "itself as parent"),
        ("cyclic_parent.yaml", "cyclic group parent"),
    ],
)
def test_invalid_files(invalid_dir: Path, name: str, match: str) -> None:
    with pytest.raises(ValidationError, match=match):
        _validate_file(invalid_dir / name)


def test_valid_passes_no_warnings(valid_dir: Path) -> None:
    cfg = parse_file(valid_dir / "minimal.yaml")
    result = validate(cfg)
    assert result.warnings == []


def test_warnings_owner_description_broken_link() -> None:
    cfg = InfraConfig(
        services=[
            Service(
                id="a",
                label="A",
                calls=[ServiceCall(id="ghost", type=CallType.SYNC)],
            )
        ]
    )
    result = validate(cfg)
    msgs = "\n".join(result.warnings)
    assert "no owner" in msgs
    assert "no description" in msgs
    assert "broken link" in msgs


def test_call_cycle_is_valid() -> None:
    cfg = InfraConfig(
        services=[
            Service(
                id="a",
                label="A",
                owner="o",
                description="d",
                calls=[ServiceCall(id="b", type=CallType.SYNC)],
            ),
            Service(
                id="b",
                label="B",
                owner="o",
                description="d",
                calls=[ServiceCall(id="a", type=CallType.SYNC)],
            ),
        ]
    )
    assert validate(cfg).warnings == []


def test_long_parent_cycle() -> None:
    cfg = InfraConfig(
        groups=[
            Group(id="a", label="A", parent="b"),
            Group(id="b", label="B", parent="c"),
            Group(id="c", label="C", parent="d"),
            Group(id="d", label="D", parent="a"),
        ]
    )
    with pytest.raises(ValidationError, match="cyclic"):
        validate(cfg)


def test_namespace_intersection_allowed() -> None:
    cfg = InfraConfig(
        groups=[Group(id="shared", label="G")],
        services=[Service(id="shared", label="S", group="shared", owner="o", description="d")],
    )
    assert validate(cfg).warnings == []
