<script lang="ts">
  import {
    cleanPoop,
    currentBlobbi,
    currentEmotion,
    directAction,
    doEvolve,
    doHatch,
    evolveReady,
    game,
    hatchReady,
    selectBlobbi,
    startNewAdoption,
    takePhoto,
    toggleSleep,
    useItem,
  } from '../lib/blobbi/store.svelte.js';
  import PixelBlobbiMini from '../lib/pixel/PixelBlobbi.svelte';
  import { EMOTION_LABEL } from '../lib/blobbi/emotions.js';
  import { adultFormLabel } from '../lib/blobbi/forms.js';
  import { xpToLevel, xpProgress } from '../lib/blobbi/progression.js';
  import { shopItem } from '../lib/blobbi/shop.js';
  import PixelBlobbi from '../lib/pixel/PixelBlobbi.svelte';
  import StatHud from './StatHud.svelte';
  import Shop from './Shop.svelte';
  import Missions from './Missions.svelte';

  type Tab = 'care' | 'shop' | 'missions';
  let tab = $state<Tab>('care');

  const b = $derived(currentBlobbi()!);
  const sleeping = $derived(b.state === 'sleeping');
  const isEgg = $derived(b.lifeStage === 'egg');
  const level = $derived(xpToLevel(game.playerXp));

  const ownedItems = $derived(
    Object.entries(game.inventory)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ item: shopItem(id)!, qty }))
      .filter((x) => x.item),
  );

  const stageLabel = $derived(
    b.lifeStage === 'adult' ? adultFormLabel(b.adultForm ?? 'adult')
    : b.lifeStage === 'baby' ? 'Baby'
    : 'Egg',
  );
</script>

