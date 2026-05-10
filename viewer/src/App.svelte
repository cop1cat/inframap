<script lang="ts">
  import { onMount, untrack } from "svelte";
  import type { Core } from "cytoscape";
  import type { InfraJson } from "./types";
  import { applyThemeColors, createGraph, updateGraph } from "./lib/graph";
  import { attachHoverTooltips } from "./lib/hover-tooltip";
  import {
    attachPositionPersistence,
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
  import { Map as MapIcon, Plus, Minus, Maximize2 } from "lucide-svelte";
  import sampleJson from "./sample/infra.json?raw";

  let infra = $state<InfraJson | null>(null);
  let error = $state<string | null>(null);
  let theme = $state<Theme>(getInitialTheme());
  let showStats = $state(true);
  let showMinimap = $state(true);
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

  let positionsKey = $state<string | null>(null);

  async function loadJson(text: string) {
    const { config, error: err } = tryParse(text);
    if (err || !config) {
      error = err ?? "Unknown error";
      return;
    }
    error = null;
    infra = config;
    lastJsonText = text;
    saveToStorage(text);
    positionsKey = await getStorageKey(text);
  }

  $effect(() => {
    const current = infra;
    if (!current || !graphContainer) return;
    untrack(() => {
      if (cy) {
        updateGraph(cy, current);
      } else {
        const preset = positionsKey ? loadPositions(positionsKey) ?? undefined : undefined;
        cy = createGraph(graphContainer, current, preset);
        attachInteractions(cy);
        attachHoverTooltips(cy);
        if (positionsKey) attachPositionPersistence(cy, positionsKey);

        (cy as unknown as { navigator: (opts: object) => void }).navigator({
          viewLiveFramerate: 30,
          thumbnailEventFramerate: 10,
          thumbnailLiveFramerate: 5,
          dblClickDelay: 200,
          removeCustomContainer: true,
          rerenderDelay: 250,
        });
        cy.on("tap", (e) => {
          if (e.target === cy) {
            selectedServiceId = null;
            anchor = null;
            return;
          }
          if (e.target.isNode?.() && e.target.hasClass("service") && !e.target.hasClass("ghost")) {
            selectedServiceId = e.target.id();
            anchor = computeAnchor(e.target.id());
          } else {
            selectedServiceId = null;
            anchor = null;
          }
        });
        // Throttle anchor recompute to avoid spam; recompute also on node drag.
        let anchorRaf = 0;
        const scheduleAnchor = () => {
          if (anchorRaf) return;
          anchorRaf = requestAnimationFrame(() => {
            anchorRaf = 0;
            if (selectedServiceId) anchor = computeAnchor(selectedServiceId);
          });
        };
        cy.on("pan zoom", scheduleAnchor);
        cy.on("position", "node", scheduleAnchor);
      }
    });
  });

  onMount(async () => {
    attachDragAndDrop(document.body, {
      onJson: (text) => loadJson(text),
      onError: (m) => (error = m),
    });
    attachPaste({
      onJson: (text) => loadJson(text),
      onError: (m) => (error = m),
    });

    try {
      const fromHash = await loadFromHash();
      if (fromHash) {
        loadJson(fromHash);
        return;
      }
    } catch (e) {
      error = `Failed to decode shared link: ${(e as Error).message}`;
    }

    const fromStorage = loadFromStorage();
    if (fromStorage) loadJson(fromStorage);
  });

  $effect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (e.key === "?") {
        helpOpen = !helpOpen;
        e.preventDefault();
      } else if (e.key === "Escape") {
        if (helpOpen) {
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

  async function share() {
    if (!lastJsonText) return;
    try {
      const encoded = await encodeShareData(lastJsonText);
      const url = buildShareUrl(encoded);
      if (url.length > 30000) {
        shareNotice = t("share.tooLarge");
        return;
      }
      await navigator.clipboard.writeText(url);
      window.history.replaceState(null, "", url);
      shareNotice = `${t("share.copied")} (${(encoded.length / 1024).toFixed(1)} KB)`;
      setTimeout(() => (shareNotice = null), 2500);
    } catch (e) {
      shareNotice = `${t("share.failed")}: ${(e as Error).message}`;
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

  function exportSvg(exportTheme?: Theme) {
    if (!cy) return;
    downloadSvg(cy, `${infra?.meta.title ?? "inframap"}.svg`, exportTheme);
    exportMenuOpen = false;
  }

  function reset() {
    if (cy) clearHighlight(cy);
    infra = null;
    lastJsonText = "";
    cy?.destroy();
    cy = null;
  }
</script>

<div class="layout">
  {#if infra}
    <header class="topbar">
      <div class="title">{infra.meta.title}</div>
      <SearchBar {infra} onMatch={onSearch} />
      <div class="controls">
        <Legend onPick={highlightByType} />
        <button onclick={share} title={t("topbar.shareTitle")}>{t("topbar.share")}</button>
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
        <button onclick={() => (showStats = !showStats)} title={t("topbar.statsTitle")}>{t("topbar.stats")}</button>
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
        <button onclick={() => (helpOpen = true)} title={t("topbar.help")}>?</button>
        <button onclick={reset} title={t("topbar.clearTitle")}>×</button>
      </div>
      {#if shareNotice}
        <div class="notice">{shareNotice}</div>
      {/if}
    </header>
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
    font-weight: 600;
    font-size: 14px;
    color: var(--text);
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
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
    height: 100%;
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
</style>
