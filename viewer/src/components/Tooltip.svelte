<script lang="ts">
  import { onMount } from "svelte";
  import tippy, { type Instance, type Props } from "tippy.js";
  import "tippy.js/dist/tippy.css";

  interface ServiceTooltipData {
    label: string;
    id: string;
    description: string | null;
    owner: string | null;
    tags: Record<string, string>;
    links: Record<string, string>;
  }

  interface CompProps {
    target: HTMLElement;
    data: ServiceTooltipData | null;
  }
  let { target, data }: CompProps = $props();

  let instance: Instance<Props> | null = null;

  function buildHtml(d: ServiceTooltipData): string {
    const tags = Object.entries(d.tags).map(
      ([k, v]) => `<span class="tag"><b>${escape(k)}</b>:${escape(v)}</span>`,
    ).join("");
    const links = Object.entries(d.links).map(
      ([k, v]) => `<a href="${escape(v)}" target="_blank" rel="noreferrer">${escape(k)}</a>`,
    ).join("");
    return `
      <div class="tt">
        <div class="tt-title">${escape(d.label)}</div>
        <div class="tt-id">${escape(d.id)}</div>
        ${d.description ? `<div class="tt-desc">${escape(d.description)}</div>` : ""}
        ${d.owner ? `<div class="tt-owner">owner: ${escape(d.owner)}</div>` : ""}
        ${tags ? `<div class="tt-tags">${tags}</div>` : ""}
        ${links ? `<div class="tt-links">${links}</div>` : ""}
      </div>
    `;
  }

  function escape(s: string): string {
    return s.replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
    );
  }

  onMount(() => {
    instance = tippy(target, {
      content: "",
      allowHTML: true,
      interactive: true,
      placement: "top",
      arrow: true,
      delay: [200, 0],
      offset: [0, 12],
      appendTo: () => document.body,
    });
    return () => instance?.destroy();
  });

  $effect(() => {
    if (!instance) return;
    if (data) {
      instance.setContent(buildHtml(data));
      instance.show();
    } else {
      instance.hide();
    }
  });
</script>

<style>
  :global(.tt) { font-size: 12px; line-height: 1.4; max-width: 280px; }
  :global(.tt-title) { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
  :global(.tt-id) { font-family: ui-monospace, monospace; font-size: 11px; opacity: 0.7; margin-bottom: 8px; }
  :global(.tt-desc) { margin-bottom: 8px; }
  :global(.tt-owner) { opacity: 0.85; margin-bottom: 6px; }
  :global(.tt-tags) { display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0; }
  :global(.tt-tags .tag) { background: rgba(255,255,255,0.1); padding: 1px 6px; border-radius: 999px; font-size: 11px; }
  :global(.tt-links) { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
  :global(.tt-links a) { color: #88c0ff; text-decoration: none; font-size: 12px; }
  :global(.tt-links a:hover) { text-decoration: underline; }
</style>
