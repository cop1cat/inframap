from __future__ import annotations

import logging
from dataclasses import dataclass, field

from inframap.models import InfraConfig

logger = logging.getLogger(__name__)


class ValidationError(ValueError):
    """Hard validation failure. Multiple issues are joined with newlines."""


@dataclass
class ValidationResult:
    warnings: list[str] = field(default_factory=list)


def _find_duplicates(ids: list[str]) -> list[str]:
    seen: set[str] = set()
    dups: list[str] = []
    for i in ids:
        if i in seen and i not in dups:
            dups.append(i)
        seen.add(i)
    return dups


def _detect_parent_cycles(parents: dict[str, str]) -> list[list[str]]:
    """Return list of cycles (each cycle is a list of group ids in order)."""
    cycles: list[list[str]] = []
    seen_in_cycle: set[str] = set()

    for start in parents:
        if start in seen_in_cycle:
            continue
        path: list[str] = []
        index: dict[str, int] = {}
        node: str | None = start
        while node in parents:
            if node in index:
                cycle = path[index[node] :]
                cycles.append(cycle)
                seen_in_cycle.update(cycle)
                break
            index[node] = len(path)
            path.append(node)
            node = parents[node]
    return cycles


def validate(config: InfraConfig) -> ValidationResult:
    errors: list[str] = []
    result = ValidationResult()

    service_ids = [s.id for s in config.services]
    group_ids = [g.id for g in config.groups]

    for dup in _find_duplicates(service_ids):
        errors.append(f"duplicate service id: {dup!r}")
    for dup in _find_duplicates(group_ids):
        errors.append(f"duplicate group id: {dup!r}")

    group_id_set = set(group_ids)
    service_id_set = set(service_ids)

    for s in config.services:
        if s.group is not None and s.group not in group_id_set:
            errors.append(f"service {s.id!r} references unknown group {s.group!r}")

        call_ids = [c.id for c in s.calls]
        for dup in _find_duplicates(call_ids):
            errors.append(f"service {s.id!r} has duplicate call id: {dup!r}")

        for c in s.calls:
            if c.id == s.id:
                errors.append(f"service {s.id!r} calls itself")

    for g in config.groups:
        if g.parent is None:
            continue
        if g.parent == g.id:
            errors.append(f"group {g.id!r} references itself as parent")
        elif g.parent not in group_id_set:
            errors.append(f"group {g.id!r} references unknown parent {g.parent!r}")

    parents = {g.id: g.parent for g in config.groups if g.parent and g.parent != g.id}
    for cycle in _detect_parent_cycles(parents):
        errors.append("cyclic group parent: " + " -> ".join([*cycle, cycle[0]]))

    if errors:
        raise ValidationError("\n".join(errors))

    for s in config.services:
        if not s.owner:
            msg = f"service {s.id!r} has no owner"
            result.warnings.append(msg)
            logger.warning(msg)
        if not s.description:
            msg = f"service {s.id!r} has no description"
            result.warnings.append(msg)
            logger.warning(msg)
        for c in s.calls:
            if c.id not in service_id_set:
                msg = f"service {s.id!r} calls unknown service {c.id!r} (broken link)"
                result.warnings.append(msg)
                logger.warning(msg)

    return result


def broken_call_targets(config: InfraConfig) -> set[tuple[str, str]]:
    """Return set of (caller_id, callee_id) where callee does not exist."""
    service_id_set = {s.id for s in config.services}
    return {(s.id, c.id) for s in config.services for c in s.calls if c.id not in service_id_set}
