from inframap.schema_dump import SCHEMA_PATH, build_schema, serialize


def test_committed_schema_matches_models() -> None:
    expected = serialize(build_schema())
    actual = SCHEMA_PATH.read_text(encoding="utf-8")
    assert actual == expected, (
        "src/inframap/schema/v1.json is out of sync with Pydantic models. "
        "Run: python -m inframap.schema_dump"
    )
