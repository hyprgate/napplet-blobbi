// Shop item catalog — verbatim from Ditto's shop/lib/blobbi-shop-items.ts.
// Effects are stat deltas applied then clamped to [1,100].

import type { BlobbiStats } from './types.js';

export type ShopCategory = 'food' | 'toy' | 'medicine' | 'hygiene' | 'energy';

/** The care action an item performs. */
export type CareAction = 'feed' | 'play' | 'clean' | 'medicine' | 'boost';

export const CATEGORY_ACTION: Record<ShopCategory, CareAction> = {
  food: 'feed',
  toy: 'play',
  medicine: 'medicine',
  hygiene: 'clean',
  energy: 'boost',
};

export interface ShopItem {
  id: string;
  name: string;
  category: ShopCategory;
  price: number;
  icon: string;
  effect: Partial<BlobbiStats>;
  eggOnly?: boolean;
}

export const SHOP_ITEMS: ShopItem[] = [
  // Food (feed) — raises hunger, lowers hygiene
  { id: 'food_apple', name: 'Apple', category: 'food', price: 10, icon: '🍎', effect: { hunger: 25, hygiene: -2, energy: 5 } },
  { id: 'food_burger', name: 'Burger', category: 'food', price: 25, icon: '🍔', effect: { hunger: 45, happiness: 10, hygiene: -8, energy: 8 } },
  { id: 'food_cake', name: 'Cake', category: 'food', price: 50, icon: '🎂', effect: { hunger: 25, happiness: 30, hygiene: -10, energy: 10 } },
  { id: 'food_pizza', name: 'Pizza', category: 'food', price: 35, icon: '🍕', effect: { hunger: 40, happiness: 15, hygiene: -9, energy: 10 } },
  { id: 'food_sushi', name: 'Sushi', category: 'food', price: 45, icon: '🍣', effect: { hunger: 35, health: 10, hygiene: -5, energy: 7 } },
  // Toys (play) — raise happiness, cost energy
  { id: 'toy_ball', name: 'Ball', category: 'toy', price: 30, icon: '⚽', effect: { happiness: 25, energy: -10, hygiene: -5 } },
  { id: 'toy_teddy', name: 'Teddy Bear', category: 'toy', price: 60, icon: '🧸', effect: { happiness: 45, energy: -5 } },
  { id: 'toy_blocks', name: 'Building Blocks', category: 'toy', price: 40, icon: '🧱', effect: { happiness: 30, energy: -10 } },
  // Medicine
  { id: 'med_vitamins', name: 'Vitamins', category: 'medicine', price: 40, icon: '💊', effect: { health: 25, energy: 5 } },
  { id: 'med_super', name: 'Super Medicine', category: 'medicine', price: 100, icon: '💉', effect: { health: 50, energy: 20, happiness: -10 } },
  { id: 'med_bandage', name: 'Bandage', category: 'medicine', price: 20, icon: '🩹', effect: { health: 25 } },
  { id: 'med_elixir', name: 'Health Elixir', category: 'medicine', price: 150, icon: '🧪', effect: { health: 75, happiness: 20, energy: 10 } },
  { id: 'med_shell_repair', name: 'Shell Repair Kit', category: 'medicine', price: 60, icon: '🥚', effect: { health: 30 }, eggOnly: true },
  { id: 'med_calcium', name: 'Calcium Supplement', category: 'medicine', price: 35, icon: '🦴', effect: { health: 35 } },
  // Hygiene (clean)
  { id: 'hyg_soap', name: 'Soap', category: 'hygiene', price: 15, icon: '🧼', effect: { hygiene: 25 } },
  { id: 'hyg_shampoo', name: 'Shampoo', category: 'hygiene', price: 25, icon: '🧴', effect: { hygiene: 50, happiness: 10 } },
  { id: 'hyg_bubble', name: 'Bubble Bath', category: 'hygiene', price: 40, icon: '🛁', effect: { hygiene: 70, happiness: 25 } },
  { id: 'hyg_towel', name: 'Soft Towel', category: 'hygiene', price: 20, icon: '🏖️', effect: { hygiene: 25, happiness: 5 } },
  // Energy (boost)
  { id: 'nrg_drink', name: 'Energy Drink', category: 'energy', price: 30, icon: '🧃', effect: { energy: 35, happiness: 5 } },
];

export const SHOP_BY_ID: Record<string, ShopItem> = Object.fromEntries(
  SHOP_ITEMS.map((i) => [i.id, i]),
);

export function shopItem(id: string): ShopItem | undefined {
  return SHOP_BY_ID[id];
}

/** XP awarded per care action (INVENTORY_ACTION_XP / DIRECT_ACTION_XP). */
export const ACTION_XP: Record<string, number> = {
  feed: 5, play: 8, clean: 6, medicine: 10, boost: 7, play_music: 7, sing: 9,
};

export const POOP_CLEANUP_XP = 5;

/** Direct action happiness effects (no item). */
export const DIRECT_ACTION_HAPPINESS: Record<string, number> = {
  play_music: 15,
  sing: 20,
};

export const ITEM_COOLDOWN_SUCCESS_MS = 400;
export const ITEM_COOLDOWN_FAILURE_MS = 2000;
