<script lang="ts">
  import { buyItem, currentBlobbi, game } from '../lib/blobbi/store.svelte.js';
  import { effectChips } from '../lib/blobbi/economy.js';
  import { SHOP_ITEMS, type ShopCategory } from '../lib/blobbi/shop.js';

  const CATEGORIES: { id: ShopCategory; label: string }[] = [
    { id: 'food', label: 'Food' },
    { id: 'toy', label: 'Toys' },
    { id: 'hygiene', label: 'Hygiene' },
    { id: 'medicine', label: 'Medicine' },
    { id: 'energy', label: 'Energy' },
  ];

  // Eggs can only be cleaned or given medicine, so lead with what's useful right now.
  const isEgg = $derived(currentBlobbi()?.lifeStage === 'egg');
  const ordered = $derived(
    isEgg
      ? [...CATEGORIES].sort((a, b) => Number(eggUsable(b.id)) - Number(eggUsable(a.id)))
      : CATEGORIES,
  );

  function eggUsable(category: ShopCategory): boolean {
    return category === 'hygiene' || category === 'medicine';
  }
</script>

<div class="shop">
  <div class="bal">Coins: <strong>🪙 {game.coins}</strong></div>
  {#each ordered as cat (cat.id)}
    <h3 class="cat">{cat.label}{#if isEgg && !eggUsable(cat.id)}<span class="later"> · once it hatches</span>{/if}</h3>
    <div class="grid">
      {#each SHOP_ITEMS.filter((i) => i.category === cat.id) as item (item.id)}
        <div class="card">
          <div class="top">
            <span class="emoji" aria-hidden="true">{item.icon}</span>
            <span class="price" class:poor={game.coins < item.price}>🪙{item.price}</span>
          </div>
          <div class="name">{item.name}</div>
          <ul class="eff">
            {#each effectChips(item.effect) as chip (chip.key)}
              <li class:down={!chip.positive} title={chip.description} aria-label={chip.description}>
                <span aria-hidden="true">{chip.icon} {chip.value}</span>
              </li>
            {/each}
          </ul>
          <button onclick={() => buyItem(item.id)} disabled={game.coins < item.price} aria-label={`Buy ${item.name}`}>Buy</button>
        </div>
      {/each}
    </div>
  {/each}
</div>

<style>
  .bal { font-size: 12px; color: var(--hg-text-secondary, #b6bfce); padding: 4px 0 8px; position: sticky; top: -12px; z-index: 1; background: var(--hg-bg-base, #151923); }
  .cat { font: inherit; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--hg-text-muted, #8a93a3); margin: 12px 0 6px; }
  .later { text-transform: none; letter-spacing: 0; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
  .card { border: 1px solid var(--hg-border, #333b49); border-radius: 10px; padding: 8px; background: var(--hg-bg-surface, #1c222e); display: flex; flex-direction: column; gap: 4px; }
  .top { display: flex; justify-content: space-between; align-items: center; }
  .emoji { font-size: 22px; }
  .price { font-size: 11px; color: var(--hg-accent-warning, #d9a441); }
  .price.poor { color: var(--hg-text-muted, #8a93a3); }
  .name { font-size: 12px; }
  .eff { display: flex; flex-wrap: wrap; gap: 2px 8px; flex: 1; margin: 0; padding: 0; list-style: none; font-size: 11px; color: var(--hg-text-secondary, #b6bfce); }
  .eff .down { color: var(--hg-text-muted, #8a93a3); }
  button { font: inherit; cursor: pointer; border-radius: 7px; border: 1px solid transparent; background: var(--hg-accent-primary, #7fb37a); color: var(--hg-bg-base, #151923); padding: 5px; font-size: 12px; font-weight: 600; }
  button:disabled { opacity: 0.35; cursor: not-allowed; background: var(--hg-bg-elevated, #232a37); color: var(--hg-text-muted, #8a93a3); }
</style>
