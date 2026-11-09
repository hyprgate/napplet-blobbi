import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import Onboarding from './components/Onboarding.svelte';
import Shop from './components/Shop.svelte';
import StatHud from './components/StatHud.svelte';
import { createEgg } from './lib/blobbi/lifecycle.js';
import { freshState, game } from './lib/blobbi/store.svelte.js';

vi.mock('@napplet/sdk', () => ({
  storage: { getItem: vi.fn().mockResolvedValue(null), setItem: vi.fn().mockResolvedValue(undefined), removeItem: vi.fn().mockResolvedValue(undefined) },
  relay: { subscribe: vi.fn().mockReturnValue({ close: vi.fn() }) },
  identity: { getPublicKey: vi.fn().mockResolvedValue(null) },
}));

let component: ReturnType<typeof mount> | null = null;

beforeEach(() => {
  Object.assign(game, freshState());
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;
});

afterEach(() => {
  if (component) unmount(component);
  component = null;
  document.body.innerHTML = '';
});

function button(text: RegExp): HTMLButtonElement {
  return [...document.querySelectorAll('button')].find((b) => text.test(b.textContent ?? ''))!;
}

describe('adopting', () => {
  it('shows the landing page what you get before asking for anything', () => {
    component = mount(Onboarding, { target: document.body });
    flushSync();

    expect([...document.querySelectorAll('.stage-card strong')].map((el) => el.textContent)).toEqual(['Hatch', 'Raise', 'Evolve']);
    expect(document.querySelectorAll('.stage-card canvas')).toHaveLength(3);
    expect(document.body.textContent).toContain('adopting an egg costs 100');
  });

  it('cannot reroll itself out of ever adopting', () => {
    game.onboarding = 'preview';
    game.preview = createEgg({ name: 'Blobbi', seed: 'a'.repeat(64) });
    game.coins = 110;
    component = mount(Onboarding, { target: document.body });
    flushSync();

    const reroll = button(/Try another egg/);
    expect(reroll.disabled).toBe(false);
    reroll.click();
    flushSync();

    expect(game.coins).toBe(100);
    expect(button(/Try another egg/).disabled).toBe(true);
    expect(button(/Adopt/).disabled).toBe(false);
  });

  it('lets a save already stuck below the cost adopt its first Blobbi', () => {
    game.onboarding = 'preview';
    game.preview = createEgg({ name: 'Stuck', seed: 'b'.repeat(64) });
    game.coins = 40;
    component = mount(Onboarding, { target: document.body });
    flushSync();

    const adopt = button(/Adopt/);
    expect(adopt.textContent).toContain('−40');
    adopt.click();
    flushSync();

    expect(game.coins).toBe(0);
    expect(game.blobbis.map((blobbi) => blobbi.name)).toEqual(['Stuck']);
  });
});

describe('reading stats', () => {
  it('names each stat and exposes it as a meter', () => {
    const blobbi = { ...createEgg({ name: 'Egg', seed: 'c'.repeat(64) }), lifeStage: 'baby' as const };
    blobbi.stats = { ...blobbi.stats, hunger: 10 };
    component = mount(StatHud, { target: document.body, props: { blobbi } });
    flushSync();

    const hunger = document.querySelector('[role="meter"][aria-label="Hunger"]')!;
    expect(hunger.getAttribute('aria-valuenow')).toBe('10');
    expect(hunger.textContent).toContain('needs care');
    expect(document.querySelector('[role="meter"][aria-label="Health"]')?.textContent).not.toContain('needs care');
  });
});

describe('shop', () => {
  it('leads with what an egg can use and says the rest is for later', () => {
    const egg = createEgg({ name: 'Egg', seed: 'd'.repeat(64) });
    game.blobbis = [egg];
    game.currentId = egg.id;
    component = mount(Shop, { target: document.body });
    flushSync();

    const headings = [...document.querySelectorAll('.cat')].map((el) => el.textContent ?? '');
    expect(headings[0]).toBe('Hygiene');
    expect(headings[1]).toBe('Medicine');
    expect(headings.find((text) => text.startsWith('Food'))).toContain('once it hatches');
  });

  it('spells out effects instead of hun and hyg', () => {
    component = mount(Shop, { target: document.body });
    flushSync();

    const labels = [...document.querySelectorAll('.eff li')].map((el) => el.getAttribute('aria-label'));
    expect(labels).toContain('Hunger +25');
    expect(document.body.textContent).not.toMatch(/\bhun\b|\bhyg\b/);
  });
});
