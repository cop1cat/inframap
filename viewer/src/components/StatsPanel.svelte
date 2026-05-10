<script lang="ts">
  import type { Stats } from "../lib/stats";
  import { t } from "../lib/i18n.svelte";

  interface Props {
    stats: Stats;
    onHighlight: (ids: string[]) => void;
    onHighlightType: (type: string) => void;
  }
  let { stats, onHighlight, onHighlightType }: Props = $props();
</script>

<aside class="panel">
  <h2>{t("stats.title")}</h2>

  <section>
    <div class="kv"><span>{t("stats.services")}</span><b>{stats.totalServices}</b></div>
    <div class="kv"><span>{t("stats.groups")}</span><b>{stats.totalGroups}</b></div>
    <div class="kv"><span>{t("stats.calls")}</span><b>{stats.totalCalls}</b></div>
  </section>

  <section>
    <h3>{t("stats.byCallType")}</h3>
    {#each Object.entries(stats.byCallType) as [type, count]}
      <button class="row kv" onclick={() => onHighlightType(type)}>
        <span>{type}</span><b>{count}</b>
      </button>
    {/each}
  </section>

  {#if Object.keys(stats.byKind).length > 0}
    <section>
      <h3>{t("stats.byKind")}</h3>
      {#each Object.entries(stats.byKind) as [kind, count]}
        <div class="kv"><span>{kind}</span><b>{count}</b></div>
      {/each}
    </section>
  {/if}

  {#if stats.brokenLinks.length > 0}
    <section>
      <h3 class="warn">{t("stats.broken")} ({stats.brokenLinks.length})</h3>
      {#each stats.brokenLinks as bl}
        <button class="row" onclick={() => onHighlight([bl.from])}>
          <code>{bl.from}</code> → <code class="broken">{bl.to}</code>
        </button>
      {/each}
    </section>
  {/if}

  {#if stats.withoutOwner.length > 0}
    <section>
      <h3>{t("stats.withoutOwner")} ({stats.withoutOwner.length})</h3>
      <button class="row" onclick={() => onHighlight(stats.withoutOwner)}>
        {t("stats.highlightAll")}
      </button>
      <ul>
        {#each stats.withoutOwner as id}
          <li><button class="link" onclick={() => onHighlight([id])}>{id}</button></li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if stats.withoutDescription.length > 0}
    <section>
      <h3>{t("stats.withoutDescription")} ({stats.withoutDescription.length})</h3>
      <button class="row" onclick={() => onHighlight(stats.withoutDescription)}>
        {t("stats.highlightAll")}
      </button>
      <ul>
        {#each stats.withoutDescription as id}
          <li><button class="link" onclick={() => onHighlight([id])}>{id}</button></li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if stats.topOwners.length > 0}
    <section>
      <h3>{t("stats.topOwners")}</h3>
      {#each stats.topOwners.slice(0, 8) as o}
        <div class="kv"><span>{o.owner}</span><b>{o.count}</b></div>
      {/each}
    </section>
  {/if}

  {#if stats.groupSizes.length > 0}
    <section>
      <h3>{t("stats.groupSizes")}</h3>
      {#each stats.groupSizes as g}
        <button class="row kv" onclick={() => onHighlight([g.group])}>
          <span>{g.label}</span><b>{g.count}</b>
        </button>
      {/each}
    </section>
  {/if}
</aside>

<style>
  .panel {
    width: 280px;
    height: 100%;
    overflow-y: auto;
    background: var(--panel-bg);
    border-left: 1px solid var(--panel-border);
    padding: 16px;
    box-sizing: border-box;
    font-size: 13px;
    color: var(--text);
  }
  h2 {
    margin: 0 0 16px;
    font-size: 14px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  h3 {
    margin: 0 0 6px;
    font-size: 12px;
    color: var(--text-muted);
    font-weight: 600;
  }
  h3.warn {
    color: var(--broken-color);
  }
  section {
    margin-bottom: 18px;
  }
  .kv {
    display: flex;
    justify-content: space-between;
    padding: 3px 0;
  }
  .kv b {
    font-variant-numeric: tabular-nums;
  }
  button.row {
    display: block;
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    padding: 4px 6px;
    border-radius: 4px;
    color: inherit;
    cursor: pointer;
    font: inherit;
  }
  button.row:hover {
    background: var(--chip-bg);
  }
  button.kv {
    display: flex;
    justify-content: space-between;
  }
  button.link {
    background: transparent;
    border: none;
    color: var(--accent);
    cursor: pointer;
    padding: 0;
    font: inherit;
  }
  button.link:hover {
    text-decoration: underline;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 4px 0 0;
    max-height: 200px;
    overflow-y: auto;
  }
  ul li {
    padding: 2px 0;
  }
  code {
    font-family: ui-monospace, monospace;
    font-size: 12px;
  }
  code.broken {
    color: var(--broken-color);
  }
</style>
