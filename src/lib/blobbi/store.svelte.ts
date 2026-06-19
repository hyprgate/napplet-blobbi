// Reactive game store: a collection of Blobbis (Ditto supports owning more than
// one), persistence (shell-mediated storage), import of existing Blobbis from
// Nostr (kind 31124 + 11125 profile), the tick loop (decay, poop, daily reset),
// the coin economy, shared inventory, and onboarding. Svelte 5 runes module.

import { storage } from '@napplet/sdk';
import { refreshDecay } from './actions.js';
import { type BlobbiEmotion, resolveStatusEmotion } from './emotions.js';
import { refreshProgressionMissions } from './lifecycle.js';
import {
  type DailyMission,
  missionComplete,
  selectDailyMissions,
  totalDailyXp,
  triggersForAction,
} from './missions.js';
import { importFromNostr } from './nostr-import.js';
import { getLocalDayString } from './streak.js';
import type { Blobbi, BlobbiLifeStage } from './types.js';

// User-driven actions live in ./store-actions; re-exported so existing import
// paths (components importing from store.svelte.js) stay stable.
export {
  adoptPreview,
  buyItem,
  cancelAdoption,
  directAction,
  doEvolve,
  doHatch,
  evolveReady,
  hatchReady,
  rerollMission,
  rerollPreview,
  renamePreview,
  resetGame,
  startNewAdoption,
  startProfile,
  takePhoto,
  toggleSleep,
  useItem,
} from './store-actions.svelte.js';

const STORAGE_KEY = 'hyprgate-blobbi-save-v2';
const SAVE_VERSION = 2;

export const INITIAL_COINS = 200;
export const ADOPTION_COST = 100;
export const REROLL_COST = 10;
export const CARE_COIN_REWARD = 2;
const TICK_MS = 5000;
const OVERRIDE_MS = 1500;
const MAX_POOPS = 3;
export const OVERFEED_THRESHOLD = 95;
const IMPORT_TIMEOUT_MS = 4000;

export interface PoopInstance { id: string; left: number; bottom: number }

interface DailyState {
  day: string;
  stage: BlobbiLifeStage;
  missions: DailyMission[];
  rerolls: number;
  awarded: boolean;
}

export interface GameState {
  version: number;
  hasProfile: boolean;
  onboarding: 'intro' | 'preview' | 'done';
  coins: number;
  playerXp: number;
  blobbis: Blobbi[];
  currentId: string | null;
  preview: Blobbi | null;
  inventory: Record<string, number>;
  daily: DailyState | null;
  poops: PoopInstance[];
  photos: number;
  importedFromNostr: boolean;
}

export function freshState(): GameState {
  return {
    version: SAVE_VERSION,
    hasProfile: false,
    onboarding: 'intro',
    coins: INITIAL_COINS,
    playerXp: 0,
    blobbis: [],
    currentId: null,
    preview: null,
    inventory: {},
    daily: null,
    poops: [],
    photos: 0,
    importedFromNostr: false,
  };
}

export const game = $state<GameState>(freshState());
export const ui = $state<{ override: { emotion: BlobbiEmotion; until: number } | null; toast: string | null; importing: boolean }>(
  { override: null, toast: null, importing: false },
);

let loaded = false;
let tickHandle: ReturnType<typeof setInterval> | null = null;

export function currentBlobbi(): Blobbi | null {
  if (!game.currentId) return null;
  return game.blobbis.find((b) => b.id === game.currentId) ?? null;
}

export function setCurrent(next: Blobbi): void {
  const idx = game.blobbis.findIndex((b) => b.id === next.id);
  if (idx >= 0) game.blobbis[idx] = next;
  else game.blobbis.push(next);
}

export function selectBlobbi(id: string): void {
  if (game.blobbis.some((b) => b.id === id)) {
    game.currentId = id;
    ui.override = null;
    ensureDaily();
    persist();
  }
}

export function persist(): void {
  if (!loaded) return;
  void storage.setItem(STORAGE_KEY, JSON.stringify($state.snapshot(game))).catch(() => {});
}

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
}

export async function loadGame(): Promise<void> {
  try {
    const raw = await withTimeout(storage.getItem(STORAGE_KEY), 1500, null);
    if (raw) {
      const parsed = JSON.parse(raw) as GameState;
      if (parsed && parsed.version === SAVE_VERSION) Object.assign(game, parsed);
    }
  } catch {
    /* corrupt save → fresh */
  }
  loaded = true;

  // Start the local game immediately; never block startup on the network.
  applyTick();
  ensureDaily();
  if (!tickHandle) tickHandle = setInterval(applyTick, TICK_MS);

  // Detect & import existing Blobbis from Nostr in the background — when it
  // resolves, the reactive UI swaps onboarding for the imported Blobbi(s).
  void importExisting();
}

