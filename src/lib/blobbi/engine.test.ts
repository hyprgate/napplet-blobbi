import { describe, expect, it } from 'vitest';
import { applyBlobbiDecay } from './decay.js';
import { xpToLevel, xpProgress, xpToNextLevel } from './progression.js';
import { calculateStreakUpdate } from './streak.js';
import { resolveStatusEmotion, getSeverity } from './emotions.js';
import { statSegments } from './segments.js';
import { applyItemAction, applyDirectAction, setSleeping } from './actions.js';
import { createEgg, hatchToBaby, evolveToAdult, canHatch, canEvolve } from './lifecycle.js';
import { deriveTraits, deriveAdultForm } from './seed.js';
import { ADULT_FORMS } from './forms.js';
import { parseBlobbiEvent } from './nostr-import.js';
import { DEFAULT_BLOBBI_STATS, type Blobbi } from './types.js';

const HOUR = 3600;

describe('decay', () => {
  it('eggs do not decay and pin hunger/energy to 100', () => {
    const out = applyBlobbiDecay({
      stage: 'egg', state: 'active',
      stats: { hunger: 40, energy: 30, hygiene: 50, health: 60, happiness: 70 },
      lastDecayAt: 0, now: 10 * HOUR,
    });
    expect(out.hunger).toBe(100);
    expect(out.energy).toBe(100);
    expect(out.hygiene).toBe(50);
  });

  it('applies baby awake rates over one hour', () => {
    const out = applyBlobbiDecay({
      stage: 'baby', state: 'active', stats: { ...DEFAULT_BLOBBI_STATS }, lastDecayAt: 0, now: HOUR,
    });
    expect(out.hunger).toBe(92); // -8
    expect(out.happiness).toBe(96); // -4.5 -> trunc 4
    expect(out.hygiene).toBe(94); // -6
    expect(out.energy).toBe(91); // -9
  });

  it('applies adult awake rates over one hour', () => {
    const out = applyBlobbiDecay({
      stage: 'adult', state: 'active', stats: { ...DEFAULT_BLOBBI_STATS }, lastDecayAt: 0, now: HOUR,
    });
    expect(out.hunger).toBe(95); // -5
    expect(out.energy).toBe(95); // -5.5 -> trunc 5 -> wait
  });

  it('regenerates energy while sleeping (baby +40/hr)', () => {
    const out = applyBlobbiDecay({
      stage: 'baby', state: 'sleeping', stats: { ...DEFAULT_BLOBBI_STATS, energy: 20 }, lastDecayAt: 0, now: HOUR,
    });
    expect(out.energy).toBe(60); // 20 + 40
  });

  it('no decay when elapsed is zero', () => {
    const stats = { ...DEFAULT_BLOBBI_STATS, hunger: 55 };
    const out = applyBlobbiDecay({ stage: 'adult', state: 'active', stats, lastDecayAt: 100, now: 100 });
    expect(out.hunger).toBe(55);
  });
});

describe('progression', () => {
  it('maps cumulative xp to level', () => {
    expect(xpToLevel(0)).toBe(1);
    expect(xpToLevel(99)).toBe(1);
    expect(xpToLevel(100)).toBe(2);
    expect(xpToLevel(39200)).toBe(20);
    expect(xpToLevel(99999)).toBe(20); // capped
  });
  it('progress and to-next', () => {
    expect(xpProgress(0)).toBe(0);
    expect(xpToNextLevel(0)).toBe(100);
    expect(xpProgress(39200)).toBe(1);
  });
});

describe('streak', () => {
  it('initializes then increments next day', () => {
    const d0 = new Date('2026-06-14T10:00:00').getTime();
    const init = calculateStreakUpdate(undefined, undefined, d0);
    expect(init.streak).toBe(1);
    const sameDay = calculateStreakUpdate(init.streak, init.lastDay, new Date('2026-06-14T20:00:00').getTime());
    expect(sameDay.streak).toBe(1);
    const next = calculateStreakUpdate(init.streak, init.lastDay, new Date('2026-06-15T09:00:00').getTime());
    expect(next.streak).toBe(2);
    const missed = calculateStreakUpdate(next.streak, next.lastDay, new Date('2026-06-18T09:00:00').getTime());
    expect(missed.streak).toBe(1); // reset
  });
});

describe('emotions', () => {
  it('severity thresholds', () => {
    expect(getSeverity(29)).toBe('critical');
    expect(getSeverity(49)).toBe('high');
    expect(getSeverity(69)).toBe('warning');
    expect(getSeverity(70)).toBe('normal');
  });
  it('resolves dominant emotion from low stats', () => {
    expect(resolveStatusEmotion({ ...DEFAULT_BLOBBI_STATS, hunger: 10 }, false)).toBe('hungry');
    expect(resolveStatusEmotion({ ...DEFAULT_BLOBBI_STATS, health: 10 }, false)).toBe('dizzy');
    expect(resolveStatusEmotion(DEFAULT_BLOBBI_STATS, false)).toBe('happy');
    expect(resolveStatusEmotion(DEFAULT_BLOBBI_STATS, true)).toBe('sleepy');
  });
});

describe('segments', () => {
  it('adult uses 10 segments with thresholds', () => {
    expect(statSegments('adult', 100).total).toBe(10);
    expect(statSegments('adult', 25).careState).toBe('urgent');
    expect(statSegments('baby', 25).careState).toBe('urgent');
    expect(statSegments('egg', 50).careState).toBe('protected');
  });
});

