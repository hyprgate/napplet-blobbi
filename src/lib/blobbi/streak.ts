// Care streak — faithful port of actions/lib/blobbi-streak.ts.
// Tracked by local calendar day; at most one increment per day.

export type StreakAction = 'initialized' | 'same_day' | 'incremented' | 'reset';

export interface StreakUpdate {
  streak: number;
  lastDay: string;
  action: StreakAction;
  wasUpdated: boolean;
}

export function getLocalDayString(now = Date.now()): string {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayDifference(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`).getTime();
  const db = new Date(`${b}T00:00:00`).getTime();
  return Math.floor(Math.abs(db - da) / 86_400_000);
}

export function calculateStreakUpdate(
  currentStreak: number | undefined,
  lastDay: string | undefined,
  now = Date.now(),
): StreakUpdate {
  const today = getLocalDayString(now);

  if (!currentStreak || !lastDay) {
    return { streak: 1, lastDay: today, action: 'initialized', wasUpdated: true };
  }
  if (lastDay === today) {
    return { streak: currentStreak, lastDay, action: 'same_day', wasUpdated: false };
  }
  const diff = dayDifference(lastDay, today);
  if (diff === 1) {
    return { streak: currentStreak + 1, lastDay: today, action: 'incremented', wasUpdated: true };
  }
  return { streak: 1, lastDay: today, action: 'reset', wasUpdated: true };
}
