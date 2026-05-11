<script lang="ts">
  import { onMount, untrack } from "svelte";
  import type { Core, EventObject } from "cytoscape";
  import type { InfraJson } from "./types";
  import { applyThemeColors, createGraph, relayout } from "./lib/graph";
  import { attachHoverTooltips } from "./lib/hover-tooltip";
  import {
    attachPositionPersistence,
    clearPositions,
    getStorageKey,
    loadPositions,
  } from "./lib/positions";
  import {
    attachInteractions,
    clearHighlight,
    highlightByEdgeClass,
    highlightById,
    isHighlighted,
  } from "./lib/interactions";
  import {
    attachDragAndDrop,
    attachPaste,
    loadFromHash,
    loadFromStorage,
    saveToStorage,
    tryParse,
  } from "./lib/loader";
  import { encodeShareData, buildShareUrl } from "./lib/share";
  import { computeStats } from "./lib/stats";
  import { applyTheme, getInitialTheme, type Theme } from "./lib/theme";
  import { downloadSvg } from "./lib/export";
  import { i18n, setLang, t } from "./lib/i18n.svelte";
  import EmptyState from "./components/EmptyState.svelte";
  import StatsPanel from "./components/StatsPanel.svelte";
  import SearchBar from "./components/SearchBar.svelte";
  import Legend from "./components/Legend.svelte";
  import ServicePanel from "./components/ServicePanel.svelte";
  import HelpOverlay from "./components/HelpOverlay.svelte";
  import { Map as MapIcon, Plus, Minus, Maximize2, RotateCcw, Menu as MenuIcon } from "lucide-svelte";
  import sampleJson from "./sample/infra.json?raw";

  let infra = $state<InfraJson | null>(null);
  let error = $state<string | null>(null);
  let theme = $state<Theme>(getInitialTheme());
  const isNarrowInit =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 720px)").matches;
  let showStats = $state(!isNarrowInit);
  let showMinimap = $state(!isNarrowInit);
  let mobileMenuOpen = $state(false);
  let shareNotice = $state<string | null>(null);
  let selectedServiceId = $state<string | null>(null);
  let anchor = $state<{ x: number; y: number; radius: number } | null>(null);

  let cy: Core | null = null;
  let graphContainer: HTMLDivElement;
  let lastJsonText = "";

  const stats = $derived(infra ? computeStats(infra) : null);
  const selectedService = $derived(
    infra && selectedServiceId
      ? infra.services.find((s) => s.id === selectedServiceId) ?? null
      : null,
  );
  const callerIds = $derived(
    infra && selectedServiceId
      ? infra.services
          .filter((s) => s.calls.some((c) => c.id === selectedServiceId))
          .map((s) => s.id)
      : [],
  );

  $effect(() => {
    applyTheme(theme);
    if (cy) applyThemeColors(cy);
  });

  $effect(() => {
    document.documentElement.dataset.minimap = showMinimap ? "on" : "off";
  });

  $effect(() => {
    document.documentElement.lang = i18n.lang;
    // Localized drop-zone overlay text — the CSS uses var(--drop-label) instead of
    // a hardcoded English string so the message follows the active language.
    document.documentElement.style.setProperty("--drop-label", `"${t("empty.drop")}"`);
  });

  let positionsKey = $state<string | null>(null);
  // Cleanup callbacks for everything attached to the current cy instance.
  let cyTeardown: Array<() => void> = [];

  async function loadJson(text: string) {
    const { config, error: err } = tryParse(text);
    if (err || !config) {
      error = err ?? "Unknown error";
      return;
    }
    // Resolve the positions key BEFORE swapping infra so the graph effect sees
    // a key that matches the new JSON (avoids race where positions never load).
    const key = await getStorageKey(text);
    error = null;
    lastJsonText = text;
    positionsKey = key;
    infra = config;
    saveToStorage(text);
  }

  function destroyCy() {
    for (const fn of cyTeardown) {
      try {
        fn();
      } catch {
        // best-effort teardown
      }
    }
    cyTeardown = [];
    if (cy) {
      try {
        cy.destroy();
      } catch {
        // ignore
      }
      cy = null;
    }
  }

  function mountGraph(current: InfraJson, key: string | null) {
    destroyCy();
    const preset = key ? loadPositions(key) ?? undefined : undefined;
    cy = createGraph(graphContainer, current, preset);
    cyTeardown.push(attachInteractions(cy));
    cyTeardown.push(attachHoverTooltips(cy));
    if (key) cyTeardown.push(attachPositionPersistence(cy, key));

    (cy as unknown as { navigator: (opts: object) => void }).navigator({
      viewLiveFramerate: 30,
      thumbnailEventFramerate: 10,
      thumbnailLiveFramerate: 5,
      dblClickDelay: 200,
      removeCustomContainer: true,
      rerenderDelay: 250,
    });

    const localCy = cy;
    const onTap = (e: EventObject) => {
      if (e.target === localCy) {
        selectedServiceId = null;
        anchor = null;
        return;
      }
      const tgt = e.target;
      if (tgt.isNode?.() && tgt.hasClass("service") && !tgt.hasClass("ghost")) {
        selectedServiceId = tgt.id();
        anchor = computeAnchor(tgt.id());
      } else {
        selectedServiceId = null;
        anchor = null;
      }
    };
    localCy.on("tap", onTap);

    let anchorRaf = 0;
    const scheduleAnchor = () => {
      if (anchorRaf) return;
      anchorRaf = requestAnimationFrame(() => {
        anchorRaf = 0;
        if (selectedServiceId) anchor = computeAnchor(selectedServiceId);
      });
    };
    localCy.on("pan zoom", scheduleAnchor);
    localCy.on("position", "node", scheduleAnchor);

    cyTeardown.push(() => {
      if (anchorRaf) {
        cancelAnimationFrame(anchorRaf);
        anchorRaf = 0;
      }
      localCy.off("tap", onTap);
      localCy.off("pan zoom", scheduleAnchor);
      localCy.off("position", "node", scheduleAnchor);
    });
  }

  $effect(() => {
    const current = infra;
    const key = positionsKey;
    if (!current || !graphContainer) return;
    untrack(() => mountGraph(current, key));
  });

  onMount(() => {
    const detachDnd = attachDragAndDrop(document.body, {
      onJson: (text) => loadJson(text),
      onError: (m) => (error = m),
    });
    const detachPaste = attachPaste({
      onJson: (text) => loadJson(text),
      onError: (m) => (error = m),
    });

    (async () => {
      try {
        const fromHash = await loadFromHash();
        if (fromHash) {
          await loadJson(fromHash);
          return;
        }
      } catch (e) {
        error = `Failed to decode shared link: ${(e as Error).message}`;
      }
      const fromStorage = loadFromStorage();
      if (fromStorage) await loadJson(fromStorage);
    })();

    return () => {
      detachDnd();
      detachPaste();
      destroyCy();
    };
  });

  $effect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (e.key === "?") {
        helpOpen = !helpOpen;
        e.preventDefault();
      } else if (e.key === "Escape") {
        if (shareUrl) {
          shareUrl = null;
        } else if (helpOpen) {
          helpOpen = false;
        } else if (cy) {
          clearHighlight(cy);
          selectedServiceId = null;
          anchor = null;
          lastHighlightKey = "";
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function tryWithSample() {
    loadJson(sampleJson);
  }

  let lastHighlightKey = "";

  function highlightFromStats(ids: string[]) {
    if (!cy) return;
    const key = ids.join("|");
    if (ids.length === 0 || (key === lastHighlightKey && isHighlighted(cy))) {
      clearHighlight(cy);
      lastHighlightKey = "";
      selectedServiceId = null;
      anchor = null;
      return;
    }
    highlightById(cy, ids);
    lastHighlightKey = key;
    if (ids.length === 1) {
      selectedServiceId = ids[0]!;
      anchor = computeAnchor(ids[0]!);
    } else {
      selectedServiceId = null;
      anchor = null;
    }
  }

  function computeAnchor(id: string): { x: number; y: number; radius: number } | null {
    if (!cy) return null;
    const node = cy.getElementById(id);
    if (node.length === 0 || !node.isNode()) return null;
    const container = cy.container() as HTMLElement | null;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const pos = node.renderedPosition();
    const radius = Math.max(node.renderedWidth(), node.renderedHeight()) / 2;
    return { x: rect.left + pos.x, y: rect.top + pos.y, radius };
  }

  function highlightByType(type: string) {
    if (!cy) return;
    const key = `type:${type}`;
    if (key === lastHighlightKey && isHighlighted(cy)) {
      clearHighlight(cy);
      lastHighlightKey = "";
      selectedServiceId = null;
      anchor = null;
      return;
    }
    highlightByEdgeClass(cy, type);
    lastHighlightKey = key;
    selectedServiceId = null;
    anchor = null;
  }

  function jumpToService(id: string) {
    if (!cy) return;
    highlightFromStats([id]);
    const node = cy.getElementById(id);
    if (node.length > 0) {
      cy.animate({ center: { eles: node }, zoom: 1.2 }, { duration: 400 });
      setTimeout(() => (anchor = computeAnchor(id)), 420);
    }
  }

  function onSearch(ids: string[]) {
    highlightFromStats(ids);
  }

  let shareUrl = $state<string | null>(null);
  let shareTextarea = $state<HTMLTextAreaElement | undefined>(undefined);

  $effect(() => {
    if (shareUrl && shareTextarea) {
      shareTextarea.focus();
      shareTextarea.select();
    }
  });

  async function copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fall through to legacy path
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.left = "0";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  async function share() {
    if (!lastJsonText) return;
    try {
      const encoded = await encodeShareData(lastJsonText);
      const url = buildShareUrl(encoded);
      if (url.length > 30000) {
        shareNotice = t("share.tooLarge");
        setTimeout(() => (shareNotice = null), 3500);
        return;
      }
      const ok = await copyToClipboard(url);
      if (ok) {
        // Only reflect the share URL in history after a successful copy, so the
        // address bar stays consistent with what's actually on the clipboard.
        window.history.replaceState(null, "", url);
        shareNotice = `${t("share.copied")} (${(encoded.length / 1024).toFixed(1)} KB)`;
        setTimeout(() => (shareNotice = null), 2500);
      } else {
        shareUrl = url;
      }
    } catch (e) {
      shareNotice = `${t("share.failed")}: ${(e as Error).message}`;
      setTimeout(() => (shareNotice = null), 3500);
    }
  }

  let exportMenuOpen = $state(false);
  let langMenuOpen = $state(false);
  let helpOpen = $state(false);

  function zoomBy(factor: number) {
    if (!cy) {
      console.warn("zoomBy: cy not ready");
      return;
    }
    const current = cy.zoom();
    const next = Math.max(cy.minZoom(), Math.min(cy.maxZoom(), current * factor));
    const w = cy.width();
    const h = cy.height();
    const pan = cy.pan();
    // adjust pan so the screen center stays put while zooming
    const cx = w / 2;
    const cy_center = h / 2;
    const newPan = {
      x: cx - ((cx - pan.x) * next) / current,
      y: cy_center - ((cy_center - pan.y) * next) / current,
    };
    cy.zoom(next);
    cy.pan(newPan);
  }

  function fitGraph() {
    if (!cy) return;
    cy.fit(undefined, 40);
  }

  function resetLayout() {
    if (!cy) return;
    if (positionsKey) clearPositions(positionsKey);
    relayout(cy);
  }

  function exportSvg(exportTheme?: Theme) {
    if (!cy) return;
    downloadSvg(cy, `${infra?.meta.title ?? "inframap"}.svg`, exportTheme);
    exportMenuOpen = false;
  }

  function toggleStats() {
    showStats = !showStats;
    // Cytoscape doesn't observe container size changes; force a resize so the
    // canvas matches the new flex width and the graph stays interactive.
    requestAnimationFrame(() => cy?.resize());
  }

  function reset() {
    destroyCy();
    infra = null;
    lastJsonText = "";
    positionsKey = null;
    selectedServiceId = null;
    anchor = null;
    lastHighlightKey = "";
    error = null;
  }
</script>

<div class="layout">
  {#if infra}
    <header class="topbar">
      <div class="title">
        <div class="title-name">{infra.meta.title}</div>
        {#if infra.meta.description}
          <div class="title-desc">{infra.meta.description}</div>
        {/if}
      </div>
      <SearchBar {infra} onMatch={onSearch} />
      <button
        class="burger"
        onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
        aria-label={t("topbar.menu")}
        aria-expanded={mobileMenuOpen}
        title={t("topbar.menu")}
      >
        <MenuIcon size={18} />
      </button>
      <div class="controls" class:open={mobileMenuOpen}>
        <Legend onPick={highlightByType} />
        <button onclick={() => { share(); mobileMenuOpen = false; }} title={t("topbar.shareTitle")}>{t("topbar.share")}</button>
        <div class="export-wrap">
          <button onclick={() => (exportMenuOpen = !exportMenuOpen)} title={t("topbar.exportTitle")}>
            {t("topbar.export")} ▾
          </button>
          {#if exportMenuOpen}
            <div class="export-menu">
              <button onclick={() => exportSvg()}>{t("export.current")}</button>
              <button onclick={() => exportSvg("light")}>{t("export.light")}</button>
              <button onclick={() => exportSvg("dark")}>{t("export.dark")}</button>
            </div>
          {/if}
        </div>
        <button onclick={toggleStats} title={t("topbar.statsTitle")} class:active={showStats}>{t("topbar.stats")}</button>
        <div class="export-wrap">
          <button onclick={() => (langMenuOpen = !langMenuOpen)} title={t("topbar.langTitle")}>
            🌐 {i18n.lang === "ru" ? "Русский" : "English"} ▾
          </button>
          {#if langMenuOpen}
            <div class="export-menu">
              <button onclick={() => { setLang("en"); langMenuOpen = false; }} class:current={i18n.lang === "en"}>English</button>
              <button onclick={() => { setLang("ru"); langMenuOpen = false; }} class:current={i18n.lang === "ru"}>Русский</button>
            </div>
          {/if}
        </div>
        <button onclick={() => (theme = theme === "dark" ? "light" : "dark")} title={t("topbar.themeTitle")}>
          {theme === "dark" ? "☀" : "☾"}
        </button>
        <button onclick={() => { helpOpen = true; mobileMenuOpen = false; }} title={t("topbar.help")}>?</button>
        <button onclick={() => { reset(); mobileMenuOpen = false; }} title={t("topbar.clearTitle")}>×</button>
      </div>
      {#if shareNotice}
        <div class="notice">{shareNotice}</div>
      {/if}
    </header>
  {/if}

  {#if shareUrl}
    <div class="share-modal">
      <button type="button" class="share-backdrop" aria-label="Close" onclick={() => (shareUrl = null)}></button>
      <div class="share-card" role="dialog" aria-modal="true" aria-label={t("share.copy")}>
        <div class="share-head">
          <strong>{t("share.copy")}</strong>
          <button type="button" class="share-close" onclick={() => (shareUrl = null)} aria-label="Close">×</button>
        </div>
        <p class="share-hint">{t("share.manual")}</p>
        <textarea bind:this={shareTextarea} readonly value={shareUrl} onfocus={(e) => (e.currentTarget as HTMLTextAreaElement).select()}></textarea>
      </div>
    </div>
  {/if}

  <main class="main">
    <div class="graph" bind:this={graphContainer}></div>

    {#if !infra}
      <EmptyState onTrySample={tryWithSample} {error} />
    {/if}

    {#if infra && selectedService}
      <ServicePanel
        service={selectedService}
        {callerIds}
        {anchor}
        onClose={() => { selectedServiceId = null; anchor = null; if (cy) clearHighlight(cy); }}
        onJump={jumpToService}
      />
    {/if}

    {#if infra && stats && showStats}
      <StatsPanel {stats} onHighlight={highlightFromStats} onHighlightType={highlightByType} />
    {/if}
  </main>
</div>

{#if infra}
  <div class="zoom-controls">
    <button onclick={() => zoomBy(1.25)} title={t("zoom.in")}><Plus size={18} /></button>
    <button onclick={() => zoomBy(0.8)} title={t("zoom.out")}><Minus size={18} /></button>
    <button onclick={fitGraph} title={t("zoom.fit")}><Maximize2 size={16} /></button>
    <button onclick={resetLayout} title={t("zoom.reset")}><RotateCcw size={16} /></button>
    <button
      onclick={() => (showMinimap = !showMinimap)}
      title={t("zoom.minimap")}
      class:active={showMinimap}
    >
      <MapIcon size={16} />
    </button>
  </div>
{/if}

{#if helpOpen}
  <HelpOverlay onClose={() => (helpOpen = false)} />
{/if}

<style>
  .layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-x: hidden;
  }
  .topbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    background: var(--panel-bg);
    border-bottom: 1px solid var(--panel-border);
    z-index: 10;
    position: relative;
  }
  .title {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }
  .title-name {
    font-weight: 600;
    font-size: 14px;
    color: var(--text);
  }
  .title-desc {
    font-size: 11px;
    color: var(--text-muted);
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }
  .burger {
    display: none;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--panel-border);
    color: var(--text);
    width: 34px;
    height: 34px;
    border-radius: 6px;
    cursor: pointer;
    margin-left: auto;
  }
  .burger:hover {
    background: var(--chip-bg);
  }
  .controls button {
    background: transparent;
    border: 1px solid var(--panel-border);
    color: var(--text);
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
  }
  .controls button:hover {
    background: var(--chip-bg);
  }
  .controls button.active {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }
  .export-wrap {
    position: relative;
  }
  .export-menu {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    padding: 4px;
    display: flex;
    flex-direction: column;
    min-width: 140px;
    z-index: 100;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  .export-menu button {
    border: none;
    background: transparent;
    text-align: left;
    padding: 6px 10px;
    border-radius: 4px;
  }
  .export-menu button:hover {
    background: var(--chip-bg);
  }
  .export-menu button.current {
    background: var(--accent);
    color: white;
  }
  .notice {
    position: absolute;
    bottom: -32px;
    right: 16px;
    background: var(--accent);
    color: white;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  .main {
    position: relative;
    flex: 1;
    display: flex;
    overflow: hidden;
  }
  .graph {
    flex: 1;
    min-width: 0;
    height: 100%;
    overflow: hidden;
    background: var(--bg);
  }
  .zoom-controls {
    position: fixed;
    bottom: 16px;
    left: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    z-index: 1000;
  }
  .zoom-controls button {
    width: 36px;
    height: 36px;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    color: var(--text);
    font-size: 18px;
    cursor: pointer;
    display: grid;
    place-items: center;
  }
  .zoom-controls button:hover {
    background: var(--chip-bg);
  }
  .zoom-controls button.active {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }
  :global(.cytoscape-navigator) {
    position: fixed !important;
    top: 70px !important;
    left: 16px !important;
    bottom: auto !important;
    right: auto !important;
    width: 220px !important;
    height: 150px !important;
    background: var(--bg) !important;
    border: 1px solid var(--panel-border) !important;
    border-radius: 8px !important;
    overflow: hidden !important;
    z-index: 30 !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  :global(html[data-minimap="off"] .cytoscape-navigator) {
    visibility: hidden !important;
    pointer-events: none !important;
  }
  :global(.cytoscape-navigatorView) {
    background: rgba(79, 124, 255, 0.18) !important;
    border: 1px solid var(--accent) !important;
  }
  :global(.cytoscape-navigatorBg) {
    opacity: 1 !important;
  }

  .share-modal {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    z-index: 2000;
    padding: 16px;
  }
  .share-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    border: none;
    cursor: pointer;
  }
  .share-card {
    position: relative;
  }
  .share-card {
    background: var(--panel-bg);
    color: var(--text);
    border: 1px solid var(--panel-border);
    border-radius: 12px;
    padding: 16px;
    width: min(560px, 100%);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
  }
  .share-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .share-close {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 22px;
    cursor: pointer;
    line-height: 1;
    padding: 2px 8px;
    border-radius: 6px;
  }
  .share-hint {
    margin: 0 0 8px;
    font-size: 12px;
    color: var(--text-muted);
  }
  .share-card textarea {
    width: 100%;
    height: 96px;
    box-sizing: border-box;
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    padding: 8px;
    font-family: ui-monospace, monospace;
    font-size: 12px;
    resize: vertical;
  }

  @media (max-width: 720px) {
    .topbar {
      flex-wrap: wrap;
      gap: 8px;
      padding: 8px 10px;
    }
    .title {
      flex: 1 1 0;
      min-width: 0;
      max-width: none;
      order: 1;
    }
    :global(.topbar > .search) {
      order: 3;
      flex: 1 1 100%;
      flex-wrap: wrap;
    }
    .title-name {
      font-size: 13px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .title-desc {
      display: none;
    }
    .burger {
      display: inline-flex;
      flex: 0 0 auto;
      order: 2;
      margin-left: 0;
    }
    .controls {
      display: none;
      order: 4;
      width: 100%;
      margin-left: 0;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-start;
      padding-top: 8px;
      border-top: 1px solid var(--panel-border);
    }
    .controls.open {
      display: flex;
    }
    .controls button {
      padding: 8px 12px;
      font-size: 13px;
    }
    .notice {
      bottom: -28px;
      right: 8px;
      left: 8px;
      text-align: center;
    }
    .zoom-controls {
      bottom: 12px;
      left: 12px;
      flex-direction: row;
    }
    .zoom-controls button {
      width: 34px;
      height: 34px;
    }
    :global(.cytoscape-navigator) {
      width: 130px !important;
      height: 90px !important;
      top: auto !important;
      bottom: 60px !important;
      right: 12px !important;
      left: auto !important;
    }
  }
</style>
