<script lang="ts">
  import { t } from "../lib/i18n.svelte";

  interface Props {
    onClose: () => void;
  }
  let { onClose }: Props = $props();
</script>

<button class="overlay" onclick={onClose} aria-label={t("service.close")}></button>
<div class="card" role="dialog" aria-modal="true" tabindex="-1">
  <header>
    <h2>{t("help.title")}</h2>
    <button class="close" onclick={onClose}>×</button>
  </header>

    <section>
      <h3>{t("help.mouse")}</h3>
      <dl>
        <dt>{t("help.click")}</dt><dd>{t("help.clickDesc")}</dd>
        <dt>{t("help.middleDrag")}</dt><dd>{t("help.middleDragDesc")}</dd>
        <dt>{t("help.leftDrag")}</dt><dd>{t("help.leftDragDesc")}</dd>
        <dt>{t("help.wheel")}</dt><dd>{t("help.wheelDesc")}</dd>
        <dt>{t("help.hover")}</dt><dd>{t("help.hoverDesc")}</dd>
      </dl>
    </section>

    <section>
      <h3>{t("help.keys")}</h3>
      <dl>
        <dt><kbd>?</kbd></dt><dd>{t("help.keyHelp")}</dd>
        <dt><kbd>Esc</kbd></dt><dd>{t("help.keyEsc")}</dd>
        <dt><kbd>Ctrl</kbd>+<kbd>V</kbd></dt><dd>{t("help.keyPaste")}</dd>
      </dl>
    </section>

    <section>
      <h3>{t("help.tips")}</h3>
      <ul>
        <li>{t("help.tipLegend")}</li>
        <li>{t("help.tipStats")}</li>
        <li>{t("help.tipCollapse")}</li>
        <li>{t("help.tipPersist")}</li>
        <li>{t("help.tipShare")}</li>
      </ul>
    </section>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    border: none;
    cursor: default;
    z-index: 200;
  }
  .card {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: 12px;
    padding: 24px;
    max-width: 520px;
    width: 90%;
    max-height: 85vh;
    overflow-y: auto;
    color: var(--text);
    z-index: 201;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  h2 {
    margin: 0;
    font-size: 18px;
  }
  .close {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
    padding: 0 4px;
  }
  .close:hover {
    color: var(--text);
  }
  h3 {
    margin: 0 0 8px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
  }
  section {
    margin-bottom: 18px;
  }
  dl {
    display: grid;
    grid-template-columns: minmax(140px, auto) 1fr;
    gap: 6px 16px;
    font-size: 13px;
    margin: 0;
  }
  dt {
    color: var(--text-muted);
  }
  dd {
    margin: 0;
  }
  ul {
    margin: 0;
    padding-left: 18px;
    font-size: 13px;
  }
  ul li {
    margin-bottom: 4px;
  }
  kbd {
    background: var(--chip-bg);
    border: 1px solid var(--panel-border);
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-family: ui-monospace, monospace;
  }
</style>
