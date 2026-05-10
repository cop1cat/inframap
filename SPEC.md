# InfraMap — ТЗ

## Архитектура

Два независимых компонента:

1. **CLI-утилита `inframap`** (Python) — читает один YAML, валидирует, выдаёт один `infra.json`.
2. **Вьюер** (`cop1cat.github.io/inframap`) — статический сайт, принимает `infra.json`, рисует интерактивный граф. *Описывается отдельным ТЗ, здесь только контракт схемы.*

Связь между ними — формат `infra.json` со `schema_version`.

**Принцип**: один YAML → один JSON → одна схема. Никакого мульти-файла, мерджей, `_meta.yaml`.

---

## Часть 1: CLI-утилита

### Структура проекта

```
inframap/
├── src/
│   └── inframap/
│       ├── __init__.py
│       ├── models.py
│       ├── parser.py
│       ├── validator.py
│       ├── emitter.py
│       ├── cli.py
│       └── schema/
│           └── v1.json
├── tests/
│   ├── test_parser.py
│   ├── test_validator.py
│   ├── test_emitter.py
│   ├── test_schema.py
│   └── fixtures/
│       ├── valid/
│       │   ├── minimal.yaml
│       │   └── nested_groups.yaml
│       └── invalid/
│           ├── duplicate_service_ids.yaml
│           ├── duplicate_group_ids.yaml
│           ├── duplicate_call_id.yaml
│           ├── self_call.yaml
│           ├── unknown_group.yaml
│           ├── unknown_parent.yaml
│           ├── self_parent.yaml
│           ├── cyclic_parent.yaml
│           ├── bad_id_format.yaml
│           ├── bad_color.yaml
│           └── bad_url.yaml
├── pyproject.toml
├── .pre-commit-config.yaml
└── README.md
```

### Формат входного YAML

```yaml
meta:
  title: "My Infrastructure"
  description: "Optional"

groups:
  - id: cloud
    label: Cloud
  - id: aws
    label: AWS
    parent: cloud
    color: "#FF9900"

services:
  - id: api-gateway
    label: API Gateway
    group: aws
    description: "Точка входа"
    owner: team-platform
    tags:
      tier: critical
      layer: edge
    links:
      docs: https://docs.internal/api-gateway
      repo: https://github.com/org/api-gateway
      runbook: https://wiki.internal/runbooks/api-gateway
    calls:
      - id: auth-service
        type: sync
      - id: billing-service
        type: async
```

Группы поддерживают `parent` для вложенности. В README указать рекомендацию: не больше 2 уровней вложенности — глубже layout-движки вьюера деградируют.

`CallType` обязателен — нет дефолта. Если автор не знает тип — пишет явно `unknown`.

**Ограничения на поля:**
- `id` (у групп и сервисов) — regex `^[a-z0-9][a-z0-9-]*$` (kebab-case, ascii).
- `color` — hex `^#[0-9a-fA-F]{6}$`.
- Значения в `links` — валидный URL (Pydantic `HttpUrl`).
- `service.id` и `group.id` живут в разных namespace — пересечение разрешено.

### Pydantic модели

```python
class CallType(str, Enum):
    SYNC = "sync"
    ASYNC = "async"
    EVENT = "event"
    UNKNOWN = "unknown"

class ServiceCall(BaseModel):
    id: str
    type: CallType

class Service(BaseModel):
    id: str
    label: str
    group: str | None = None
    description: str | None = None
    owner: str | None = None
    tags: dict[str, str] = Field(default_factory=dict)
    links: dict[str, HttpUrl] = Field(default_factory=dict)
    calls: list[ServiceCall] = Field(default_factory=list)

class Group(BaseModel):
    id: str
    label: str
    color: str | None = None
    parent: str | None = None

class Meta(BaseModel):
    title: str = "Infrastructure Map"
    description: str | None = None

class InfraConfig(BaseModel):
    meta: Meta = Field(default_factory=Meta)
    groups: list[Group] = Field(default_factory=list)
    services: list[Service] = Field(default_factory=list)
```

### Парсер

`parser.py` принимает путь к одному YAML-файлу. Секция `meta` берётся из того же файла, иначе — дефолт `Meta()`.

Битый YAML или пустой файл → exit 1 с понятным сообщением.

### Валидация

**Ошибки** (бросать `ValueError` с понятным сообщением, exit code 1):
- Дублирующиеся id среди сервисов
- Дублирующиеся id среди групп
- Дублирующийся `id` в `calls` одного сервиса
- Сервис ссылается на несуществующую группу
- Сервис вызывает сам себя
- Группа ссылается на несуществующий `parent`
- Группа ссылается сама на себя как parent
- Циклический parent среди групп (A→B→A или длиннее)
- Нарушение формата `id`, `color`, URL в `links` (ловится Pydantic при разборе)

**Warnings** (логировать через `logging.warning`, exit code 2 если `--strict`):
- Сервис вызывает несуществующий сервис (broken link)
- Сервис без `owner`
- Сервис без `description`

Циклы в `calls` между сервисами — валидны, не считаются ошибкой.

### CLI

```bash
inframap generate <file> [--output infra.json] [--strict]
inframap validate <file> [--strict]
```

`<file>` — путь к одному YAML. По умолчанию `--output ./infra.json`. `--output -` — пишет в stdout. Существующий файл перезаписывается без подтверждения.

Поведение `generate` с warnings:
- без `--strict` — пишет JSON, exit 0;
- со `--strict` — JSON не пишется, exit 2.

Exit codes:
- `0` — успех
- `1` — ошибка валидации
- `2` — есть warnings и передан `--strict`

CLI на `click`. Логирование через `logging`, не `print`.

### Формат выходного `infra.json`

