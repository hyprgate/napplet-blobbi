<script lang="ts">
  import { game, rerollMission } from '../lib/blobbi/store.svelte.js';
  import { missionComplete } from '../lib/blobbi/missions.js';
</script>

<div class="missions">
  {#if !game.daily}
    <p class="empty">No missions yet.</p>
  {:else}
    <div class="head">
      <span>Daily Missions</span>
      <span class="rerolls">{game.daily.rerolls} rerolls left</span>
    </div>
    {#each game.daily.missions as m (m.id)}
      {@const done = missionComplete(m)}
      <div class="m" class:done>
        <div class="m-top">
          <span class="m-label">{done ? '✅' : '○'} {m.label}</span>
          <span class="m-xp">+{m.xp} XP</span>
        </div>
        <div class="m-bar"><div class="m-fill" style="width:{Math.min(100, (m.current / m.target) * 100)}%"></div></div>
        <div class="m-foot">
          <span class="m-prog">{Math.min(m.current, m.target)}/{m.target}</span>
          {#if !done && game.daily.rerolls > 0}
            <button class="reroll" onclick={() => rerollMission(m.id)}>↻ reroll</button>
          {/if}
        </div>
      </div>
    {/each}
    {#if game.daily.awarded}
      <p class="bonus">🎉 All missions complete — bonus claimed!</p>
    {/if}
  {/if}
</div>

<style>
  .head { display: flex; justify-content: space-between; font-size: 12px; color: var(--hg-text-muted, #8a93a3); margin-bottom: 10px; }
  .m { border: 1px solid var(--hg-border, #333b49); border-radius: 10px; padding: 10px; margin-bottom: 8px; background: var(--hg-bg-surface, #1c222e); }
  .m.done { opacity: 0.7; }
  .m-top { display: flex; justify-content: space-between; font-size: 12px; }
  .m-xp { color: var(--hg-accent-warning, #d9a441); }
  .m-bar { height: 5px; background: var(--hg-bg-elevated, #232a37); border-radius: 3px; margin: 6px 0; overflow: hidden; }
  .m-fill { height: 100%; background: var(--hg-accent-primary, #7fb37a); transition: width 0.3s; }
  .m-foot { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--hg-text-muted, #8a93a3); }
  .reroll { font: inherit; font-size: 11px; cursor: pointer; background: none; border: 1px solid var(--hg-border, #333b49); border-radius: 6px; color: var(--hg-text-secondary, #b6bfce); padding: 2px 8px; }
  .bonus { font-size: 12px; color: var(--hg-accent-primary, #7fb37a); text-align: center; margin-top: 8px; }
  .empty { font-size: 12px; color: var(--hg-text-muted, #8a93a3); }
</style>
