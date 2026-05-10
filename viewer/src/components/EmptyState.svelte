<script lang="ts">
  import { t } from "../lib/i18n.svelte";
  interface Props {
    onTrySample: () => void;
    error?: string | null;
  }
  let { onTrySample, error = null }: Props = $props();
</script>

<div class="empty">
  <div class="card">
    <div class="icon">📁</div>
    <h1>InfraMap</h1>
    <p class="lead">{t("empty.drop")}</p>
    <p class="muted">{t("empty.paste")} <kbd>Ctrl</kbd>+<kbd>V</kbd></p>
    <button class="primary" onclick={onTrySample}>{t("empty.try")}</button>
    {#if error}
      <p class="error">{error}</p>
    {/if}
    <p class="hint">
      {t("empty.generate")}
      <a href="https://github.com/cop1cat/inframap" target="_blank" rel="noreferrer">{t("empty.cli")}</a>.
    </p>
    <p class="privacy">🔒 {t("empty.privacy")}</p>
  </div>
</div>

<style>
  .empty {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    pointer-events: none;
    z-index: 5;
  }
  .card {
    pointer-events: auto;
    text-align: center;
    padding: 40px 48px;
    border-radius: 16px;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    max-width: 420px;
  }
  .icon {
    font-size: 48px;
    margin-bottom: 8px;
  }
  h1 {
    margin: 0 0 24px;
    font-size: 20px;
    color: var(--text-muted);
    letter-spacing: 0.02em;
  }
  .lead {
    margin: 0 0 4px;
    font-size: 18px;
    color: var(--text);
  }
  .muted {
    color: var(--text-muted);
    margin: 0 0 24px;
  }
  kbd {
    background: var(--chip-bg);
    border: 1px solid var(--panel-border);
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 12px;
    font-family: ui-monospace, monospace;
  }
  .primary {
    background: var(--accent);
    color: white;
    border: none;
    padding: 10px 22px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }
  .primary:hover {
    filter: brightness(1.1);
  }
  .error {
    margin-top: 16px;
    color: var(--broken-color);
    font-size: 13px;
  }
  .hint {
    margin-top: 24px;
    color: var(--text-muted);
    font-size: 12px;
  }
  .hint a {
    color: var(--accent);
    text-decoration: none;
  }
  .hint a:hover {
    text-decoration: underline;
  }
  .privacy {
    margin-top: 8px;
    color: var(--text-muted);
    font-size: 11px;
    opacity: 0.8;
  }
</style>
