from __future__ import annotations

import logging
import sys
from pathlib import Path

import click

from inframap.emitter import to_json
from inframap.models import InfraConfig
from inframap.parser import ParseError, parse_file
from inframap.validator import ValidationError, validate

logger = logging.getLogger("inframap")


def _setup_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(level=level, format="%(levelname)s: %(message)s")


def _load_and_validate(path: Path) -> tuple[InfraConfig, list[str]]:
    try:
        config = parse_file(path)
    except ParseError as e:
        logger.error(str(e))
        sys.exit(1)
    try:
        result = validate(config)
    except ValidationError as e:
        logger.error(str(e))
        sys.exit(1)
    return config, result.warnings


@click.group()
@click.option("-v", "--verbose", is_flag=True, help="Enable debug logging.")
@click.pass_context
def main(ctx: click.Context, verbose: bool) -> None:
    """InfraMap CLI: validate YAML and emit infra.json."""
    _setup_logging(verbose)
    ctx.ensure_object(dict)


@main.command()
@click.argument("file", type=click.Path(exists=True, dir_okay=False, path_type=Path))
@click.option(
    "--output",
    "-o",
    default="infra.json",
    help="Output path. Use '-' for stdout.",
)
@click.option("--strict", is_flag=True, help="Treat warnings as failure (no output written).")
def generate(file: Path, output: str, strict: bool) -> None:
    """Read YAML and emit infra.json."""
    config, warnings = _load_and_validate(file)
    if strict and warnings:
        logger.error("strict mode: %d warning(s), aborting", len(warnings))
        sys.exit(2)

    payload = to_json(config)
    if output == "-":
        sys.stdout.write(payload)
    else:
        Path(output).write_text(payload, encoding="utf-8")
        logger.info("wrote %s", output)


@main.command(name="validate")
@click.argument("file", type=click.Path(exists=True, dir_okay=False, path_type=Path))
@click.option("--strict", is_flag=True, help="Exit 2 if any warnings.")
def validate_cmd(file: Path, strict: bool) -> None:
    """Validate YAML without emitting output."""
    _, warnings = _load_and_validate(file)
    if strict and warnings:
        logger.error("strict mode: %d warning(s)", len(warnings))
        sys.exit(2)
    logger.info("ok (%d warning(s))", len(warnings))


__all__ = ["main"]
