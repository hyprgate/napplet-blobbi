// Stat segment display + care state — faithful port of core/lib/blobbi-segments.ts.

import type { BlobbiLifeStage } from './types.js';

export type CareState = 'urgent' | 'attention' | 'okay' | 'good' | 'protected';

export interface SegmentInfo {
  filled: number;
  total: number;
  careState: CareState;
  isLow: boolean;
  isUrgent: boolean;
}

function segmentCount(stage: BlobbiLifeStage): number {
  return stage === 'adult' ? 10 : 4;
}

function toFilled(value: number, max: number): number {
  return Math.ceil((Math.max(1, Math.min(100, value)) / 100) * max) || 1;
}

function careStateFor(stage: BlobbiLifeStage, value: number): CareState {
  if (stage === 'egg') return 'protected';
  if (stage === 'adult') {
    if (value <= 30) return 'urgent';
    if (value <= 60) return 'attention';
    if (value <= 70) return 'okay';
    return 'good';
  }
  // baby
  if (value <= 25) return 'urgent';
  if (value <= 50) return 'attention';
  if (value <= 75) return 'okay';
  return 'good';
}

export function statSegments(stage: BlobbiLifeStage, value: number): SegmentInfo {
  const total = segmentCount(stage);
  const careState = careStateFor(stage, value);
  return {
    filled: stage === 'egg' ? total : toFilled(value, total),
    total,
    careState,
    isLow: careState === 'attention' || careState === 'urgent',
    isUrgent: careState === 'urgent',
  };
}
