// ABOUTME: Wraps inline text and periodically sends three cursors drawing staggered,
// ABOUTME: slightly wobbly lines beneath it, using the same trail drawing as playhtml's "we were online" portraits.

import { useEffect, useRef, type PropsWithChildren } from "react";
import { getStroke } from "perfect-freehand";

// Cursor shapes and hotspots from playhtml extension/website/shared/cursors.tsx.
const ARROW = "M12 4 L12 16.5 L14.7 14 L16.7 18.5 L18.3 17.8 L16.3 13.4 L20 13.4 Z";
const HAND = "M11.3,20.4c-0.3-0.4-0.6-1.1-1.2-2c-0.3-0.5-1.2-1.5-1.5-1.9c-0.2-0.4-0.2-0.6-0.1-1c0.1-0.6,0.7-1.1,1.4-1.1c0.5,0,1,0.4,1.4,0.7c0.2,0.2,0.5,0.6,0.7,0.8c0.2,0.2,0.2,0.3,0.4,0.5c0.2,0.3,0.3,0.5,0.2,0.1c-0.1-0.5-0.2-1.3-0.4-2.1c-0.1-0.6-0.2-0.7-0.3-1.1c-0.1-0.5-0.2-0.8-0.3-1.3c-0.1-0.3-0.2-1.1-0.3-1.5c-0.1-0.5-0.1-1.4,0.3-1.8c0.3-0.3,0.9-0.4,1.3-0.2c0.5,0.3,0.8,1,0.9,1.3c0.2,0.5,0.4,1.2,0.5,2c0.2,1,0.5,2.5,0.5,2.8c0-0.4-0.1-1.1,0-1.5c0.1-0.3,0.3-0.7,0.7-0.8c0.3-0.1,0.6-0.1,0.9-0.1c0.3,0.1,0.6,0.3,0.8,0.5c0.4,0.6,0.4,1.9,0.4,1.8c0.1-0.4,0.1-1.2,0.3-1.6c0.1-0.2,0.5-0.4,0.7-0.5c0.3-0.1,0.7-0.1,1,0c0.2,0,0.6,0.3,0.7,0.5c0.2,0.3,0.3,1.3,0.4,1.7c0,0.1,0.1-0.4,0.3-0.7c0.4-0.6,1.8-0.8,1.9,0.6c0,0.7,0,0.6,0,1.1c0,0.5,0,0.8,0,1.2c0,0.4-0.1,1.3-0.2,1.7c-0.1,0.3-0.4,1-0.7,1.4c0,0-1.1,1.2-1.2,1.8c-0.1,0.6-0.1,0.6-0.1,1c0,0.4,0.1,0.9,0.1,0.9s-0.8,0.1-1.2,0c-0.4-0.1-0.9-0.8-1-1.1c-0.2-0.3-0.5-0.3-0.7,0c-0.2,0.4-0.7,1.1-1.1,1.1c-0.7,0.1-2.1,0-3.1,0c0,0,0.2-1-0.2-1.4c-0.3-0.3-0.8-0.8-1.1-1.1L11.3,20.4z";
const OPEN_HAND = "M12.6,16.6c-0.1-0.4-0.2-0.8-0.4-1.6c-0.2-0.6-0.3-0.9-0.5-1.2c-0.2-0.5-0.3-0.7-0.5-1.2c-0.1-0.3-0.4-1-0.5-1.4c-0.1-0.5,0-0.9,0.2-1.2c0.3-0.3,1-0.5,1.4-0.4c0.4,0.1,0.7,0.5,0.9,0.8c0.3,0.5,0.4,0.6,0.7,1.5c0.4,1,0.6,1.9,0.6,2.2l0.1,0.5c0,0,0-1.1,0-1.2c0-1-0.1-1.8,0-2.9c0-0.1,0.1-0.6,0.1-0.7c0.1-0.5,0.3-0.8,0.7-1c0.4-0.2,0.9-0.2,1.4,0c0.4,0.2,0.6,0.5,0.7,1c0,0.1,0.1,1,0.1,1.1c0,1,0,1.6,0,2.2c0,0.2,0,1.6,0,1.5c0.1-0.7,0.1-3.2,0.3-3.9c0.1-0.4,0.4-0.7,0.8-0.9c0.4-0.2,1.1-0.1,1.4,0.2c0.3,0.3,0.4,0.7,0.5,1.2c0,0.4,0,0.9,0,1.2c0,0.9,0,1.3,0,2.1c0,0,0,0.3,0,0.2c0.1-0.3,0.2-0.5,0.3-0.7c0-0.1,0.2-0.6,0.4-0.9c0.1-0.2,0.2-0.4,0.4-0.7c0.2-0.3,0.4-0.4,0.7-0.6c0.5-0.2,1.1,0.1,1.3,0.6c0.1,0.2,0,0.7,0,1.1c-0.1,0.6-0.3,1.3-0.4,1.6c-0.1,0.4-0.3,1.2-0.3,1.6c-0.1,0.4-0.2,1.4-0.4,1.8c-0.1,0.3-0.4,1-0.7,1.4c0,0-1.1,1.2-1.2,1.8c-0.1,0.6-0.1,0.6-0.1,1c0,0.4,0.1,0.9,0.1,0.9s-0.8,0.1-1.2,0c-0.4-0.1-0.9-0.8-1-1.1c-0.2-0.3-0.5-0.3-0.7,0c-0.2,0.4-0.7,1.1-1.1,1.1c-0.7,0.1-2.1,0-3.1,0c0,0,0.2-1-0.2-1.4c-0.3-0.3-0.8-0.8-1.1-1.1l-0.8-0.9c-0.3-0.4-0.6-1.1-1.2-2c-0.3-0.5-1-1.1-1.3-1.6c-0.2-0.4-0.3-1-0.2-1.3c0.2-0.6,0.7-0.9,1.4-0.8c0.5,0,0.8,0.2,1.2,0.5c0.2,0.2,0.6,0.5,0.8,0.7c0.2,0.2,0.2,0.3,0.4,0.5C12.6,16.8,12.6,16.9,12.6,16.6";
const FINGERS = '<line x1="19.6" y1="20.7" x2="19.6" y2="17.3" stroke="black" stroke-width="0.75" stroke-linecap="round"/><line x1="17.6" y1="20.7" x2="17.5" y2="17.3" stroke="black" stroke-width="0.75" stroke-linecap="round"/><line x1="15.6" y1="17.3" x2="15.6" y2="20.7" stroke="black" stroke-width="0.75" stroke-linecap="round"/>';

