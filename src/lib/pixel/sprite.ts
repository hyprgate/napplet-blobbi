// Procedural pixel-art Blobbi generator. Produces a grid of color cells from
// the blobbi's stage, seed-derived traits, adult form, and current emotion.
// Rendered crisply (image-rendering: pixelated) by PixelBlobbi.svelte.

import type { BlobbiEmotion } from '../blobbi/emotions.js';
import type { BlobbiLifeStage, BlobbiVisualTraits } from '../blobbi/types.js';
import { ADULT_FORM_ARCHETYPE, type AdultForm } from '../blobbi/forms.js';
import { mix, shade } from './colors.js';

export const GRID = 32;
export type Cell = string | null;
export type CellGrid = Cell[][];

class Grid {
  cells: CellGrid;
  constructor(public size = GRID) {
    this.cells = Array.from({ length: size }, () => Array<Cell>(size).fill(null));
  }
  px(x: number, y: number, c: Cell): void {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return;
    if (c === null) return;
    this.cells[y]![x] = c;
  }
  /** Paint x and its mirror across the vertical axis. */
  sym(x: number, y: number, c: Cell): void {
    this.px(x, y, c);
    this.px(this.size - 1 - x, y, c);
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: Cell): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, c);
      }
    }
  }
  rect(x0: number, y0: number, w: number, h: number, c: Cell): void {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.px(x, y, c);
  }
}

export interface SpriteOptions {
  stage: BlobbiLifeStage;
  emotion: BlobbiEmotion;
  sleeping: boolean;
  traits: BlobbiVisualTraits;
  adultForm?: string;
  /** Animation frame (0/1) for idle blink/bob. */
  frame?: number;
}

type EyeStyle = 'open' | 'happy' | 'closed' | 'half' | 'wide' | 'sad' | 'angry' | 'spiral' | 'star';
type MouthStyle = 'smile' | 'bigSmile' | 'frown' | 'open' | 'flat' | 'cat' | 'wavy';

function faceFor(emotion: BlobbiEmotion, sleeping: boolean): { eye: EyeStyle; mouth: MouthStyle; tint?: string } {
  if (sleeping) return { eye: 'closed', mouth: 'flat' };
  switch (emotion) {
    case 'happy': return { eye: 'happy', mouth: 'bigSmile' };
    case 'blissful': return { eye: 'closed', mouth: 'bigSmile' };
    case 'excited': return { eye: 'star', mouth: 'open' };
    case 'adoring': return { eye: 'happy', mouth: 'smile' };
    case 'sad': return { eye: 'sad', mouth: 'frown' };
    case 'hungry': return { eye: 'open', mouth: 'open' };
    case 'sleepy': return { eye: 'half', mouth: 'flat' };
    case 'boring': return { eye: 'half', mouth: 'flat' };
    case 'dirty': return { eye: 'open', mouth: 'wavy', tint: '#6b7a3a' };
    case 'sick': return { eye: 'half', mouth: 'frown', tint: '#7fa86b' };
    case 'dizzy': return { eye: 'spiral', mouth: 'open' };
    case 'nauseated': return { eye: 'spiral', mouth: 'open', tint: '#6f9a55' };
    case 'angry': return { eye: 'angry', mouth: 'frown' };
    case 'furious': return { eye: 'angry', mouth: 'frown', tint: '#c45b4a' };
    case 'annoyed': return { eye: 'angry', mouth: 'flat' };
    case 'surprised': return { eye: 'wide', mouth: 'open' };
    case 'curious': return { eye: 'wide', mouth: 'smile' };
    case 'mischievous': return { eye: 'half', mouth: 'cat' };
    case 'eating': return { eye: 'happy', mouth: 'open' };
    case 'chewing': return { eye: 'open', mouth: 'cat' };
    default: return { eye: 'open', mouth: 'smile' };
  }
}

function drawEye(g: Grid, x: number, y: number, style: EyeStyle, eye: string, white: string): void {
  switch (style) {
    case 'open':
      g.sym(x, y, white); g.sym(x, y + 1, eye); g.sym(x, y + 2, eye); g.sym(x, y - 1, eye);
      break;
    case 'wide':
      g.sym(x - 1, y, eye); g.sym(x, y - 1, eye); g.sym(x, y, white); g.sym(x, y + 1, eye); g.sym(x + 1, y, eye); g.sym(x, y + 2, eye);
      break;
    case 'happy': // ^
      g.sym(x - 1, y + 1, eye); g.sym(x, y, eye); g.sym(x + 1, y + 1, eye);
      break;
    case 'closed':
      g.sym(x - 1, y + 1, eye); g.sym(x, y + 1, eye); g.sym(x + 1, y + 1, eye);
      break;
    case 'half':
      g.sym(x - 1, y, eye); g.sym(x, y, eye); g.sym(x + 1, y, eye); g.sym(x, y + 1, eye);
      break;
    case 'sad':
      g.sym(x, y + 1, eye); g.sym(x, y + 2, eye); g.sym(x - 1, y, shade(eye, 0.3));
      break;
    case 'angry':
      g.sym(x + 1, y, eye); g.sym(x, y + 1, eye); g.sym(x - 1, y + 2, eye); g.sym(x, y + 2, eye);
      break;
    case 'spiral':
      g.sym(x, y, eye); g.sym(x + 1, y, eye); g.sym(x + 1, y + 1, eye); g.sym(x, y + 2, eye); g.sym(x - 1, y + 1, eye); g.sym(x - 1, y, eye);
      break;
    case 'star':
      g.sym(x, y - 1, white); g.sym(x - 1, y, white); g.sym(x, y, white); g.sym(x + 1, y, white); g.sym(x, y + 1, white);
      break;
  }
}