```json
{
  "schema_version": 1,
  "meta": {
    "title": "My Infrastructure",
    "description": null
  },
  "groups": [
    {"id": "cloud", "label": "Cloud", "color": null, "parent": null},
    {"id": "aws", "label": "AWS", "color": "#FF9900", "parent": "cloud"}
  ],
  "services": [
    {
      "id": "api-gateway",
      "label": "API Gateway",
      "group": "aws",
      "description": "Точка входа",
      "owner": "team-platform",
      "tags": {"tier": "critical", "layer": "edge"},
      "links": {"docs": "https://...", "repo": "https://..."},
      "calls": [
        {"id": "auth-service", "type": "sync", "broken": false},
        {"id": "ghost", "type": "sync", "broken": true}
      ]
    }
  ]
}
```

`broken: true` — для broken links, чтобы вьюер сразу рендерил красную пунктирную стрелку без ресёрча.

Никаких координат, layout-хинтов, цветов нод — это решает вьюер. Цвет у группы — допустимая семантическая подсказка.

Сериализация:
- Все опциональные поля выписываются явно (включая `null`) — никаких пропусков, чтобы JSON Schema и git-diff были стабильны.
- Массивы `groups` / `services` / `calls` сортируются по `id`.
- Порядок ключей внутри `tags` и `links` сохраняется как в исходном YAML (полагаемся на стабильный порядок dict в Python 3.7+; PyYAML его сохраняет).
- Кодировка UTF-8, `ensure_ascii=False`, финальный `\n`.

### pyproject.toml

```toml
[project]
name = "inframap"
version = "0.1.0"
requires-python = ">=3.12"

dependencies = [
    "pydantic>=2.0",
    "pyyaml>=6.0",
    "click>=8.0",
]

[project.scripts]
inframap = "inframap.cli:main"

[tool.hatch.build.targets.wheel]
packages = ["src/inframap"]
```

### Тулинг

- **Ruff** (lint + format) и **mypy** в strict-режиме — с самого начала.
- **pre-commit** с хуками: ruff, ruff-format, mypy, pytest (быстрая выборка), check-yaml, end-of-file-fixer, trailing-whitespace.
- Принцип: максимально опираться на готовые проверенные библиотеки (Pydantic для валидации/JSON Schema, click для CLI, PyYAML для парсинга). Своих велосипедов не плодим.

### Тесты (pytest)

- `test_parser.py` — валидный YAML, дефолтный `meta`, битый YAML, пустой файл, вложенные группы
- `test_validator.py` — каждый класс ошибок и warnings, поведение `--strict`, циклы в parent, дубль `call.id`, плохие `id`/`color`/URL
- `test_emitter.py` — снапшот-тест на стабильность JSON (детерминированный порядок, сортировка по id, сохранение порядка `tags`/`links`)
- `test_schema.py` — `InfraConfig.model_json_schema()` совпадает с закоммиченным `src/inframap/schema/v1.json` (CI падает, если рассинхрон)

---

## Часть 2: Контракт `infra.json`

Это публичный API между утилитой и вьюером.

**Правила эволюции:**
- `schema_version: 1` обязателен в каждом файле.
- Любое breaking-изменение схемы → новая мажорная версия. Старая поддерживается вьюером минимум год.
- Добавление опциональных полей — не breaking, версия не меняется.

**JSON Schema** — лежит в `src/inframap/schema/v1.json`, **генерится из Pydantic** (`InfraConfig.model_json_schema()`). Закоммиченный файл проверяется тестом на соответствие генерации; обновляется командой `python -m inframap.schema_dump` (или аналогичной). При релизе публикуется на сайт по адресу `cop1cat.github.io/inframap/schema/v1.json` для внешней валидации.

---

## Часть 3: Вьюер (краткие требования, отдельное ТЗ)

Хостится на `cop1cat.github.io/inframap`. Опираемся на готовые библиотеки — графовую раскладку, compound nodes и т.п. сами не пишем.

**Стек (предварительно):** Cytoscape.js + layout `cose-bilkent` — единственная связка, которая нормально тянет force-directed раскладку *вместе* с compound nodes (вложенные группы). Альтернативы (sigma.js, d3-force, cosmograph) с compound nodes из коробки не работают. Окончательный выбор — в ТЗ вьюера.

**Визуальная модель — «как граф знаний в Obsidian»:**
- Force-directed раскладка, compound nodes для групп.
- В дефолтном состоянии все стрелки полупрозрачные (~0.2 opacity), сервисы в нейтральном виде.
- При клике на сервис: подсвечиваются сам сервис, все инцидентные ему рёбра и сервисы на их концах. Остальной граф приглушается.
- При клике на стрелку: подсвечиваются сама стрелка и её endpoint-сервисы.
- В подсвеченном состоянии направление вызова анимируется — движущиеся точки/штрихи вдоль ребра от caller к callee. В обычном состоянии анимации нет.

**Способы загрузки JSON:**
1. Drag-n-drop файла
2. `?src=<url>` — fetch по URL
3. Paste из буфера (Ctrl+V на странице)

LocalStorage хранит последний загруженный JSON для reload.

**Функциональность:**
- Группы как compound nodes (с поддержкой вложенности через `parent`)
- Стрелки: sync — сплошная, async — пунктир, event — точечная, unknown — серая, broken — красная пунктирная
- Hover на сервис → tooltip с description, owner, tags, links
- Клик на сервис → открыть `links.docs` (если есть) в новой вкладке
- Поиск по label, id, tags, owner — highlight
- Фильтр по тегам и owner
- Тогглы dark/light, сохраняются в localStorage
- Кнопка "Export as SVG" — статичная картинка для README
- `?src=...&watch=1` — polling URL раз в 10 сек

**Чего НЕ нужно:**
- Бэкенда
- Аутентификации
- Редактирования графа в UI