type CursorShape = { hotspot: [number, number]; unit: number; svg: (color: string) => string };

const CURSORS: CursorShape[] = [
  {
    hotspot: [12, 4],
    unit: 24,
    svg: (c) =>
      `<path d="${ARROW}" fill="white"/><path d="${ARROW}" fill="${c}" stroke="white" stroke-width="0.5" stroke-linejoin="round" transform="translate(-0.4,-0.4)"/>`,
  },
  {
    hotspot: [12.3, 8.4],
    unit: 32,
    svg: (c) =>
      `<path d="${HAND}" fill="${c}" fill-opacity="0.85" stroke="black" stroke-width="0.75" stroke-linecap="round" stroke-linejoin="round"/>${FINGERS}`,
  },
  {
    hotspot: [15.9, 8.7],
    unit: 32,
    svg: (c) =>
      `<path d="${OPEN_HAND}" fill="${c}" fill-opacity="0.7" stroke="black" stroke-width="0.75" stroke-linecap="round" stroke-linejoin="round"/>${FINGERS}`,
  },
];

const LINES = 3;
// Each lower line sits this many px further down and starts about this much later.
const LINE_GAP = 5;
const STAGGER_MS = 220;
// Amplitude of the hand-drawn waviness, in px.
const WOBBLE = 2.5;
const DRAW_MS = 1500;
const HOLD_MS = 1100;
const FADE_MS = 600;
const STROKE_WIDTH = 4;
const TRAIL_OPACITY = 0.7;
const CURSOR_SIZE = 32;