function drawMouth(g: Grid, cx: number, y: number, style: MouthStyle, c: string, tongue: string): void {
  switch (style) {
    case 'smile':
      g.px(cx - 1, y, c); g.px(cx, y + 1, c); g.px(cx + 1, y, c);
      break;
    case 'bigSmile':
      g.px(cx - 2, y - 1, c); g.px(cx - 1, y, c); g.px(cx, y + 1, c); g.px(cx + 1, y, c); g.px(cx + 2, y - 1, c);
      g.px(cx, y, tongue);
      break;
    case 'frown':
      g.px(cx - 1, y + 1, c); g.px(cx, y, c); g.px(cx + 1, y + 1, c);
      break;
    case 'open':
      g.rect(cx - 1, y, 2, 2, c); g.px(cx - 1, y + 1, tongue); g.px(cx, y + 1, tongue);
      break;
    case 'flat':
      g.px(cx - 1, y, c); g.px(cx, y, c); g.px(cx + 1, y, c);
      break;
    case 'cat':
      g.px(cx - 2, y, c); g.px(cx - 1, y + 1, c); g.px(cx, y, c); g.px(cx + 1, y + 1, c); g.px(cx + 2, y, c);
      break;
    case 'wavy':
      g.px(cx - 2, y, c); g.px(cx - 1, y + 1, c); g.px(cx, y, c); g.px(cx + 1, y + 1, c); g.px(cx + 2, y, c);
      break;
  }
}

function drawTopper(g: Grid, archetype: string, base: string, secondary: string): void {
  const outline = shade(base, -0.45);
  const top = 8; // head top region
  switch (archetype) {
    case 'flame':
      for (const [x, y, c] of [[16, top - 4, secondary], [15, top - 2, base], [17, top - 2, base], [16, top - 1, '#ffd166']] as [number, number, string][]) g.px(x, y, c);
      break;
    case 'leaf': case 'rose':
      g.px(16, top - 4, secondary); g.px(16, top - 3, secondary); g.px(15, top - 3, shade(secondary, -0.2)); g.px(17, top - 2, secondary);
      break;
    case 'crystal': case 'star':
      g.px(16, top - 5, '#ffe79e'); g.px(16, top - 4, secondary); g.px(15, top - 3, secondary); g.px(17, top - 3, secondary);
      break;
    case 'drop':
      g.px(16, top - 4, '#bfe9ff'); g.px(16, top - 3, '#bfe9ff');
      break;
    case 'mushroom': case 'puff':
      g.ellipse(16, top - 2, 6, 2, secondary); g.px(13, top - 2, shade(secondary, 0.3)); g.px(19, top - 2, shade(secondary, 0.3));
      break;
    case 'spiky': case 'rock':
      for (const x of [10, 13, 16, 19, 22]) { g.px(x, top - 2, base); g.px(x, top - 3, outline); }
      break;
    case 'wing':
      g.px(5, 17, secondary); g.px(4, 18, secondary); g.px(26, 17, secondary); g.px(27, 18, secondary);
      break;
    case 'frog':
      g.sym(11, top - 2, base); g.sym(11, top - 3, outline); g.sym(11, top - 2, '#fff');
      break;
    case 'owl':
      g.px(11, top - 2, base); g.px(11, top - 3, outline); g.px(21, top - 2, base); g.px(21, top - 3, outline);
      break;
    case 'panda':
      g.ellipse(11, top - 1, 2, 2, '#2b2b2b'); g.ellipse(21, top - 1, 2, 2, '#2b2b2b');
      break;
    default: // ears
      g.px(11, top - 2, base); g.px(11, top - 3, base); g.px(10, top - 2, outline);
      g.px(21, top - 2, base); g.px(21, top - 3, base); g.px(22, top - 2, outline);
      break;
  }
}

