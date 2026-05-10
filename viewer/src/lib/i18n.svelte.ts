// Minimal i18n: English + Russian.

export type Lang = "en" | "ru";

const KEY = "inframap.lang";

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "en" || saved === "ru") return saved;
  } catch {
    // ignore
  }
  return navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en";
}

const dict = {
  en: {
    "empty.drop": "Drop infra.json here",
    "empty.paste": "or paste with",
    "empty.try": "Try with sample",
    "empty.generate": "Generate infra.json with the",
    "empty.cli": "inframap CLI",
    "empty.privacy": "Your data stays in the browser — no server uploads.",

    "topbar.share": "Share",
    "topbar.export": "Export",
    "topbar.stats": "Stats",
    "topbar.shareTitle": "Copy share link",
    "topbar.exportTitle": "Export as SVG",
    "topbar.statsTitle": "Toggle stats panel",
    "topbar.themeTitle": "Toggle theme",
    "topbar.clearTitle": "Clear current graph",
    "topbar.langTitle": "Language",

    "export.current": "Current theme",
    "export.light": "Light",
    "export.dark": "Dark",

    "search.placeholder": "Search services, groups, owner, tags...",
    "filter.owner": "Owner",
    "filter.group": "Group",
    "filter.tag": "Tag",
    "filter.kind": "Kind",

    "stats.title": "Stats",
    "stats.services": "Services",
    "stats.groups": "Groups",
    "stats.calls": "Calls",
    "stats.byCallType": "By call type",
    "stats.byKind": "By kind",
    "stats.broken": "Broken links",
    "stats.withoutOwner": "Without owner",
    "stats.withoutDescription": "Without description",
    "stats.topOwners": "Top owners",
    "stats.groupSizes": "Group sizes",
    "stats.highlightAll": "highlight all",

    "service.owner": "Owner",
    "service.group": "Group",
    "service.kind": "Kind",
    "service.tags": "Tags",
    "service.links": "Links",
    "service.calls": "Calls",
    "service.calledBy": "Called by",
    "service.broken": "broken",
    "service.close": "Close",

    "share.copied": "Link copied",
    "share.tooLarge": "Graph too large for URL. Share the JSON file directly.",
    "share.failed": "Share failed",

    "zoom.in": "Zoom in",
    "zoom.out": "Zoom out",
    "zoom.fit": "Fit to screen",
    "zoom.minimap": "Toggle minimap",
    "zoom.reset": "Reset layout (discard manual positions)",

    "help.title": "Keyboard & Mouse",
    "help.mouse": "Mouse",
    "help.click": "Left click",
    "help.clickDesc": "Select node/edge and highlight neighborhood",
    "help.middleDrag": "Middle-click drag",
    "help.middleDragDesc": "Pan the graph",
    "help.leftDrag": "Drag node",
    "help.leftDragDesc": "Move a node manually",
    "help.wheel": "Scroll wheel",
    "help.wheelDesc": "Zoom in/out",
    "help.hover": "Hover service",
    "help.hoverDesc": "Show quick tooltip with description and tags",
    "help.keys": "Keys",
    "help.keyHelp": "Open this help",
    "help.keyEsc": "Clear selection / close panels",
    "help.keyPaste": "Paste infra.json from clipboard",
    "help.tips": "Tips",
    "help.tipLegend": "Click an item in the legend to highlight all edges of that type.",
    "help.tipStats": "Click any row in the Stats panel to highlight the matching elements.",
    "help.tipShare": "Share copies a link with the data embedded — no upload, no server.",
    "help.tipCollapse": "Double-click a group to collapse/expand it.",
    "help.tipPersist": "Manually moved nodes are remembered for this exact infra.json.",
    "topbar.help": "Help",
  },
  ru: {
    "empty.drop": "Перетащи infra.json сюда",
    "empty.paste": "или вставь через",
    "empty.try": "Попробовать пример",
    "empty.generate": "Сгенерируй infra.json с помощью",
    "empty.cli": "inframap CLI",
    "empty.privacy": "Данные остаются в браузере — на сервер ничего не уходит.",

    "topbar.share": "Поделиться",
    "topbar.export": "Экспорт",
    "topbar.stats": "Статистика",
    "topbar.shareTitle": "Скопировать ссылку",
    "topbar.exportTitle": "Экспортировать SVG",
    "topbar.statsTitle": "Показать/скрыть статистику",
    "topbar.themeTitle": "Сменить тему",
    "topbar.clearTitle": "Закрыть граф",
    "topbar.langTitle": "Язык",

    "export.current": "Текущая тема",
    "export.light": "Светлая",
    "export.dark": "Тёмная",

    "search.placeholder": "Поиск по сервисам, группам, владельцу, тегам...",
    "filter.owner": "Владелец",
    "filter.group": "Группа",
    "filter.tag": "Тег",
    "filter.kind": "Вид",

    "stats.title": "Статистика",
    "stats.services": "Сервисов",
    "stats.groups": "Групп",
    "stats.calls": "Вызовов",
    "stats.byCallType": "По типу вызова",
    "stats.byKind": "По виду",
    "stats.broken": "Битые связи",
    "stats.withoutOwner": "Без владельца",
    "stats.withoutDescription": "Без описания",
    "stats.topOwners": "Топ владельцев",
    "stats.groupSizes": "Размеры групп",
    "stats.highlightAll": "выделить все",

    "service.owner": "Владелец",
    "service.group": "Группа",
    "service.kind": "Вид",
    "service.tags": "Теги",
    "service.links": "Ссылки",
    "service.calls": "Вызывает",
    "service.calledBy": "Вызывается из",
    "service.broken": "битая",
    "service.close": "Закрыть",

    "share.copied": "Ссылка скопирована",
    "share.tooLarge": "Граф слишком большой для ссылки. Поделитесь JSON-файлом.",
    "share.failed": "Не удалось поделиться",

    "zoom.in": "Приблизить",
    "zoom.out": "Отдалить",
    "zoom.fit": "По размеру экрана",
    "zoom.minimap": "Показать/скрыть мини-карту",
    "zoom.reset": "Сбросить раскладку (забыть ручные позиции)",

    "help.title": "Управление",
    "help.mouse": "Мышь",
    "help.click": "Левый клик",
    "help.clickDesc": "Выделить ноду/ребро и связанные элементы",
    "help.middleDrag": "Зажатое колесо",
    "help.middleDragDesc": "Панорамирование графа",
    "help.leftDrag": "Перетащить ноду",
    "help.leftDragDesc": "Подвинуть ноду вручную",
    "help.wheel": "Колесо",
    "help.wheelDesc": "Приблизить/отдалить",
    "help.hover": "Hover на сервис",
    "help.hoverDesc": "Быстрая подсказка с описанием и тегами",
    "help.keys": "Клавиши",
    "help.keyHelp": "Открыть эту справку",
    "help.keyEsc": "Сбросить выделение, закрыть панели",
    "help.keyPaste": "Вставить infra.json из буфера",
    "help.tips": "Подсказки",
    "help.tipLegend": "Клик по легенде — подсветить все рёбра этого типа.",
    "help.tipStats": "Клик по любой строке в панели статистики — подсветить соответствующие элементы.",
    "help.tipShare": "«Поделиться» копирует ссылку с данными внутри — без загрузки на сервер.",
    "help.tipCollapse": "Двойной клик по группе сворачивает/разворачивает её.",
    "help.tipPersist": "Переставленные вручную ноды запомнятся для этого конкретного infra.json.",
    "topbar.help": "Помощь",
  },
} as const;

type Key = keyof typeof dict.en;

export const i18n = $state<{ lang: Lang }>({ lang: detect() });

export function setLang(l: Lang): void {
  i18n.lang = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {
    // ignore
  }
}

export function t(key: Key): string {
  return dict[i18n.lang][key] ?? dict.en[key] ?? key;
}
