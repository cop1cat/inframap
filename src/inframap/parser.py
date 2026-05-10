from __future__ import annotations

from pathlib import Path

import yaml
from pydantic import ValidationError

from inframap.models import InfraConfig


class ParseError(ValueError):
    """Raised when the input YAML cannot be parsed or fails schema validation."""


def parse_file(path: Path) -> InfraConfig:
    if not path.is_file():
        raise ParseError(f"not a file: {path}")

    text = path.read_text(encoding="utf-8")
    if not text.strip():
        raise ParseError(f"file is empty: {path}")

    try:
        data = yaml.safe_load(text)
    except yaml.YAMLError as e:
        raise ParseError(f"invalid YAML in {path}: {e}") from e

    if data is None:
        raise ParseError(f"file is empty: {path}")
    if not isinstance(data, dict):
        raise ParseError(f"top-level YAML must be a mapping in {path}, got {type(data).__name__}")

    try:
        return InfraConfig.model_validate(data)
    except ValidationError as e:
        raise ParseError(f"schema validation failed for {path}:\n{e}") from e
