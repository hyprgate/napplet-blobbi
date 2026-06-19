<script lang="ts">
  import { statSegments } from '../lib/blobbi/segments.js';
  import { STAT_KEYS, type Blobbi, type StatKey } from '../lib/blobbi/types.js';

  const { blobbi }: { blobbi: Blobbi } = $props();

  const ICONS: Record<StatKey, string> = {
    hunger: '🍖', happiness: '😊', health: '❤️', hygiene: '🫧', energy: '⚡',
  };
  const COLORS: Record<string, string> = {
    good: 'var(--hg-accent-primary, #7fb37a)',
    okay: 'var(--hg-accent-primary, #7fb37a)',
    attention: 'var(--hg-accent-warning, #d9a441)',
    urgent: 'var(--hg-accent-danger, #d4675b)',
    protected: 'var(--hg-text-muted, #8a93a3)',
  };

  // Eggs only show health, hygiene, happiness.
  const visibleStats = $derived(
    blobbi.lifeStage === 'egg'
      ? (['health', 'hygiene', 'happiness'] as StatKey[])
      : ([...STAT_KEYS] as StatKey[]),
  );
</script>

<div class="hud">
  {#each visibleStats as key (key)}
    {@const seg = statSegments(blobbi.lifeStage, blobbi.stats[key])}
    <div class="row" class:pulse={seg.isUrgent}>
      <span class="ico" title={key}>{ICONS[key]}</span>
      <div class="bar">
        {#each Array(seg.total) as _, i (i)}
          <span class="seg" style="background:{i < seg.filled ? COLORS[seg.careState] : 'var(--hg-bg-elevated, #232a37)'}"></span>
        {/each}
      </div>
      <span class="val">{blobbi.stats[key]}</span>
    </div>
  {/each}
</div>

<style>
  .hud { display: flex; flex-direction: column; gap: 6px; }
  .row { display: grid; grid-template-columns: 22px 1fr 28px; align-items: center; gap: 8px; }
  .ico { font-size: 14px; text-align: center; }
  .bar { display: flex; gap: 2px; height: 10px; }
  .seg { flex: 1; border-radius: 2px; min-width: 3px; transition: background 0.3s; }
  .val { font-size: 11px; color: var(--hg-text-muted, #8a93a3); text-align: right; font-variant-numeric: tabular-nums; }
  .pulse { animation: pulse 1.1s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
</style>