describe('actions', () => {
  function baby(stats?: Partial<typeof DEFAULT_BLOBBI_STATS>): Blobbi {
    const b = createEgg({ seed: 'a'.repeat(64), now: 0 });
    return { ...hatchToBaby(b, 0), stats: { ...DEFAULT_BLOBBI_STATS, ...stats }, lastDecayAt: 0 };
  }
  it('feeding raises hunger and lowers hygiene', () => {
    const b = baby({ hunger: 50, hygiene: 50 });
    const r = applyItemAction(b, 'food_burger', 0);
    expect(r.blobbi.stats.hunger).toBe(95); // +45
    expect(r.blobbi.stats.hygiene).toBe(42); // -8
    expect(r.xp).toBe(5);
  });
  it('play is gated by energy', () => {
    const b = baby({ energy: 5 });
    const r = applyItemAction(b, 'toy_ball', 0); // needs 10 energy
    expect(r.error).toBeTruthy();
  });
  it('direct sing raises happiness and grants xp', () => {
    const b = baby({ happiness: 50 });
    const r = applyDirectAction(b, 'sing', 0);
    expect(r.blobbi.stats.happiness).toBe(70); // +20
    expect(r.xp).toBe(9);
  });
  it('eggs only accept clean/medicine', () => {
    const egg = createEgg({ seed: 'b'.repeat(64), now: 0 });
    expect(applyItemAction(egg, 'food_apple', 0).error).toBeTruthy();
    expect(applyItemAction(egg, 'hyg_soap', 0).error).toBeUndefined();
  });
});

describe('lifecycle', () => {
  it('hatch requires 7 interactions, evolve requires 21 + stats', () => {
    let egg = createEgg({ seed: 'c'.repeat(64), now: 0 });
    expect(canHatch(egg)).toBe(false);
    for (let i = 0; i < 7; i++) egg = applyItemAction(egg, 'hyg_soap', 0).blobbi;
    expect(canHatch(egg)).toBe(true);
    let b = hatchToBaby(egg, 0);
    expect(b.lifeStage).toBe('baby');
    expect(b.stats.hunger).toBe(100); // reset
    expect(canEvolve(b)).toBe(false);
  });
  it('adult form is seed-derived and stable', () => {
    const seed = 'd'.repeat(64);
    const form = deriveAdultForm(seed);
    expect(ADULT_FORMS).toContain(form as typeof ADULT_FORMS[number]);
    const b = evolveToAdult({ ...createEgg({ seed, now: 0 }), lifeStage: 'baby', progressionState: 'evolving' } as Blobbi, 0);
    expect(b.adultForm).toBe(form);
  });
  it('derives deterministic traits', () => {
    const t1 = deriveTraits('e'.repeat(64));
    const t2 = deriveTraits('e'.repeat(64));
    expect(t1).toEqual(t2);
    expect(t1.baseColor).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('sleep', () => {
  it('toggles state', () => {
    const b = createEgg({ seed: 'f'.repeat(64), now: 0 });
    expect(setSleeping(b, true, 0).state).toBe('sleeping');
  });
});

describe('nostr import parsing', () => {
  function ev(tags: string[][], created_at = 1000) {
    return { id: 'x', pubkey: 'pk', sig: 's', kind: 31124, created_at, content: '', tags };
  }
  it('parses an adult blobbi event with stored traits', () => {
    const b = parseBlobbiEvent(ev([
      ['d', 'blobbi-abc'], ['b', 'blobbi:ecosystem:v1'], ['name', 'Pixel'],
      ['seed', 'a'.repeat(64)], ['stage', 'adult'], ['state', 'active'],
      ['hunger', '40'], ['happiness', '55'], ['health', '60'], ['hygiene', '30'], ['energy', '20'],
      ['experience', '1234'], ['care_streak', '3'],
      ['base_color', '#ff0000'], ['pattern', 'spotted'], ['size', 'large'],
      ['adult_type', 'froggi'], ['last_interaction', '900'], ['last_decay_at', '900'],
    ]))!;
    expect(b).not.toBeNull();
    expect(b.id).toBe('blobbi-abc');
    expect(b.name).toBe('Pixel');
    expect(b.lifeStage).toBe('adult');
    expect(b.adultForm).toBe('froggi');
    expect(b.stats.hunger).toBe(40);
    expect(b.traits.baseColor).toBe('#ff0000');
    expect(b.traits.pattern).toBe('spotted');
    expect(b.experience).toBe(1234);
    expect(b.careStreak).toBe(3);
  });
  it('normalizes a legacy incubating egg and reads task progress', () => {
    const b = parseBlobbiEvent(ev([
      ['d', 'egg-1'], ['b', 'blobbi:ecosystem:v1'], ['name', 'Eggy'],
      ['seed', 'b'.repeat(64)], ['stage', 'egg'], ['state', 'incubating'],
      ['task', 'interactions:4'],
    ]))!;
    expect(b.lifeStage).toBe('egg');
    expect(b.state).toBe('active');
    expect(b.progressionState).toBe('incubating');
    const m = b.progressionMissions.find((x) => x.id === 'interactions');
    expect(m?.current).toBe(4);
    expect(b.stats.hunger).toBe(100); // eggs pin hunger/energy
  });
  it('rejects an event without a valid stage', () => {
    expect(parseBlobbiEvent(ev([['d', 'x'], ['b', 'blobbi:ecosystem:v1']]))).toBeNull();
  });
});
