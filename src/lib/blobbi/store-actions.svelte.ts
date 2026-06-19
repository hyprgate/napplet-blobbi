// User-driven Blobbi actions (care, items, adoption, lifecycle transitions),
// split out of store.svelte.ts to keep that file focused on state + the tick
// loop. Operates on the shared `game`/`ui` runes imported from the store.

import { applyDirectAction, applyItemAction, setSleeping } from './actions.js';
import type { BlobbiEmotion } from './emotions.js';
import { canEvolve, canHatch, createEgg, evolveToAdult, hatchToBaby, refreshProgressionMissions } from './lifecycle.js';
import { missionComplete, selectReplacementMission } from './missions.js';
import { shopItem } from './shop.js';
import {
  ADOPTION_COST,
  CARE_COIN_REWARD,
  OVERFEED_THRESHOLD,
  REROLL_COST,
  addPoop,
  bumpMissions,
  currentBlobbi,
  ensureDaily,
  freshState,
  game,
  persist,
  setCurrent,
  setOverride,
  toast,
  ui,
} from './store.svelte.js';

export function rerollMission(id: string): void {
  const b = currentBlobbi();
  if (!game.daily || !b || game.daily.rerolls <= 0) return;
  const idx = game.daily.missions.findIndex((m) => m.id === id);
  if (idx < 0 || missionComplete(game.daily.missions[idx]!)) return;
  const next = selectReplacementMission(game.daily.missions.map((m) => m.id), b.lifeStage);
  if (!next) return;
  game.daily.missions[idx] = next;
  game.daily.rerolls -= 1;
  persist();
}

export function startProfile(): void {
  game.hasProfile = true;
  game.onboarding = 'preview';
  game.preview = createEgg({ name: 'Blobbi' });
  persist();
}

/** Begin adopting an additional egg (player already has Blobbis). */
export function startNewAdoption(): void {
  game.onboarding = 'preview';
  game.preview = createEgg({ name: 'Blobbi' });
  persist();
}

export function cancelAdoption(): void {
  game.preview = null;
  game.onboarding = game.blobbis.length > 0 ? 'done' : 'intro';
  persist();
}

export function rerollPreview(): void {
  if (game.coins < REROLL_COST) { toast('Not enough coins to reroll'); return; }
  const name = game.preview?.name ?? 'Blobbi';
  game.coins -= REROLL_COST;
  game.preview = createEgg({ name });
  persist();
}

export function renamePreview(name: string): void {
  if (game.preview) game.preview.name = name.slice(0, 24) || 'Blobbi';
  persist();
}

export function adoptPreview(): void {
  if (!game.preview) return;
  if (game.coins < ADOPTION_COST) { toast('Not enough coins to adopt'); return; }
  game.coins -= ADOPTION_COST;
  game.blobbis.push(game.preview);
  game.currentId = game.preview.id;
  game.preview = null;
  game.onboarding = 'done';
  ensureDaily();
  const cur = currentBlobbi();
  toast(`You adopted ${cur?.name ?? 'a'}'s egg!`);
  persist();
}

function afterAction(action: string, emotion: BlobbiEmotion): void {
  game.coins += CARE_COIN_REWARD;
  bumpMissions(action);
  setOverride(emotion);
  const b = currentBlobbi();
  if (action === 'feed' && b && b.stats.hunger >= OVERFEED_THRESHOLD && Math.random() < 0.4) addPoop();
  persist();
}

export function useItem(itemId: string): void {
  const b = currentBlobbi();
  if (!b) return;
  if ((game.inventory[itemId] ?? 0) <= 0) { toast('You have none of that item'); return; }
  const item = shopItem(itemId);
  if (!item) return;
  const result = applyItemAction(b, itemId);
  if (result.error) { toast(result.error); return; }
  game.inventory[itemId] = (game.inventory[itemId] ?? 0) - 1;
  setCurrent(result.blobbi);
  game.playerXp += result.xp;
  const emotion: BlobbiEmotion =
    item.category === 'food' ? 'blissful'
    : item.category === 'toy' ? 'excited'
    : item.category === 'hygiene' ? 'surprised'
    : item.category === 'medicine' ? 'adoring' : 'happy';
  const action =
    item.category === 'food' ? 'feed'
    : item.category === 'toy' ? 'play'
    : item.category === 'hygiene' ? 'clean'
    : item.category === 'medicine' ? 'medicine' : 'boost';
  afterAction(action, emotion);
}

export function directAction(action: 'play_music' | 'sing'): void {
  const b = currentBlobbi();
  if (!b) return;
  const result = applyDirectAction(b, action);
  setCurrent(result.blobbi);
  game.playerXp += result.xp;
  afterAction(action, action === 'sing' ? 'excited' : 'happy');
}

export function toggleSleep(): void {
  const b = currentBlobbi();
  if (!b || b.lifeStage === 'egg') return;
  const sleeping = b.state === 'sleeping';
  setCurrent(setSleeping(b, !sleeping));
  if (!sleeping) bumpMissions('sleep');
  persist();
}

export function takePhoto(): void {
  if (!currentBlobbi()) return;
  game.photos += 1;
  bumpMissions('photo');
  setOverride('surprised');
  toast('📸 Snap!');
  persist();
}

export function buyItem(itemId: string, qty = 1): void {
  const item = shopItem(itemId);
  if (!item) return;
  const cost = item.price * qty;
  if (game.coins < cost) { toast('Not enough coins'); return; }
  game.coins -= cost;
  game.inventory[itemId] = (game.inventory[itemId] ?? 0) + qty;
  toast(`Bought ${item.name}`);
  persist();
}

export function hatchReady(): boolean {
  const b = currentBlobbi();
  return !!b && canHatch(b);
}

export function evolveReady(): boolean {
  const b = currentBlobbi();
  return !!b && canEvolve(refreshProgressionMissions(b));
}

export function doHatch(): void {
  const b = currentBlobbi();
  if (!b || !canHatch(b)) return;
  setCurrent(hatchToBaby(b));
  game.daily = null;
  ensureDaily();
  toast('Your egg hatched into a baby Blobbi! 🐣');
  persist();
}

export function doEvolve(): void {
  const b = currentBlobbi();
  if (!b) return;
  const refreshed = refreshProgressionMissions(b);
  if (!canEvolve(refreshed)) return;
  const adult = evolveToAdult(refreshed);
  setCurrent(adult);
  game.daily = null;
  ensureDaily();
  toast(`Your Blobbi evolved into ${adult.adultForm}! ✨`);
  persist();
}

export function resetGame(): void {
  Object.assign(game, freshState());
  ui.override = null;
  persist();
}
