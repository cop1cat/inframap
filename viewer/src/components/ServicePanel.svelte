<script lang="ts">
  import type { Service } from "../types";
  import { t } from "../lib/i18n.svelte";

  interface Props {
    service: Service;
    onClose: () => void;
    onJump: (id: string) => void;
    callerIds: string[];
    anchor: { x: number; y: number; radius: number } | null;
  }
  let { service, onClose, onJump, callerIds, anchor }: Props = $props();

  const tags = $derived(Object.entries(service.tags));
  const links = $derived(Object.entries(service.links));

  const PANEL_W = 320;
  const PANEL_MAX_H = 480;
  const GAP = 24;

  const positioned = $derived.by(() => {
    if (!anchor) return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const offset = anchor.radius + GAP;
    let left = anchor.x + offset;
    if (left + PANEL_W + 12 > vw) left = anchor.x - offset - PANEL_W;
    if (left < 12) left = 12;
    let top = anchor.y - 40;
    if (top + PANEL_MAX_H > vh - 12) top = vh - 12 - PANEL_MAX_H;
    if (top < 60) top = 60;
    return { left, top };
  });
</script>

<aside
  class="panel"
  style:left={positioned ? `${positioned.left}px` : "auto"}
  style:top={positioned ? `${positioned.top}px` : "60px"}
  style:right={positioned ? "auto" : "12px"}
>
  <header>
    <div>
      <h2>{service.label}</h2>
      <code class="id">{service.id}</code>
    </div>
    <button
      type="button"
      class="close"
      onclick={(e) => { e.stopPropagation(); onClose(); }}
      aria-label={t("service.close")}
    >×</button>
  </header>

  {#if service.description}
    <p class="desc">{service.description}</p>
  {/if}

  <dl>
    {#if service.owner}
      <dt>{t("service.owner")}</dt>
      <dd>{service.owner}</dd>
    {/if}
    {#if service.group}
      <dt>{t("service.group")}</dt>
      <dd><code>{service.group}</code></dd>
    {/if}
  </dl>

  {#if tags.length > 0}
    <section>
      <h3>{t("service.tags")}</h3>
      <div class="chips">
        {#each tags as [k, v]}
          <span class="chip"><b>{k}</b>:{v}</span>
        {/each}
      </div>
    </section>
  {/if}

  {#if links.length > 0}
    <section>
      <h3>{t("service.links")}</h3>
      <ul class="links">
        {#each links as [k, v]}
          <li><a href={v} target="_blank" rel="noreferrer">{k}</a></li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if service.calls.length > 0}
    <section>
      <h3>{t("service.calls")} ({service.calls.length})</h3>
      <ul class="calls">
        {#each service.calls as c}
          <li>
            <button class="link" onclick={() => onJump(c.id)}>
              <span class={`type ${c.type}`}>{c.type}</span>
              <code class:broken={c.broken}>{c.id}</code>
              {#if c.broken}<span class="badge">{t("service.broken")}</span>{/if}
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if callerIds.length > 0}
    <section>
      <h3>{t("service.calledBy")} ({callerIds.length})</h3>
      <ul class="calls">
        {#each callerIds as id}
          <li>
            <button class="link" onclick={() => onJump(id)}>
              <code>{id}</code>
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</aside>

<style>
  .panel {
    position: fixed;
    width: 320px;
    max-height: 480px;
    overflow-y: auto;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    color: var(--text);
    font-size: 13px;
    z-index: 20;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }
  h2 {
    margin: 0 0 2px;
    font-size: 16px;
  }
  .id {
    font-family: ui-monospace, monospace;
    font-size: 11px;
    color: var(--text-muted);
  }
  .close {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
    padding: 4px 10px;
    border-radius: 6px;
    z-index: 1;
    position: relative;
  }
  .close:hover {
    color: var(--text);
  }
  .desc {
    margin: 0 0 14px;
    color: var(--text);
  }
  dl {
    margin: 0 0 14px;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 12px;
    font-size: 12px;
  }
  dt {
    color: var(--text-muted);
  }
  dd {
    margin: 0;
  }
  section {
    margin-bottom: 14px;
  }
  h3 {
    margin: 0 0 6px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    font-weight: 600;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .chip {
    background: var(--chip-bg);
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
  }
  .chip b {
    color: var(--text-muted);
    font-weight: 500;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  ul li {
    padding: 2px 0;
  }
  .links a {
    color: var(--accent);
    text-decoration: none;
    font-size: 12px;
  }
  .links a:hover {
    text-decoration: underline;
  }
  .link {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    color: inherit;
    cursor: pointer;
    font: inherit;
    padding: 4px 6px;
    border-radius: 4px;
  }
  .link:hover {
    background: var(--chip-bg);
  }
  .type {
    display: inline-block;
    min-width: 50px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    font-family: ui-monospace, monospace;
  }
  .type.broken {
    color: var(--broken-color);
  }
  code.broken {
    color: var(--broken-color);
  }
  .badge {
    margin-left: auto;
    background: var(--broken-color);
    color: white;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 10px;
  }
  code {
    font-family: ui-monospace, monospace;
    font-size: 12px;
  }
</style>
