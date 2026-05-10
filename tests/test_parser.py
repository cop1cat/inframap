from pathlib import Path

import pytest

from inframap.parser import ParseError, parse_file


def test_minimal_valid(valid_dir: Path) -> None:
    cfg = parse_file(valid_dir / "minimal.yaml")
    assert cfg.meta.title == "My Infrastructure"
    assert {s.id for s in cfg.services} == {"api-gateway", "auth-service", "billing-service"}
    assert {g.id for g in cfg.groups} == {"cloud", "aws"}


def test_nested_groups(valid_dir: Path) -> None:
    cfg = parse_file(valid_dir / "nested_groups.yaml")
    parents = {g.id: g.parent for g in cfg.groups}
    assert parents == {"cloud": None, "aws": "cloud", "prod": "aws"}


def test_default_meta(tmp_path: Path) -> None:
    f = tmp_path / "x.yaml"
    f.write_text("services: []\n", encoding="utf-8")
    cfg = parse_file(f)
    assert cfg.meta.title == "Infrastructure Map"
    assert cfg.meta.description is None


def test_empty_file(tmp_path: Path) -> None:
    f = tmp_path / "x.yaml"
    f.write_text("", encoding="utf-8")
    with pytest.raises(ParseError, match="empty"):
        parse_file(f)


def test_broken_yaml(tmp_path: Path) -> None:
    f = tmp_path / "x.yaml"
    f.write_text("this: is: not: yaml:\n  - [unbalanced\n", encoding="utf-8")
    with pytest.raises(ParseError, match="invalid YAML"):
        parse_file(f)


def test_top_level_not_mapping(tmp_path: Path) -> None:
    f = tmp_path / "x.yaml"
    f.write_text("- a\n- b\n", encoding="utf-8")
    with pytest.raises(ParseError, match="mapping"):
        parse_file(f)


@pytest.mark.parametrize(
    "name",
    ["bad_id_format.yaml", "bad_color.yaml", "bad_url.yaml"],
)
def test_pydantic_format_errors(invalid_dir: Path, name: str) -> None:
    with pytest.raises(ParseError, match="schema validation failed"):
        parse_file(invalid_dir / name)
