<script lang="ts">
  import {
    ADOPTION_COST,
    REROLL_COST,
    adoptPreview,
    cancelAdoption,
    game,
    renamePreview,
    rerollPreview,
    startProfile,
    ui,
  } from '../lib/blobbi/store.svelte.js';
  import { adultFormLabel } from '../lib/blobbi/forms.js';
  import { deriveAdultForm } from '../lib/blobbi/seed.js';
  import PixelBlobbi from '../lib/pixel/PixelBlobbi.svelte';

  let name = $state('Blobbi');
  $effect(() => { if (game.preview) name = game.preview.name; });
</script>

<div class="wrap">
  {#if game.onboarding === 'intro'}
    <h1 class="title">Blobbi</h1>
    <p class="lede">Adopt, hatch and raise your very own pixel companion.</p>
    <div class="hint">You start with <strong>{game.coins}</strong> coins.</div>
    {#if ui.importing}
      <div class="hint">checking Nostr for an existing Blobbi…</div>
    {/if}
    <button class="primary" onclick={startProfile}>Begin</button>
  {:else if game.preview}
    <h2 class="title">Meet your egg</h2>
    <div class="egg-stage">
      <PixelBlobbi
        stage="egg"
        emotion="neutral"
        sleeping={false}
        traits={game.preview.traits}
        size={180}
      />
    </div>
    <div class="traits">
      <span class="chip">{game.preview.traits.pattern}</span>
      <span class="chip">{game.preview.traits.size}</span>
      {#if game.preview.traits.specialMark !== 'none'}<span class="chip">{game.preview.traits.specialMark}</span>{/if}
      <span class="chip">destiny: {adultFormLabel(deriveAdultForm(game.preview.seed))}</span>
    </div>

    <label class="field">
      <span>Name</span>
      <input
        value={name}
        oninput={(e) => renamePreview((e.target as HTMLInputElement).value)}
        maxlength="24"
      />
    </label>

    <div class="actions">
      <button class="ghost" onclick={rerollPreview} disabled={game.coins < REROLL_COST}>
        Reroll (−{REROLL_COST})
      </button>
      <button class="primary" onclick={adoptPreview} disabled={game.coins < ADOPTION_COST}>
        Adopt (−{ADOPTION_COST})
      </button>
    </div>
    {#if game.blobbis.length > 0}
      <button class="link" onclick={cancelAdoption}>Cancel</button>
    {/if}
    <div class="hint">Coins: {game.coins}</div>
  {/if}
</div>

<style>
  .wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 24px;
    text-align: center;
  }
  .title { font-family: var(--hg-font-title, inherit); margin: 0; font-size: 28px; }
  .lede { color: var(--hg-text-secondary, #b6bfce); margin: 0; max-width: 340px; }
  .hint { color: var(--hg-text-muted, #8a93a3); font-size: 13px; }
  .egg-stage {
    display: grid;
    place-items: center;
    padding: 16px;
    background: radial-gradient(circle at 50% 40%, var(--hg-bg-surface, #1c222e), transparent 70%);
    border-radius: 16px;
  }
  .traits { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
  .chip {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--hg-bg-elevated, #232a37);
    border: 1px solid var(--hg-border, #333b49);
    color: var(--hg-text-secondary, #b6bfce);
  }
  .field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--hg-text-muted, #8a93a3); }
  .field input {
    background: var(--hg-bg-surface, #1c222e);
    border: 1px solid var(--hg-border, #333b49);
    color: var(--hg-text-primary, #eef2f7);
    border-radius: 8px;
    padding: 8px 10px;
    font: inherit;
    text-align: center;
    width: 220px;
  }
  .actions { display: flex; gap: 10px; }
  button {
    font: inherit;
    cursor: pointer;
    border-radius: 8px;
    padding: 9px 16px;
    border: 1px solid var(--hg-border, #333b49);
    transition: opacity 0.15s, transform 0.1s;
  }
  button:hover:not(:disabled) { opacity: 0.85; }
  button:active:not(:disabled) { transform: translateY(1px); }
  button:disabled { opacity: 0.4; cursor: not-allowed; }
  .primary {
    background: var(--hg-accent-primary, #7fb37a);
    color: var(--hg-bg-base, #151923);
    border-color: transparent;
    font-weight: 600;
  }
  .ghost { background: var(--hg-bg-elevated, #232a37); color: var(--hg-text-primary, #eef2f7); }
  .link { background: none; border: none; color: var(--hg-text-muted, #8a93a3); cursor: pointer; font: inherit; font-size: 12px; text-decoration: underline; padding: 0; }
</style>
