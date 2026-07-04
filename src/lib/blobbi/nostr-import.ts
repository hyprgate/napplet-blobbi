// Import existing Blobbis from Nostr.
//
// Ditto stores each Blobbi as an addressable kind-31124 "Blobbi State" event
// (namespace tag b=blobbi:ecosystem:v1), and the player's coins / xp / inventory
// / current companion on a kind-11125 Blobbonaut profile event. This module
// queries the shell relay pool for the logged-in user's events and parses them
// into our Blobbi model, so a Blobbi raised in Ditto is detected here.

import { identityGetPublicKey, relayQuery, type NostrEvent, type NostrFilter } from '@napplet/sdk';
import { makeEvolveMissions, makeHatchMissions } from './missions.js';
import { deriveAdultForm, deriveFavoriteFood, derivePersonality, deriveTraits, generateSeed } from './seed.js';
import { ADULT_FORMS } from './forms.js';
import {
  type Blobbi,
  type BlobbiActivityState,
  type BlobbiLifeStage,
  type BlobbiPattern,
  type BlobbiProgressionState,
  type BlobbiSize,
  type BlobbiSpecialMark,
  type BlobbiStats,
  clampStat,
} from './types.js';

export const KIND_BLOBBI_STATE = 31124;
export const KIND_BLOBBONAUT_PROFILE = 11125;
export const BLOBBI_ECOSYSTEM_NAMESPACE = 'blobbi:ecosystem:v1';

const STAGES = new Set<BlobbiLifeStage>(['egg', 'baby', 'adult']);
const ACTIVITY = new Set<BlobbiActivityState>(['active', 'sleeping', 'hibernating']);
const PATTERNS = new Set<BlobbiPattern>(['solid', 'spotted', 'striped', 'gradient']);
const MARKS = new Set<BlobbiSpecialMark>(['none', 'star', 'heart', 'sparkle', 'blush']);
const SIZES = new Set<BlobbiSize>(['small', 'medium', 'large']);

function tagVal(tags: string[][], name: string): string | undefined {
  return tags.find((t) => t[0] === name)?.[1];
}
function tagVals(tags: string[][], name: string): string[] {
  return tags.filter((t) => t[0] === name).map((t) => t[1]).filter((v): v is string => !!v);
}
function numTag(tags: string[][], name: string): number | undefined {
  const v = tagVal(tags, name);
  if (v === undefined) return undefined;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
}

/** Read the ["task","interactions:N"] counter, if present. */
function taskValue(tags: string[][], name: string): number {
  for (const t of tags) {
    if (t[0] === 'task' && t[1]) {
      const [k, v] = t[1].split(':');
      if (k === name) return parseInt(v ?? '0', 10) || 0;
    }
  }
  return 0;
}

export interface ImportedProfile {
  coins: number;
  xp: number;
  inventory: Record<string, number>;
  currentCompanion?: string;
  has: string[];
}

export interface NostrImport {
  blobbis: Blobbi[];
  profile: ImportedProfile | null;
}

/** Parse a kind-31124 event into our Blobbi model. Returns null if invalid. */
export function parseBlobbiEvent(event: NostrEvent): Blobbi | null {
  if (event.kind !== KIND_BLOBBI_STATE) return null;
  const tags = event.tags;
  const d = tagVal(tags, 'd');
  const stageRaw = tagVal(tags, 'stage') as BlobbiLifeStage | undefined;
  const rawState = tagVal(tags, 'state');
  if (!d || !stageRaw || !STAGES.has(stageRaw)) return null;

  let seed = tagVal(tags, 'seed');
  if (!seed || !/^[0-9a-f]{64}$/i.test(seed)) seed = generateSeed();

  // Progression-state resolution (migration-aware).
  const progTag = tagVal(tags, 'progression_state') as BlobbiProgressionState | undefined;
  let state: BlobbiActivityState = 'active';
  let progressionState: BlobbiProgressionState = 'none';
  if (progTag) {
    state = ACTIVITY.has(rawState as BlobbiActivityState) ? (rawState as BlobbiActivityState) : 'active';
    progressionState = progTag;
  } else if (rawState === 'incubating' || rawState === 'evolving') {
    progressionState = rawState;
  } else if (ACTIVITY.has(rawState as BlobbiActivityState)) {
    state = rawState as BlobbiActivityState;
  }

  const derived = deriveTraits(seed);
  const pattern = tagVal(tags, 'pattern') as BlobbiPattern | undefined;
  const mark = tagVal(tags, 'special_mark') as BlobbiSpecialMark | undefined;
  const size = tagVal(tags, 'size') as BlobbiSize | undefined;
  const traits = {
    baseColor: tagVal(tags, 'base_color') ?? derived.baseColor,
    secondaryColor: tagVal(tags, 'secondary_color') ?? derived.secondaryColor,
    eyeColor: tagVal(tags, 'eye_color') ?? derived.eyeColor,
    pattern: pattern && PATTERNS.has(pattern) ? pattern : derived.pattern,
    specialMark: mark && MARKS.has(mark) ? mark : derived.specialMark,
    size: size && SIZES.has(size) ? size : derived.size,
  };

  const stats: BlobbiStats = {
    hunger: clampStat(numTag(tags, 'hunger') ?? 100),
    happiness: clampStat(numTag(tags, 'happiness') ?? 100),
    health: clampStat(numTag(tags, 'health') ?? 100),
    hygiene: clampStat(numTag(tags, 'hygiene') ?? 100),
    energy: clampStat(numTag(tags, 'energy') ?? 100),
  };
  if (stageRaw === 'egg') { stats.hunger = 100; stats.energy = 100; }

  // Reconstruct progression missions from task counters.
  let progressionMissions = [] as Blobbi['progressionMissions'];
  if (progressionState === 'incubating') {
    progressionMissions = makeHatchMissions().map((m) =>
      m.id === 'interactions' ? { ...m, current: Math.min(m.target, taskValue(tags, 'interactions')) } : m,
    );
  } else if (progressionState === 'evolving') {
    progressionMissions = makeEvolveMissions().map((m) =>
      m.id === 'interactions' ? { ...m, current: Math.min(m.target, taskValue(tags, 'interactions')) } : m,
    );
  }

  const adultTypeTag = tagVal(tags, 'adult_type');
  const adultForm = stageRaw === 'adult'
    ? (adultTypeTag && (ADULT_FORMS as readonly string[]).includes(adultTypeTag) ? adultTypeTag : deriveAdultForm(seed))
    : undefined;

  const lastInteraction = numTag(tags, 'last_interaction') ?? Math.floor(event.created_at);
  return {
    id: d,
    name: tagVal(tags, 'name') ?? 'Blobbi',
    seed,
    ownerPubkey: event.pubkey,
    lifeStage: stageRaw,
    state,
    progressionState,
    stats,
    traits,
    adultForm,
    personality: tagVal(tags, 'personality') ?? derivePersonality(seed),
    favoriteFood: tagVal(tags, 'favorite_food') ?? deriveFavoriteFood(seed),
    experience: numTag(tags, 'experience') ?? 0,
    generation: numTag(tags, 'generation') ?? 1,
    careStreak: numTag(tags, 'care_streak') ?? 1,
    careStreakLastDay: tagVal(tags, 'care_streak_last_day'),
    createdAt: Math.floor(event.created_at),
    lastInteraction,
    lastDecayAt: numTag(tags, 'last_decay_at') ?? lastInteraction,
    progressionStartedAt: numTag(tags, 'progression_started_at'),
    progressionMissions,
  };
}

