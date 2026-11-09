import { describe, expect, it } from 'vitest';
import { ADOPTION_COST, REROLL_COST, adoptionPrice, canAdopt, canReroll, effectChips } from './economy.js';

describe('adoption economy', () => {
  it('stops rerolling before it would make adoption impossible', () => {
    expect(canReroll(ADOPTION_COST + REROLL_COST)).toBe(true);
    expect(canReroll(ADOPTION_COST + REROLL_COST - 1)).toBe(false);
    expect(canReroll(ADOPTION_COST)).toBe(false);
  });

  it('never leaves someone without a Blobbi unable to adopt', () => {
    expect(canAdopt(0, 0)).toBe(true);
    expect(adoptionPrice(90, 0)).toBe(90);
    expect(adoptionPrice(200, 0)).toBe(ADOPTION_COST);
  });

  it('charges full price for another Blobbi', () => {
    expect(canAdopt(ADOPTION_COST - 1, 1)).toBe(false);
    expect(canAdopt(ADOPTION_COST, 1)).toBe(true);
    expect(adoptionPrice(150, 1)).toBe(ADOPTION_COST);
  });
});

describe('effectChips', () => {
  it('names stats in words and signs each value', () => {
    expect(effectChips({ hunger: 25, hygiene: -2 }).map((chip) => chip.description)).toEqual(['Hunger +25', 'Hygiene −2']);
  });

  it('drops empty effects and marks what hurts', () => {
    const chips = effectChips({ hunger: 0, energy: -8 });
    expect(chips).toHaveLength(1);
    expect(chips[0]).toMatchObject({ key: 'energy', positive: false });
  });
});