function drawMark(g: Grid, mark: string, cx: number, cy: number, color: string): void {
  switch (mark) {
    case 'star':
      g.px(cx, cy - 1, color); g.px(cx - 1, cy, color); g.px(cx, cy, color); g.px(cx + 1, cy, color); g.px(cx, cy + 1, color);
      break;
    case 'heart':
      g.px(cx - 1, cy, color); g.px(cx + 1, cy, color); g.px(cx, cy + 1, color); g.px(cx - 1, cy - 1, color); g.px(cx + 1, cy - 1, color);
      break;
    case 'sparkle':
      g.px(cx, cy - 1, '#fff'); g.px(cx, cy + 1, '#fff'); g.px(cx - 1, cy, '#fff'); g.px(cx + 1, cy, '#fff');
      break;
    case 'blush':
      g.sym(10, cy, '#ff9bb0'); g.sym(9, cy, '#ff9bb0');
      break;
  }
}

export function buildSprite(opts: SpriteOptions): CellGrid {
  const g = new Grid();
  const frame = opts.frame ?? 0;
  const bob = frame % 2 === 0 ? 0 : -1;
  const base = opts.traits.baseColor;
  const outline = shade(base, -0.5);
  const belly = mix(base, '#ffffff', 0.45);
  const eyeColor = opts.traits.eyeColor;
  const white = '#ffffff';
  const face = faceFor(opts.emotion, opts.sleeping);
  const body = face.tint ? mix(base, face.tint, 0.4) : base;

  // ── Shadow ──
  g.ellipse(16, 29, 8, 1.4, 'rgba(0,0,0,0.18)');

  if (opts.stage === 'egg') {
    // Egg: tall ovoid shell with pattern + special mark.
    const cy = 17 + bob;
    g.ellipse(16, cy + 1, 10, 13, outline);
    g.ellipse(16, cy + 1, 9, 12, body);
    g.ellipse(16, cy + 5, 6, 6, mix(body, '#ffffff', 0.3));
    // pattern
    if (opts.traits.pattern === 'spotted') {
      for (const [x, y] of [[12, 12], [20, 15], [14, 20], [19, 22]] as [number, number][]) g.ellipse(x, y, 1.4, 1.4, shade(base, -0.25));
    } else if (opts.traits.pattern === 'striped') {
      for (let y = 10; y < 26; y += 4) g.rect(7, y, 18, 1, shade(base, -0.22));
    }
    drawMark(g, opts.traits.specialMark, 16, cy + 2, opts.traits.secondaryColor);
    // gentle crack hint
    g.px(14, cy + 6, outline); g.px(15, cy + 7, outline); g.px(16, cy + 6, outline);
    return g.cells;
  }

  const isBaby = opts.stage === 'baby';
  const rx = isBaby ? 9 : 11;
  const ry = isBaby ? 9 : 10;
  const cy = (isBaby ? 19 : 18) + bob;

  // Adult topper goes behind the head.
  if (opts.stage === 'adult') {
    const archetype = ADULT_FORM_ARCHETYPE[(opts.adultForm as AdultForm)] ?? 'ears';
    drawTopper(g, archetype, base, opts.traits.secondaryColor);
  }

  // ── Body ──
  g.ellipse(16, cy, rx + 1, ry + 1, outline);
  g.ellipse(16, cy, rx, ry, body);
  // belly highlight
  g.ellipse(16, cy + 3, rx - 4, ry - 4, belly);
  // top highlight
  g.ellipse(13, cy - 4, 2, 1.5, mix(body, '#ffffff', 0.5));

  // pattern
  if (opts.traits.pattern === 'spotted') {
    for (const [x, y] of [[10, cy - 2], [22, cy], [12, cy + 4]] as [number, number][]) g.ellipse(x, y, 1.5, 1.5, shade(base, -0.22));
  } else if (opts.traits.pattern === 'striped') {
    for (let yy = cy - 6; yy < cy + 8; yy += 4) g.rect(8, yy, 16, 1, shade(base, -0.2));
  }

  // ── Face ──
  const eyeY = cy - 2;
  const eyeDx = isBaby ? 4 : 5;
  drawEye(g, 16 - eyeDx, eyeY, face.eye, eyeColor, white);
  const mouthY = cy + 3;
  drawMouth(g, 16, mouthY, face.mouth, outline, '#ff7a8a');

  // blush / mark
  if (opts.traits.specialMark === 'blush' || opts.emotion === 'adoring' || opts.emotion === 'blissful') {
    g.sym(16 - eyeDx - 2, eyeY + 2, '#ff9bb0');
    g.sym(16 - eyeDx - 1, eyeY + 2, '#ff9bb0');
  } else if (opts.traits.specialMark !== 'none') {
    drawMark(g, opts.traits.specialMark, 12, cy + 4, opts.traits.secondaryColor);
  }

  // sleep "z"
  if (opts.sleeping) {
    g.px(24, 9, '#cfe8ff'); g.px(25, 9, '#cfe8ff'); g.px(25, 10, '#cfe8ff'); g.px(24, 11, '#cfe8ff'); g.px(25, 11, '#cfe8ff');
  }
  // dirty flecks
  if (opts.emotion === 'dirty') {
    for (const [x, y] of [[10, cy + 5], [21, cy + 2], [18, cy + 6]] as [number, number][]) g.px(x, y, '#6b5a2a');
  }

  return g.cells;
}
