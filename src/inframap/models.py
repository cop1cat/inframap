from __future__ import annotations

from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, StringConstraints

ID_PATTERN = r"^[a-z0-9][a-z0-9-]*$"
COLOR_PATTERN = r"^#[0-9a-fA-F]{6}$"

IdStr = Annotated[str, StringConstraints(pattern=ID_PATTERN)]
ColorStr = Annotated[str, StringConstraints(pattern=COLOR_PATTERN)]


class CallType(StrEnum):
    SYNC = "sync"
    ASYNC = "async"
    EVENT = "event"
    UNKNOWN = "unknown"


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=False)


class ServiceCall(_Strict):
    id: IdStr
    type: CallType


class Service(_Strict):
    id: IdStr
    label: str
    group: IdStr | None = None
    description: str | None = None
    owner: str | None = None
    tags: dict[str, str] = Field(default_factory=dict)
    links: dict[str, HttpUrl] = Field(default_factory=dict)
    calls: list[ServiceCall] = Field(default_factory=list)


class Group(_Strict):
    id: IdStr
    label: str
    color: ColorStr | None = None
    parent: IdStr | None = None


class Meta(_Strict):
    title: str = "Infrastructure Map"
    description: str | None = None


class InfraConfig(_Strict):
    meta: Meta = Field(default_factory=Meta)
    groups: list[Group] = Field(default_factory=list)
    services: list[Service] = Field(default_factory=list)
