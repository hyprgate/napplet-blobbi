// Coin rules for adoption, kept apart from the store so they can be tested on their own.

import { STAT_KEYS, type StatKey } from './types.js';

export const ADOPTION_COST = 100;
export const REROLL_COST = 10;

/**
 * Rerolling must leave enough to adopt. Coins are earned by caring for a Blobbi, so someone
 * with no Blobbi who spends below the adoption cost could never get one.
 */
export function canReroll(coins: number): boolean {
  return coins - REROLL_COST >= ADOPTION_COST;
}

/** The first Blobbi is always adoptable, which also rescues saves already stuck below the cost. */
export function canAdopt(coins: number, ownedCount: number): boolean {
  return coins >= ADOPTION_COST || ownedCount === 0;
}

export function adoptionPrice(coins: number, ownedCount: number): number {
  return ownedCount === 0 ? Math.min(coins, ADOPTION_COST) : ADOPTION_COST;
}

export const STAT_LABEL: Record<StatKey, string> = {
  hunger: 'Hunger',
  happiness: 'Happiness',
  health: 'Health',
  hygiene: 'Hygiene',
  energy: 'Energy',
};

export const STAT_ICON: Record<StatKey, string> = {
  hunger: '🍖',
  happiness: '😊',
  health: '❤️',
  hygiene: '🫧',
  energy: '⚡',
};

export interface EffectChip {
  key: StatKey;
  icon: string;
  value: string;
  description: string;
  positive: boolean;
}

/** Shop effects with the real stat names, in a steady order, without zero rows. */
export function effectChips(effect: Partial<Record<StatKey, number>>): EffectChip[] {
  return STAT_KEYS.flatMap((key) => {
    const amount = effect[key];
    if (!amount) return [];
    const value = `${amount > 0 ? '+' : '−'}${Math.abs(amount)}`;
    return [{ key, icon: STAT_ICON[key], value, description: `${STAT_LABEL[key]} ${value}`, positive: amount > 0 }];
  });
}
