# InfraMap

CLI-утилита: один YAML с описанием сервисов и групп → один `infra.json` для [вьюера](https://cop1cat.github.io/inframap).

## Установка

Из GitHub:

```bash
# uv (рекомендуется)
uv tool install git+https://github.com/cop1cat/inframap

# pip
pip install git+https://github.com/cop1cat/inframap
```

После установки доступна команда `inframap`.

## Быстрый старт

1. Создай `infra.yaml` (см. ниже).
2. Запусти `inframap generate infra.yaml` — получишь `infra.json`.
3. Открой [вьюер](https://cop1cat.github.io/inframap) и перетащи файл в окно браузера.

```bash
inframap generate infra.yaml                  # → ./infra.json
inframap generate infra.yaml -o out.json
inframap generate infra.yaml -o -             # вывод в stdout
inframap generate infra.yaml --strict         # warnings → exit 2, JSON не пишется

inframap validate infra.yaml                  # только проверка
inframap validate infra.yaml --strict
```

**Exit codes:** `0` — успех, `1` — ошибка валидации, `2` — есть warnings и `--strict`.

---

## Как писать YAML

YAML делится на три секции: `meta` (заголовок карты), `groups` (контейнеры) и `services` (сами сервисы и связи между ними). Все секции опциональны, но обычно нужны как минимум `services`.

### Минимальный пример

```yaml
services:
  - id: api
    label: API
  - id: db
    label: Database
```

Этого достаточно — два сервиса без связей. Но обычно ты захочешь описать больше.

### Полный пример

```yaml
meta:
  title: "My Infrastructure"
  description: "Карта продовых сервисов"

groups:
  - id: cloud
    label: Cloud
  - id: aws
    label: AWS
    parent: cloud           # вложенная группа
    color: "#FF9900"        # цвет для подсказки во вьюере

services:
  - id: api-gateway
    label: API Gateway
    group: aws
    description: "Точка входа для всех клиентских запросов"
    owner: team-platform
    tags:
      tier: critical
      layer: edge
    links:
      docs: https://docs.example.com/api-gateway
      repo: https://github.com/org/api-gateway
      runbook: https://wiki.example.com/runbooks/api-gateway
    calls:
      - id: auth-service
        type: sync
      - id: billing-service
        type: async

  - id: auth-service
    label: Auth
    group: aws
    description: "Аутентификация и выдача JWT"
    owner: team-platform

  - id: billing-service
    label: Billing
    group: aws
    description: "Списания и счета"
    owner: team-billing
```

### Секции по порядку

#### `meta` — заголовок карты

```yaml
meta:
  title: "My Infrastructure"      # отображается в шапке вьюера
  description: "Optional"         # подзаголовок, можно опустить
```

Если секции нет — заголовок будет «Infrastructure Map».

#### `groups` — контейнеры для сервисов

Группы нужны, чтобы визуально объединять сервисы (по облаку, команде, домену — как удобно).

```yaml
groups:
  - id: aws            # уникальный идентификатор
    label: AWS         # человекочитаемое имя
    color: "#FF9900"   # опционально: цвет рамки во вьюере
    parent: cloud      # опционально: вложенность в другую группу
```

**Вложенность:** не глубже 2 уровней. На большей глубине layout вьюера деградирует.

#### `services` — сервисы и связи

Каждый сервис — это нода на графе. Поле `calls` описывает исходящие вызовы к другим сервисам (стрелки на графе).

```yaml
services:
  - id: api-gateway              # обязательно, уникально среди сервисов
    label: API Gateway           # обязательно, отображается на ноде
    group: aws                   # опционально: в какую группу поместить
    description: "..."           # опционально, но рекомендуется
    owner: team-platform         # опционально, но рекомендуется
    tags:                        # опционально: произвольные теги для фильтра
      tier: critical
      layer: edge
    links:                       # опционально: ссылки в tooltip
      docs: https://...
      repo: https://...
    calls:                       # опционально: исходящие вызовы
      - id: auth-service         # id сервиса, к которому идёт вызов
        type: sync               # обязательно
```

**Типы вызовов (`type`):**

| Значение  | Когда использовать                              | Как рисуется во вьюере |
|-----------|-------------------------------------------------|------------------------|
| `sync`    | HTTP/gRPC запрос-ответ, ждём результат          | Сплошная линия         |
| `async`   | Вызов через очередь, отправил и забыл           | Пунктир                |
| `event`   | Pub/sub события, шина, fan-out                  | Точечная линия         |
| `unknown` | Не уверен — но связь точно есть                 | Серая линия            |

Дефолта **нет**: тип нужно указать явно. Если не знаешь — пиши `unknown`, не оставляй пустым.

### Правила именования

- **`id`** — только латиница в нижнем регистре, цифры и дефис: `^[a-z0-9][a-z0-9-]*$`. Примеры: `api-gateway`, `auth`, `svc-1`. Не подойдут: `API`, `auth_service`, `-leading-dash`.
- **`color`** — hex `#RRGGBB`: `#FF9900`, `#1a2b3c`. Короткие формы (`#f90`) и именованные цвета не поддерживаются.
- **`links.*`** — должны быть валидными URL (`http://...` или `https://...`).
- **`service.id`** и **`group.id`** живут в разных пространствах имён — можно назвать сервис и группу одинаково (хотя не рекомендуется ради читаемости).

### Что произойдёт при ошибках

`inframap` валидирует YAML до записи JSON. Падает с понятным сообщением, если:

- Дублируются `id` среди сервисов или групп.
- Один сервис вызывает один и тот же `id` дважды в `calls`.
- Сервис ссылается на несуществующую группу.
- Сервис вызывает сам себя.
- Группа ссылается на несуществующий `parent`, на саму себя, или образует цикл (A→B→A и длиннее).
- Нарушен формат `id`, `color` или URL.

**Warnings** (по умолчанию не падают, но отображаются; с `--strict` → exit 2):

- Сервис вызывает несуществующий сервис → попадёт в JSON с `"broken": true`, во вьюере подсветится красным.
- У сервиса нет `owner` или `description`.

Циклы между сервисами в `calls` (A→B→A) — это **нормально**: реальные системы так и устроены.

---

## Контракт `infra.json`

JSON Schema лежит в `src/inframap/schema/v1.json` (генерится из Pydantic-моделей). При релизе публикуется на `cop1cat.github.io/inframap/schema/v1.json`.

**Эволюция:**
- `schema_version: 1` обязателен в каждом файле.
- Breaking-изменение → новая мажорная версия. Старая поддерживается вьюером минимум год.
- Добавление опциональных полей — не breaking.

Сериализация детерминированная: массивы `groups`/`services`/`calls` сортируются по `id`, опциональные поля выписываются с `null`, порядок ключей в `tags`/`links` сохраняется как в YAML — это даёт воспроизводимые diff-ы в git.

---

## Разработка

```bash
git clone https://github.com/cop1cat/inframap
cd inframap
uv sync --extra dev
uv run pre-commit install

uv run pytest
uv run ruff check .
uv run mypy

# обновить schema/v1.json после изменений в models.py
uv run python -m inframap.schema_dump
```
