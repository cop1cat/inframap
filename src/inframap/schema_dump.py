"""Generate JSON Schema for InfraConfig and write to src/inframap/schema/v1.json.

Run: python -m inframap.schema_dump
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from inframap.models import InfraConfig

SCHEMA_PATH = Path(__file__).parent / "schema" / "v1.json"


def build_schema() -> dict[str, Any]:
    schema = InfraConfig.model_json_schema()
    schema["$schema"] = "https://json-schema.org/draft/2020-12/schema"
    schema["$id"] = "https://cop1cat.github.io/inframap/schema/v1.json"
    schema["title"] = "InfraMap v1"
    schema["x-schema-version"] = 1
    return schema


def serialize(schema: dict[str, Any]) -> str:
    return json.dumps(schema, indent=2, ensure_ascii=False, sort_keys=True) + "\n"


def main() -> None:
    SCHEMA_PATH.parent.mkdir(parents=True, exist_ok=True)
    SCHEMA_PATH.write_text(serialize(build_schema()), encoding="utf-8")
    print(f"wrote {SCHEMA_PATH}")


if __name__ == "__main__":
    main()