function parseProfileEvent(event: NostrEvent): ImportedProfile {
  const tags = event.tags;
  const inventory: Record<string, number> = {};
  for (const raw of tagVals(tags, 'storage')) {
    const [itemId, qty] = raw.split(':');
    if (itemId) inventory[itemId] = (inventory[itemId] ?? 0) + (parseInt(qty ?? '0', 10) || 0);
  }
  return {
    coins: numTag(tags, 'coins') ?? 0,
    xp: numTag(tags, 'xp') ?? 0,
    inventory,
    currentCompanion: tagVal(tags, 'current_companion'),
    has: tagVals(tags, 'has'),
  };
}

/** Newest event per d-tag wins (addressable replaceable). */
function newestPerD(events: NostrEvent[]): NostrEvent[] {
  const byD = new Map<string, NostrEvent>();
  for (const e of events) {
    const d = e.tags.find((t) => t[0] === 'd')?.[1];
    if (!d) continue;
    const prev = byD.get(d);
    if (!prev || e.created_at > prev.created_at) byD.set(d, e);
  }
  return [...byD.values()];
}

/**
 * Query the shell relay pool for the logged-in user's Blobbis + profile and
 * parse them. Returns empty/null on no identity or any error.
 */
export async function importFromNostr(): Promise<NostrImport> {
  let pubkey: string;
  try {
    pubkey = await identityGetPublicKey();
  } catch (err) {
    console.info('[blobbi] no identity (cannot import):', err);
    return { blobbis: [], profile: null };
  }
  if (!pubkey) {
    console.info('[blobbi] identity returned no pubkey; skipping import');
    return { blobbis: [], profile: null };
  }
  console.info('[blobbi] importing for pubkey', `${pubkey.slice(0, 12)}…`);

  const blobbiFilter: NostrFilter = {
    kinds: [KIND_BLOBBI_STATE],
    authors: [pubkey],
    '#b': [BLOBBI_ECOSYSTEM_NAMESPACE],
  };
  const profileFilter: NostrFilter = { kinds: [KIND_BLOBBONAUT_PROFILE], authors: [pubkey] };

  try {
    const [blobbiRes, profileRes] = await Promise.all([
      relayQuery([blobbiFilter]),
      relayQuery([profileFilter]),
    ]);
    const blobbiEvents: NostrEvent[] = Array.isArray(blobbiRes) ? blobbiRes.map((result) => result.event as NostrEvent) : [];
    const profileEvents: NostrEvent[] = Array.isArray(profileRes) ? profileRes.map((result) => result.event as NostrEvent) : [];
    console.info(`[blobbi] relay returned ${blobbiEvents.length} blobbi (kind ${KIND_BLOBBI_STATE}) + ${profileEvents.length} profile (kind ${KIND_BLOBBONAUT_PROFILE}) events`);

    const blobbis = newestPerD(blobbiEvents)
      .map((e) => {
        try { return parseBlobbiEvent(e); } catch { return null; }
      })
      .filter((b): b is Blobbi => b !== null);

    const newestProfile = [...profileEvents].sort((a, b) => b.created_at - a.created_at)[0];
    let profile: ImportedProfile | null = null;
    if (newestProfile) {
      try { profile = parseProfileEvent(newestProfile); } catch { profile = null; }
    }
    console.info(`[blobbi] parsed ${blobbis.length} blobbi(s):`, blobbis.map((b) => `${b.name}/${b.lifeStage}`));
    return { blobbis, profile };
  } catch {
    return { blobbis: [], profile: null };
  }
}