/** Query Nostr for the user's Blobbis + profile and merge them in. Never throws. */
export async function importExisting(): Promise<void> {
  ui.importing = true;
  try {
    const result = await withTimeout(importFromNostr(), IMPORT_TIMEOUT_MS, { blobbis: [], profile: null });

    for (const nb of result.blobbis) {
      const idx = game.blobbis.findIndex((b) => b.id === nb.id);
      if (idx === -1) game.blobbis.push(nb);
      else if ((nb.lastInteraction ?? 0) > (game.blobbis[idx]!.lastInteraction ?? 0)) game.blobbis[idx] = nb;
    }

    // Adopt the player's profile economy only on a fresh local game.
    if (result.profile && !game.hasProfile) {
      game.coins = result.profile.coins;
      game.playerXp = result.profile.xp;
      game.inventory = { ...result.profile.inventory };
    }

    if (game.blobbis.length > 0) {
      game.hasProfile = true;
      game.onboarding = 'done';
      game.importedFromNostr = game.importedFromNostr || result.blobbis.length > 0;
      if (!game.currentId || !game.blobbis.some((b) => b.id === game.currentId)) {
        const cc = result.profile?.currentCompanion;
        game.currentId = cc && game.blobbis.some((b) => b.id === cc) ? cc : game.blobbis[0]!.id;
      }
    }
    if (result.blobbis.length > 0) toast(`Found ${result.blobbis.length} Blobbi${result.blobbis.length > 1 ? 's' : ''} on Nostr`);
  } catch (err) {
    console.warn('[blobbi] Nostr import failed:', err);
  } finally {
    ui.importing = false;
    persist();
  }
}

export function stopGame(): void {
  if (tickHandle) { clearInterval(tickHandle); tickHandle = null; }
}

export function ensureDaily(): void {
  const b = currentBlobbi();
  if (!b) return;
  const today = getLocalDayString();
  if (!game.daily || game.daily.day !== today || game.daily.stage !== b.lifeStage) {
    game.daily = {
      day: today,
      stage: b.lifeStage,
      missions: selectDailyMissions(today, b.lifeStage),
      rerolls: 3,
      awarded: false,
    };
    persist();
  }
}

export function bumpMissions(action: string): void {
  if (!game.daily) return;
  const triggers = triggersForAction(action);
  let changed = false;
  for (const m of game.daily.missions) {
    if (triggers.includes(m.trigger) && m.current < m.target) { m.current += 1; changed = true; }
  }
  if (changed) autoAwardDaily();
}

function autoAwardDaily(): void {
  if (!game.daily || game.daily.awarded) return;
  if (game.daily.missions.length > 0 && game.daily.missions.every(missionComplete)) {
    const reward = totalDailyXp(game.daily.missions);
    game.playerXp += reward;
    game.coins += reward;
    game.daily.awarded = true;
    toast(`All daily missions done! +${reward} XP & coins`);
  }
}

function applyTick(): void {
  const b = currentBlobbi();
  if (b) {
    let next = refreshDecay(b);
    next = refreshProgressionMissions(next);
    setCurrent(next);
    maybeSpawnPoop();
  }
  ensureDaily();
  if (ui.override && ui.override.until < Date.now()) ui.override = null;
  persist();
}

function maybeSpawnPoop(): void {
  const b = currentBlobbi();
  if (!b || b.lifeStage === 'egg' || b.state === 'sleeping') return;
  if (game.poops.length >= MAX_POOPS) return;
  if (Math.random() < 0.04) addPoop();
}

export function addPoop(): void {
  if (game.poops.length >= MAX_POOPS) return;
  game.poops.push({ id: `poop-${Date.now()}-${game.poops.length}`, left: 18 + Math.floor(Math.random() * 64), bottom: 4 + Math.floor(Math.random() * 16) });
}

export function cleanPoop(id: string): void {
  const before = game.poops.length;
  game.poops = game.poops.filter((p) => p.id !== id);
  const b = currentBlobbi();
  if (game.poops.length < before && b) {
    setCurrent({ ...b, experience: b.experience + 5 });
    game.playerXp += 5;
    game.coins += 1;
    persist();
  }
}

export function currentEmotion(): BlobbiEmotion {
  if (ui.override && ui.override.until >= Date.now()) return ui.override.emotion;
  const b = currentBlobbi();
  if (!b || b.lifeStage === 'egg') return 'neutral';
  return resolveStatusEmotion(b.stats, b.state === 'sleeping');
}

export function setOverride(emotion: BlobbiEmotion): void {
  ui.override = { emotion, until: Date.now() + OVERRIDE_MS };
}

let toastHandle: ReturnType<typeof setTimeout> | null = null;
export function toast(msg: string): void {
  ui.toast = msg;
  if (toastHandle) clearTimeout(toastHandle);
  toastHandle = setTimeout(() => { ui.toast = null; }, 2600);
}

