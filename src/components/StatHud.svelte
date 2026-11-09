<script lang="ts">
  import { STAT_ICON, STAT_LABEL } from '../lib/blobbi/economy.js';
  import { statSegments } from '../lib/blobbi/segments.js';
  import { STAT_KEYS, type Blobbi, type StatKey } from '../lib/blobbi/types.js';

  const { blobbi }: { blobbi: Blobbi } = $props();

  const COLORS: Record<string, string> = {
    good: 'var(--hg-accent-primary, #7fb37a)',
    okay: 'var(--hg-accent-primary, #7fb37a)',
    attention: 'var(--hg-accent-warning, #d9a441)',
    urgent: 'var(--hg-accent-danger, #d4675b)',
    // An egg's stats can't fall, so they read as healthy rather than switched off.
    protected: 'color-mix(in srgb, var(--hg-accent-primary, #7fb37a) 70%, transparent)',
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
    <div
      class="row"
      class:pulse={seg.isUrgent}
      role="meter"
      aria-label={STAT_LABEL[key]}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={blobbi.stats[key]}
    >
      <span class="ico" aria-hidden="true">{STAT_ICON[key]}</span>
      <span class="label" class:low={seg.isLow}>{STAT_LABEL[key]}{#if seg.isUrgent}<span class="flag"> needs care</span>{/if}</span>
      <div class="bar" aria-hidden="true">
        {#each Array(seg.total) as _, i (i)}
          <span class="seg" style="background:{i < seg.filled ? COLORS[seg.careState] : 'var(--hg-bg-elevated, #232a37)'}"></span>
        {/each}
      </div>
      <span class="val" aria-hidden="true">{blobbi.stats[key]}</span>
    </div>
  {/each}
</div>

<style>
  .hud { display: flex; flex-direction: column; gap: 6px; }
  .row { display: grid; grid-template-columns: 20px minmax(70px, auto) 1fr 28px; align-items: center; gap: 8px; }
  .ico { font-size: 14px; text-align: center; }
  .label { font-size: 12px; color: var(--hg-text-secondary, #b6bfce); white-space: nowrap; }
  .label.low { color: var(--hg-accent-warning, #d9a441); }
  .flag { color: var(--hg-accent-danger, #d4675b); font-weight: 600; }
  .bar { display: flex; gap: 2px; height: 10px; }
  .seg { flex: 1; border-radius: 2px; min-width: 3px; transition: background 0.3s; }
  .val { font-size: 11px; color: var(--hg-text-muted, #8a93a3); text-align: right; font-variant-numeric: tabular-nums; }
  .pulse { animation: pulse 1.1s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
  @media (prefers-reduced-motion: reduce) {
    .pulse { animation: none; }
  }
</style>
