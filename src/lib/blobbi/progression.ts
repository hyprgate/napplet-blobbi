// Player progression / leveling — faithful port of core/lib/progression.ts.
// Cumulative XP → level via a fixed threshold table. MAX_LEVEL = 20.

export const MAX_LEVEL = 20;

/** Cumulative XP required to REACH each level (index 0 = level 1). */
export const XP_THRESHOLDS = [
  0, 100, 250, 500, 850, 1300, 1900, 2650, 3600, 4800, 6300, 8100, 10200,
  12700, 15600, 19000, 23000, 27600, 33000, 39200,
] as const;

export function xpToLevel(xp: number): number {
  const x = Math.floor(Math.max(0, xp));
  let level = 1;
  for (let i = 0; i < XP_THRESHOLDS.length; i++) {
    if (x >= XP_THRESHOLDS[i]!) level = i + 1;
    else break;
  }
  return Math.min(level, MAX_LEVEL);
}

export function xpProgress(xp: number): number {
  const level = xpToLevel(xp);
  if (level >= MAX_LEVEL) return 1;
  const cur = XP_THRESHOLDS[level - 1]!;
  const next = XP_THRESHOLDS[level]!;
  return Math.max(0, Math.min(1, (xp - cur) / (next - cur)));
}

export function xpToNextLevel(xp: number): number {
  const level = xpToLevel(xp);
  if (level >= MAX_LEVEL) return 0;
  return XP_THRESHOLDS[level]! - xp;
}

/** Max simultaneous blobbis unlocked at a level. */
export function getMaxBlobbis(level: number): number {
  if (level >= 20) return 5;
  if (level >= 15) return 4;
  if (level >= 10) return 3;
  if (level >= 5) return 2;
  return 1;
}