<div class="game">
  <!-- Header -->
  <header class="bar">
    <div class="who">
      <strong>{b.name}</strong>
      <span class="sub">{stageLabel}</span>
    </div>
    <div class="meta">
      <span title="Level">Lv {level}</span>
      <span class="coins" title="Coins">🪙 {game.coins}</span>
      <button class="adopt-btn" title="Adopt another Blobbi" onclick={startNewAdoption}>＋</button>
    </div>
  </header>

  {#if game.blobbis.length > 1}
    <div class="switcher">
      {#each game.blobbis as bb (bb.id)}
        <button class="swatch" class:active={bb.id === b.id} onclick={() => selectBlobbi(bb.id)} title={bb.name}>
          <PixelBlobbiMini stage={bb.lifeStage} emotion="neutral" sleeping={bb.state === 'sleeping'} traits={bb.traits} adultForm={bb.adultForm} size={26} animate={false} />
          <span class="sw-name">{bb.name}</span>
        </button>
      {/each}
    </div>
  {/if}

  <!-- Room stage -->
  <div class="stage" class:night={sleeping}>
    <div class="floor"></div>
    <div class="blobbi-anchor">
      <PixelBlobbi
        stage={b.lifeStage}
        emotion={currentEmotion()}
        {sleeping}
        traits={b.traits}
        adultForm={b.adultForm}
        size={180}
      />
    </div>
    <div class="mood">{sleeping ? 'sleeping' : EMOTION_LABEL[currentEmotion()]}</div>

    {#each game.poops as poop (poop.id)}
      <button
        class="poop"
        style="left:{poop.left}%;bottom:{poop.bottom}px;"
        title="Clean (+5 XP)"
        onclick={() => cleanPoop(poop.id)}
      >💩</button>
    {/each}
  </div>

  <!-- XP bar -->
  <div class="xp">
    <div class="xp-fill" style="width:{xpProgress(game.playerXp) * 100}%"></div>
  </div>

  <!-- Stats -->
  <div class="stats"><StatHud blobbi={b} /></div>

  <!-- Progression (incubating / evolving) -->
  {#if b.progressionState !== 'none'}
    <div class="prog">
      <div class="prog-head">
        <span>{b.progressionState === 'incubating' ? 'Incubation' : 'Evolution'}</span>
        {#if b.progressionState === 'incubating' && hatchReady()}
          <button class="mini primary" onclick={doHatch}>Hatch! 🐣</button>
        {:else if b.progressionState === 'evolving' && evolveReady()}
          <button class="mini primary" onclick={doEvolve}>Evolve! ✨</button>
        {/if}
      </div>
      {#each b.progressionMissions as m (m.id)}
        <div class="prog-row">
          <span class="prog-label">{m.label}</span>
          <span class="prog-val">{Math.min(m.current, m.target)}/{m.target}</span>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Tabs -->
  <nav class="tabs">
    <button class:active={tab === 'care'} onclick={() => (tab = 'care')}>Care</button>
    <button class:active={tab === 'shop'} onclick={() => (tab = 'shop')}>Shop</button>
    <button class:active={tab === 'missions'} onclick={() => (tab = 'missions')}>Missions</button>
  </nav>

  <div class="panel">
    {#if tab === 'care'}
      <div class="quick">
        {#if !isEgg}
          <button class="act" onclick={() => directAction('play_music')}>🎵 Music</button>
          <button class="act" onclick={() => directAction('sing')}>🎤 Sing</button>
          <button class="act" onclick={toggleSleep}>{sleeping ? '☀️ Wake' : '🌙 Sleep'}</button>
          <button class="act" onclick={takePhoto}>📸 Photo</button>
        {:else}
          <button class="act" onclick={() => directAction('play_music')}>🎵 Music</button>
          <button class="act" onclick={() => directAction('sing')}>🎤 Sing</button>
        {/if}
      </div>

      <div class="inv-title">Inventory</div>
      {#if ownedItems.length === 0}
        <p class="empty">No items yet. Visit the <button class="link" onclick={() => (tab = 'shop')}>Shop</button> to buy food, toys & medicine.</p>
      {:else}
        <div class="inv">
          {#each ownedItems as { item, qty } (item.id)}
            <button class="item" onclick={() => useItem(item.id)} title={item.name}>
              <span class="emoji">{item.icon}</span>
              <span class="qty">×{qty}</span>
              <span class="iname">{item.name}</span>
            </button>
          {/each}
        </div>
      {/if}
      {#if isEgg}
        <p class="note">Eggs can only be cleaned or given medicine — and they love music.</p>
      {/if}
    {:else if tab === 'shop'}
      <Shop />
    {:else}
      <Missions />
    {/if}
  </div>
</div>

<style>
  .game { flex: 1; display: flex; flex-direction: column; min-height: 0; }
  .bar { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--hg-border, #333b49); }
  .who { display: flex; align-items: baseline; gap: 8px; }
  .who strong { font-size: 15px; }
  .sub { font-size: 11px; color: var(--hg-text-muted, #8a93a3); }
  .meta { display: flex; gap: 12px; font-size: 12px; color: var(--hg-text-secondary, #b6bfce); align-items: center; }
  .coins { color: var(--hg-accent-warning, #d9a441); }
  .adopt-btn { font: inherit; cursor: pointer; width: 22px; height: 22px; line-height: 1; border-radius: 6px; border: 1px solid var(--hg-border, #333b49); background: var(--hg-bg-elevated, #232a37); color: var(--hg-text-primary, #eef2f7); }
  .adopt-btn:hover { opacity: 0.8; }

  .switcher { display: flex; gap: 6px; overflow-x: auto; padding: 8px 14px; border-bottom: 1px solid var(--hg-border, #333b49); }
  .swatch { display: flex; align-items: center; gap: 6px; flex: 0 0 auto; cursor: pointer; font: inherit; padding: 4px 8px 4px 4px; border-radius: 999px; border: 1px solid var(--hg-border, #333b49); background: var(--hg-bg-surface, #1c222e); color: var(--hg-text-secondary, #b6bfce); }
  .swatch.active { border-color: var(--hg-accent-primary, #7fb37a); color: var(--hg-text-primary, #eef2f7); }
  .swatch :global(canvas) { border-radius: 50%; }
  .sw-name { font-size: 11px; max-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .stage {
    position: relative;
    height: 220px;
    display: grid;
    place-items: center;
    overflow: hidden;
    background:
      radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--hg-accent-primary, #7fb37a) 10%, transparent), transparent 60%),
      var(--hg-bg-surface, #1c222e);
    transition: filter 0.4s;
  }
  .stage.night { filter: brightness(0.7) saturate(0.8); }
  .floor { position: absolute; bottom: 0; left: 0; right: 0; height: 28%; background: color-mix(in srgb, var(--hg-bg-elevated, #232a37) 70%, #000); }
  .blobbi-anchor { position: relative; z-index: 2; margin-bottom: 14px; }
  .mood { position: absolute; top: 8px; right: 12px; font-size: 11px; color: var(--hg-text-muted, #8a93a3); text-transform: lowercase; }
  .poop { position: absolute; z-index: 3; background: none; border: none; cursor: pointer; font-size: 18px; padding: 2px; line-height: 1; }
  .poop:hover { transform: scale(1.15); }

  .xp { height: 4px; background: var(--hg-bg-elevated, #232a37); }
  .xp-fill { height: 100%; background: var(--hg-accent-primary, #7fb37a); transition: width 0.4s; }

  .stats { padding: 12px 14px; }

  .prog { margin: 0 14px 10px; padding: 10px 12px; border: 1px solid var(--hg-border, #333b49); border-radius: 10px; background: var(--hg-bg-surface, #1c222e); }
  .prog-head { display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 600; margin-bottom: 6px; }
  .prog-row { display: flex; justify-content: space-between; font-size: 11px; color: var(--hg-text-secondary, #b6bfce); }
  .prog-val { font-variant-numeric: tabular-nums; color: var(--hg-text-muted, #8a93a3); }

  .tabs { display: flex; gap: 2px; padding: 0 14px; border-bottom: 1px solid var(--hg-border, #333b49); }
  .tabs button { flex: 1; background: none; border: none; border-bottom: 2px solid transparent; color: var(--hg-text-muted, #8a93a3); padding: 8px; font: inherit; cursor: pointer; font-size: 13px; }
  .tabs button.active { color: var(--hg-text-primary, #eef2f7); border-bottom-color: var(--hg-accent-primary, #7fb37a); }

  .panel { flex: 1; overflow-y: auto; padding: 12px 14px; min-height: 0; }
  .quick { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
  .act, .item, .mini { font: inherit; cursor: pointer; border-radius: 8px; border: 1px solid var(--hg-border, #333b49); background: var(--hg-bg-elevated, #232a37); color: var(--hg-text-primary, #eef2f7); transition: opacity 0.15s, transform 0.1s; }
  .act { padding: 8px 12px; font-size: 13px; }
  .act:hover, .item:hover { opacity: 0.85; }
  .act:active, .item:active { transform: translateY(1px); }
  .mini { padding: 3px 10px; font-size: 11px; }
  .mini.primary { background: var(--hg-accent-primary, #7fb37a); color: var(--hg-bg-base, #151923); border-color: transparent; font-weight: 600; }

  .inv-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--hg-text-muted, #8a93a3); margin-bottom: 8px; }
  .inv { display: grid; grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); gap: 8px; }
  .item { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; }
  .emoji { font-size: 22px; }
  .qty { font-size: 10px; color: var(--hg-text-muted, #8a93a3); }
  .iname { font-size: 10px; color: var(--hg-text-secondary, #b6bfce); }
  .empty, .note { font-size: 12px; color: var(--hg-text-muted, #8a93a3); }
  .note { margin-top: 10px; }
  .link { background: none; border: none; color: var(--hg-accent-primary, #7fb37a); cursor: pointer; font: inherit; padding: 0; text-decoration: underline; }
</style>
