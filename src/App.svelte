<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { currentBlobbi, game, loadGame, stopGame, ui } from './lib/blobbi/store.svelte.js';
  import Onboarding from './components/Onboarding.svelte';
  import Game from './components/Game.svelte';

  let ready = $state(false);

  onMount(async () => {
    try {
      await loadGame();
    } catch (err) {
      console.warn('[blobbi] load failed:', err);
    } finally {
      ready = true;
    }
  });
  onDestroy(() => stopGame());

  const showGame = $derived(game.onboarding !== 'preview' && !!currentBlobbi());
</script>

<main class="root">
  {#if !ready}
    <div class="center muted">{ui.importing ? 'looking for your Blobbi…' : 'loading…'}</div>
  {:else if showGame}
    <Game />
  {:else}
    <Onboarding />
  {/if}

  {#if ui.toast}
    <div class="toast">{ui.toast}</div>
  {/if}
</main>

<style>
  .root {
    height: 100vh;
    width: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--hg-bg-base, #151923);
    color: var(--hg-text-primary, #eef2f7);
    font-family: var(--hg-font-body, ui-monospace, monospace);
  }
  .center { flex: 1; display: grid; place-items: center; }
  .muted { color: var(--hg-text-muted, #8a93a3); }
  .toast {
    position: fixed;
    left: 50%;
    bottom: 18px;
    transform: translateX(-50%);
    background: var(--hg-bg-elevated, #232a37);
    border: 1px solid var(--hg-border, #333b49);
    color: var(--hg-text-primary, #eef2f7);
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 13px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.4);
    z-index: 50;
    pointer-events: none;
  }
</style>
