<script lang="ts">
  import type { InfraJson } from "../types";
  import { t } from "../lib/i18n.svelte";

  interface Props {
    infra: InfraJson;
    onMatch: (ids: string[]) => void;
  }
  let { infra, onMatch }: Props = $props();

  let query = $state("");
  let selectedOwners = $state<string[]>([]);
  let selectedGroups = $state<string[]>([]);
  let selectedTags = $state<string[]>([]);
  let selectedKinds = $state<string[]>([]);
  let openMenu = $state<"owner" | "group" | "tag" | "kind" | null>(null);

  const owners = $derived(
    [...new Set(infra.services.map((s) => s.owner).filter((o): o is string => !!o))].sort(),
  );
  const groups = $derived(
    infra.groups.map((g) => ({ id: g.id, label: g.label })).sort((a, b) => a.label.localeCompare(b.label)),
  );
  const tags = $derived(() => {
    const set = new Set<string>();
    for (const s of infra.services) {
      for (const [k, v] of Object.entries(s.tags)) set.add(`${k}:${v}`);
    }
    return [...set].sort();
  });
  const kinds = $derived(
    [...new Set(infra.services.map((s) => s.kind ?? "service"))].sort(),
  );

  function toggle(list: string[], v: string): string[] {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  }

  function matchService(s: InfraJson["services"][number], q: string): boolean {
    if (q) {
      const hay = [
        s.id,
        s.label,
        s.owner ?? "",
        ...Object.entries(s.tags).flatMap(([k, v]) => [k, v]),
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (selectedOwners.length > 0 && (!s.owner || !selectedOwners.includes(s.owner))) return false;
    if (selectedGroups.length > 0 && (!s.group || !selectedGroups.includes(s.group))) return false;
    if (selectedTags.length > 0) {
      const have = new Set(Object.entries(s.tags).map(([k, v]) => `${k}:${v}`));
      if (!selectedTags.every((tg) => have.has(tg))) return false;
    }
    if (selectedKinds.length > 0) {
      if (!selectedKinds.includes(s.kind ?? "service")) return false;
    }
    return true;
  }

  function matchGroup(g: InfraJson["groups"][number], q: string): boolean {
    if (!q) return false;
    return g.id.toLowerCase().includes(q) || g.label.toLowerCase().includes(q);
  }

  function recompute() {
    const q = query.trim().toLowerCase();
    const hasFilters =
      q.length > 0 ||
      selectedOwners.length > 0 ||
      selectedGroups.length > 0 ||
      selectedTags.length > 0 ||
      selectedKinds.length > 0;
    if (!hasFilters) {
      onMatch([]);
      return;
    }
    const ids: string[] = [];
    for (const s of infra.services) if (matchService(s, q)) ids.push(s.id);
    for (const g of infra.groups) if (matchGroup(g, q)) ids.push(g.id);
    onMatch(ids);
  }

  $effect(() => {
    // re-run on any filter change
    void [query, selectedOwners, selectedGroups, selectedTags, selectedKinds];
    recompute();
  });

  function reset() {
    query = "";
    selectedOwners = [];
    selectedGroups = [];
    selectedTags = [];
    selectedKinds = [];
    openMenu = null;
  }

  const filterCount = $derived(
    selectedOwners.length + selectedGroups.length + selectedTags.length + selectedKinds.length,
  );
</script>

<div class="search">
  <input
    type="text"
    placeholder={t("search.placeholder")}
    bind:value={query}
    onkeydown={(e) => e.key === "Escape" && reset()}
  />

  <div class="filter">
    <button
      class:active={selectedOwners.length > 0}
      onclick={() => (openMenu = openMenu === "owner" ? null : "owner")}
    >
      {t("filter.owner")}{selectedOwners.length > 0 ? ` (${selectedOwners.length})` : ""}
    </button>
    {#if openMenu === "owner"}
      <div class="menu">
        {#each owners as o}
          <label>
            <input type="checkbox" checked={selectedOwners.includes(o)} onchange={() => (selectedOwners = toggle(selectedOwners, o))} />
            {o}
          </label>
        {/each}
        {#if owners.length === 0}<span class="empty">—</span>{/if}
      </div>
    {/if}
  </div>

  <div class="filter">
    <button
      class:active={selectedGroups.length > 0}
      onclick={() => (openMenu = openMenu === "group" ? null : "group")}
    >
      {t("filter.group")}{selectedGroups.length > 0 ? ` (${selectedGroups.length})` : ""}
    </button>
    {#if openMenu === "group"}
      <div class="menu">
        {#each groups as g}
          <label>
            <input type="checkbox" checked={selectedGroups.includes(g.id)} onchange={() => (selectedGroups = toggle(selectedGroups, g.id))} />
            {g.label} <code>{g.id}</code>
          </label>
        {/each}
        {#if groups.length === 0}<span class="empty">—</span>{/if}
      </div>
    {/if}
  </div>

  <div class="filter">
    <button
      class:active={selectedTags.length > 0}
      onclick={() => (openMenu = openMenu === "tag" ? null : "tag")}
    >
      {t("filter.tag")}{selectedTags.length > 0 ? ` (${selectedTags.length})` : ""}
    </button>
    {#if openMenu === "tag"}
      <div class="menu">
        {#each tags() as tg}
          <label>
            <input type="checkbox" checked={selectedTags.includes(tg)} onchange={() => (selectedTags = toggle(selectedTags, tg))} />
            <code>{tg}</code>
          </label>
        {/each}
        {#if tags().length === 0}<span class="empty">—</span>{/if}
      </div>
    {/if}
  </div>

  <div class="filter">
    <button
      class:active={selectedKinds.length > 0}
      onclick={() => (openMenu = openMenu === "kind" ? null : "kind")}
    >
      {t("filter.kind")}{selectedKinds.length > 0 ? ` (${selectedKinds.length})` : ""}
    </button>
    {#if openMenu === "kind"}
      <div class="menu">
        {#each kinds as k}
          <label>
            <input type="checkbox" checked={selectedKinds.includes(k)} onchange={() => (selectedKinds = toggle(selectedKinds, k))} />
            <code>{k}</code>
          </label>
        {/each}
      </div>
    {/if}
  </div>

  {#if query || filterCount > 0}
    <button class="reset" onclick={reset}>×</button>
  {/if}
</div>

<style>
  .search {
    display: flex;
    align-items: center;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    padding: 4px 6px;
    gap: 6px;
    min-width: 600px;
    position: relative;
  }
  input[type="text"] {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text);
    font-size: 13px;
    padding: 4px;
    min-width: 240px;
  }
  .filter {
    position: relative;
  }
  .filter > button {
    background: transparent;
    border: 1px solid var(--panel-border);
    color: var(--text-muted);
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
  }
  .filter > button:hover {
    background: var(--chip-bg);
    color: var(--text);
  }
  .filter > button.active {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }
  .menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    padding: 6px;
    min-width: 200px;
    max-height: 320px;
    overflow-y: auto;
    z-index: 100;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .menu label {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    color: var(--text);
  }
  .menu label:hover {
    background: var(--chip-bg);
  }
  .menu input[type="checkbox"] {
    margin: 0;
  }
  .menu code {
    font-family: ui-monospace, monospace;
    font-size: 11px;
    color: var(--text-muted);
  }
  .menu .empty {
    color: var(--text-muted);
    padding: 4px 6px;
    font-size: 12px;
  }
  .reset {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 0 4px;
  }
  .reset:hover {
    color: var(--text);
  }
</style>
