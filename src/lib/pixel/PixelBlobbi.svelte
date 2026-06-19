<script lang="ts">
  import { buildSprite, GRID, type SpriteOptions } from './sprite.js';

  interface Props {
    stage: SpriteOptions['stage'];
    emotion: SpriteOptions['emotion'];
    sleeping: boolean;
    traits: SpriteOptions['traits'];
    adultForm?: string;
    size?: number;
    animate?: boolean;
  }
  const { stage, emotion, sleeping, traits, adultForm, size = 160, animate = true }: Props = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  let frame = $state(0);

  $effect(() => {
    if (!animate) return;
    // bob/idle every ~700ms; faster when excited
    const period = emotion === 'excited' || emotion === 'happy' ? 420 : 760;
    const id = setInterval(() => { frame = (frame + 1) % 2; }, period);
    return () => clearInterval(id);
  });

  $effect(() => {
    if (!canvas) return;
    const scale = size / GRID;
    const cells = buildSprite({ stage, emotion, sleeping, traits, adultForm, frame });
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const c = cells[y][x];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(Math.floor(x * scale), Math.floor(y * scale), Math.ceil(scale), Math.ceil(scale));
      }
    }
  });
</script>

<canvas
  bind:this={canvas}
  width={size}
  height={size}
  style="width:{size}px;height:{size}px;image-rendering:pixelated;"
  aria-label="Pixel-art Blobbi"
></canvas>
