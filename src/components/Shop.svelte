<script lang="ts">
  import { buyItem, game } from '../lib/blobbi/store.svelte.js';
  import { SHOP_ITEMS, type ShopCategory } from '../lib/blobbi/shop.js';

  const CATEGORIES: { id: ShopCategory; label: string }[] = [
    { id: 'food', label: 'Food' },
    { id: 'toy', label: 'Toys' },
    { id: 'hygiene', label: 'Hygiene' },
    { id: 'medicine', label: 'Medicine' },
    { id: 'energy', label: 'Energy' },
  ];

  function effectText(effect: Record<string, number | undefined>): string {
    return Object.entries(effect)
      .map(([k, v]) => `${(v as number) > 0 ? '+' : ''}${v} ${k.slice(0, 3)}`)
      .join('  ');
  }
</script>

<div class="shop">
  <div class="bal">Coins: <strong>🪙 {game.coins}</strong></div>
  {#each CATEGORIES as cat (cat.id)}
    <div class="cat">{cat.label}</div>
    <div class="grid">
      {#each SHOP_ITEMS.filter((i) => i.category === cat.id) as item (item.id)}
        <div class="card">
          <div class="top">
            <span class="emoji">{item.icon}</span>
            <span class="price" class:poor={game.coins < item.price}>🪙{item.price}</span>
          </div>
          <div class="name">{item.name}</div>
          <div class="eff">{effectText(item.effect)}</div>
          <button onclick={() => buyItem(item.id)} disabled={game.coins < item.price}>Buy</button>
        </div>
      {/each}
    </div>
  {/each}
</div>

<style>
  .bal { font-size: 12px; color: var(--hg-text-secondary, #b6bfce); margin-bottom: 8px; position: sticky; top: 0; }
  .cat { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--hg-text-muted, #8a93a3); margin: 12px 0 6px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; }
  .card { border: 1px solid var(--hg-border, #333b49); border-radius: 10px; padding: 8px; background: var(--hg-bg-surface, #1c222e); display: flex; flex-direction: column; gap: 4px; }
  .top { display: flex; justify-content: space-between; align-items: center; }
  .emoji { font-size: 22px; }
  .price { font-size: 11px; color: var(--hg-accent-warning, #d9a441); }
  .price.poor { color: var(--hg-text-muted, #8a93a3); }
  .name { font-size: 12px; }
  .eff { font-size: 10px; color: var(--hg-text-muted, #8a93a3); min-height: 12px; }
  button { font: inherit; cursor: pointer; border-radius: 7px; border: 1px solid transparent; background: var(--hg-accent-primary, #7fb37a); color: var(--hg-bg-base, #151923); padding: 5px; font-size: 12px; font-weight: 600; }
  button:disabled { opacity: 0.35; cursor: not-allowed; background: var(--hg-bg-elevated, #232a37); color: var(--hg-text-muted, #8a93a3); }
</style>
