<script lang="ts">
  interface Props {
    onPick: (type: string) => void;
  }
  let { onPick }: Props = $props();
</script>

<div class="legend">
  <button class="row" onclick={() => onPick("sync")}><span class="line sync"></span> sync</button>
  <button class="row" onclick={() => onPick("async")}><span class="line async"></span> async</button>
  <button class="row" onclick={() => onPick("event")}><span class="line event"></span> event</button>
  <button class="row" onclick={() => onPick("unknown")}><span class="line unknown"></span> unknown</button>
  <button class="row" onclick={() => onPick("broken")}><span class="line broken"></span> broken</button>
</div>

<style>
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
    padding: 4px 6px;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    font-size: 12px;
    color: var(--text-muted);
  }
  @media (max-width: 720px) {
    .line {
      width: 18px;
    }
    .row {
      padding: 2px 6px;
    }
  }
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: none;
    color: inherit;
    cursor: pointer;
    font: inherit;
    padding: 3px 8px;
    border-radius: 4px;
  }
  .row:hover {
    background: var(--chip-bg);
    color: var(--text);
  }
  .line {
    display: inline-block;
    width: 26px;
    height: 0;
    border-top: 1.5px solid var(--edge-color);
  }
  .line.async {
    border-top-style: dashed;
  }
  .line.event {
    border-top-style: dotted;
  }
  .line.unknown {
    border-top-color: var(--edge-muted);
  }
  .line.broken {
    border-top-style: dashed;
    border-top-color: var(--broken-color);
  }
</style>