const SVG_NS = "http://www.w3.org/2000/svg";

type Point = { x: number; y: number };

// Same range playhtml uses for a new player's cursor color.
function randomHslColor(): string {
  const hue = Math.floor(Math.random() * 360);
  const s = 65 + Math.floor(Math.random() * 15);
  const l = 55 + Math.floor(Math.random() * 15);
  return `hsl(${hue}, ${s}%, ${l}%)`;
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// A left-to-right line with a slight tilt, two slow random waves and a little
// hand jitter. Point spacing varies so the cursor speeds up and slows down.
function buildPoints(width: number): Point[] {
  const n = Math.max(12, Math.round(width / 6));
  const tilt = (Math.random() - 0.5) * (3 + WOBBLE * 1.5);
  const waves = [0, 1].map((j) => ({
    amp: WOBBLE * (j ? 0.4 : 0.7) * (0.6 + Math.random() * 0.8),
    freq: (j ? 2.5 : 0.8) + Math.random() * (j ? 2.5 : 1.2),
    phase: Math.random() * Math.PI * 2,
  }));
  const pts: Point[] = [];
  const step = (width + 4) / n;
  let x = -2;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const wave = waves.reduce(
      (sum, w) => sum + w.amp * Math.sin(w.phase + t * w.freq * Math.PI * 2),
      0,
    );
    pts.push({ x, y: 4 + tilt * t + wave + (Math.random() - 0.5) * (0.8 + WOBBLE * 0.3) });
    x += step * (0.6 + Math.random() * 0.8);
  }
  const scale = (width + 4) / (pts[pts.length - 1].x + 2);
  return pts.map((p) => ({ x: -2 + (p.x + 2) * scale, y: p.y }));
}

// perfect-freehand outline -> closed SVG path, as in playhtml's trailAnimation.ts.
function strokePath(pts: Point[], done: boolean): string {
  const outline = getStroke(
    pts.map((p) => [p.x, p.y]),
    {
      size: STROKE_WIDTH,
      thinning: 0,
      smoothing: 0.5,
      streamline: 0.05,
      simulatePressure: false,
      last: done,
      start: { taper: 20 },
      end: done ? { taper: 20 } : { taper: 0, cap: true },
    },
  );
  if (outline.length < 3) return "";
  let d = `M ${outline[0][0].toFixed(2)} ${outline[0][1].toFixed(2)} Q`;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i];
    const b = outline[(i + 1) % outline.length];
    d += ` ${a[0].toFixed(2)} ${a[1].toFixed(2)} ${((a[0] + b[0]) / 2).toFixed(2)} ${((a[1] + b[1]) / 2).toFixed(2)}`;
  }
  return d + " Z";
}

type Run = { path: SVGPathElement; cursor: SVGGElement; pts: Point[]; color: string; delay: number };

// Draws one pass of staggered lines into `wrap`; calls `onDone` once it has faded out.
function drawPass(wrap: HTMLElement, onDone: () => void): () => void {
  const width = wrap.offsetWidth;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(12 + (LINES - 1) * LINE_GAP));
  Object.assign(svg.style, {
    position: "absolute",
    left: "0",
    top: "calc(100% - 6px)",
    overflow: "visible",
    pointerEvents: "none",
  });
  const cursorLayer = document.createElementNS(SVG_NS, "g");

  // Deal the cursors out without repeats, each with its own color.
  const deck = CURSORS.slice().sort(() => Math.random() - 0.5);
  const runs: Run[] = Array.from({ length: LINES }, (_, k) => {
    const shape = deck[k % deck.length];
    const color = randomHslColor();
    const scale = CURSOR_SIZE / shape.unit;
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("opacity", String(TRAIL_OPACITY));
    path.setAttribute("fill", color);
    const cursor = document.createElementNS(SVG_NS, "g");
    cursor.style.display = "none";
    cursor.innerHTML = `<g transform="translate(${-shape.hotspot[0] * scale},${-shape.hotspot[1] * scale}) scale(${scale})">${shape.svg(color)}</g>`;
    svg.appendChild(path);
    cursorLayer.appendChild(cursor);
    const pts = buildPoints(width).map((p) => ({ x: p.x, y: p.y + k * LINE_GAP }));
    return { path, cursor, pts, color, delay: k * STAGGER_MS + Math.random() * STAGGER_MS * 0.3 };
  });
  svg.appendChild(cursorLayer);
  wrap.appendChild(svg);

  const paint = ({ pts, path, cursor }: Run, progress: number) => {
    if (progress <= 0) return;
    const done = progress >= 1;
    const exact = (pts.length - 1) * progress;
    const i = Math.floor(exact);
    const f = exact - i;
    const visible = pts.slice(0, Math.min(i, pts.length - 1) + 1);
    // Interpolated head between points, so the cursor glides instead of stepping.
    const head =
      !done && f > 0
        ? { x: pts[i].x + (pts[i + 1].x - pts[i].x) * f, y: pts[i].y + (pts[i + 1].y - pts[i].y) * f }
        : null;
    const input = head ? visible.concat([head]) : visible;
    if (input.length >= 2) path.setAttribute("d", strokePath(input, done));
    const tip = input[input.length - 1];
    cursor.setAttribute("transform", `translate(${tip.x.toFixed(1)},${tip.y.toFixed(1)})`);
    cursor.style.display = done ? "none" : "";
  };

  let raf = 0;
  let timer: ReturnType<typeof setTimeout>;
  const t0 = performance.now();
  const frame = (now: number) => {
    let finished = true;
    for (const run of runs) {
      const p = Math.min(1, Math.max(0, (now - t0 - run.delay) / DRAW_MS));
      if (p < 1) finished = false;
      paint(run, ease(p));
    }
    if (!finished) {
      raf = requestAnimationFrame(frame);
      return;
    }
    timer = setTimeout(() => {
      svg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, easing: "ease-out", fill: "forwards" });
      timer = setTimeout(() => {
        svg.remove();
        onDone();
      }, FADE_MS);
    }, HOLD_MS);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    svg.remove();
  };
}

interface CursorUnderlineProps {
  minDelayMs?: number;
  maxDelayMs?: number;
}

export function CursorUnderline({
  children,
  minDelayMs = 12000,
  maxDelayMs = 24000,
}: PropsWithChildren<CursorUnderlineProps>) {
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Respect users who prefer reduced motion: never animate.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let mounted = true;
    let timer: ReturnType<typeof setTimeout>;
    let cancelPass: (() => void) | undefined;

    const scheduleNext = (initial = false) => {
      const delay = initial ? 3500 : minDelayMs + Math.random() * (maxDelayMs - minDelayMs);
      timer = setTimeout(() => {
        if (!mounted) return;
        const wrap = wrapRef.current;
        // Skip (and retry later) when hidden or unmeasurable so we don't animate offscreen.
        if (!wrap || wrap.offsetWidth <= 0 || document.hidden) {
          scheduleNext();
          return;
        }
        cancelPass = drawPass(wrap, () => {
          cancelPass = undefined;
          if (mounted) scheduleNext();
        });
      }, delay);
    };

    scheduleNext(true);
    return () => {
      mounted = false;
      clearTimeout(timer);
      cancelPass?.();
    };
  }, [minDelayMs, maxDelayMs]);

  return (
    <span
      ref={wrapRef}
      style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap" }}
    >
      {children}
    </span>
  );
}
