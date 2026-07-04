// ABOUTME: Wraps inline text and periodically sends a small cursor scratching a
// ABOUTME: hand-drawn scribble underline beneath it, in the style of "we were browsing" cursor trails.

import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Trail colors evoke the multi-colored browsing cursor trails from we-were-online.
const TRAIL_COLORS = ["#ff5c8a", "#3aa0ff", "#2fbf71", "#ffb020", "#a86bff"];

// Duration of the cursor scratching across the word and drawing the scribble.
const DRAW_MS = 1500;
// How long the finished scribble lingers before it fades out.
const HOLD_MS = 1100;

// Cursor tip offset within the 28px-rendered SVG (arrow tip sits near this point),
// so the tip rides along the scribble rather than the SVG's top-left corner.
const TIP_OFFSET_X = 9;
const TIP_OFFSET_Y = 6;

// Vertical center of the scribble within its overlay.
const MID_Y = 6;

// Cursor shape matches playhtml's mouse cursor (see CursorPresenceLayer).
function CursorSVG({ color }: { color: string }) {
  return (
    <svg
      height="28"
      viewBox="0 0 32 32"
      width="28"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", pointerEvents: "none" }}
    >
      <g fill="none" fillRule="evenodd" transform="translate(10 7)">
        <path
          d="m6.148 18.473 1.863-1.003 1.615-.839-2.568-4.816h4.332l-11.379-11.408v16.015l3.316-3.221z"
          fill="#fff"
        />
        <path
          d="m6.431 17 1.765-.941-2.775-5.202h3.604l-8.025-8.043v11.188l2.53-2.442z"
          fill={color}
        />
      </g>
    </svg>
  );
}

type Point = { x: number; y: number };

// Smooths a series of points into a flowing curve (Catmull-Rom -> cubic bezier),
// so the scribble reads as an organic hand motion rather than sharp segments.
function pointsToSmoothPath(pts: Point[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(
      1,
    )} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

// Builds a scratchy scribble: a coil of overlapping loops that progresses left->right.
// `phase` (stable per run) varies the wobble so each scribble looks a little different.
function buildScribblePath(width: number, phase: number): string {
  if (width <= 0) return `M 0 ${MID_Y}`;

  const turns = Math.max(5, Math.round(width / 16));
  const spacing = width / turns;
  const loopRadius = Math.min(9, spacing * 0.62); // wide enough that loops overlap
  const amplitude = 5;
  const steps = turns * 14;

  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const theta = t * turns * Math.PI * 2;
    // Amplitude breathes a little and a gentle slope keeps it from looking mechanical.
    const ampT = amplitude * (0.82 + 0.18 * Math.sin(theta * 0.5 + phase));
    const slope = (t - 0.5) * 1.6;
    // Deterministic (phase-seeded) jitter adds hand tremor without reshuffling per render.
    const jitterX = Math.sin(i * 12.9898 + phase) * 0.6;
    const jitterY = Math.cos(i * 4.1414 + phase) * 0.6;
    const x = t * width + Math.cos(theta) * loopRadius + jitterX;
    const y = MID_Y + Math.sin(theta) * ampT + slope + jitterY;
    pts.push({ x, y });
  }
  return pointsToSmoothPath(pts);
}

interface CursorUnderlineProps {
  minDelayMs?: number;
  maxDelayMs?: number;
}

type Run = { width: number; color: string; phase: number };

export function CursorUnderline({
  children,
  minDelayMs = 12000,
  maxDelayMs = 24000,
}: PropsWithChildren<CursorUnderlineProps>) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [run, setRun] = useState<Run | null>(null);

  useEffect(() => {
    // Respect users who prefer reduced motion: never animate.
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let mounted = true;
    let timer: ReturnType<typeof setTimeout>;

    const scheduleNext = (initial = false) => {
      const delay = initial
        ? 3500
        : minDelayMs + Math.random() * (maxDelayMs - minDelayMs);

      timer = setTimeout(() => {
        if (!mounted) return;

        const width = wrapRef.current?.getBoundingClientRect().width ?? 0;
        // Skip (and retry later) when hidden or unmeasurable so we don't animate offscreen.
        if (width <= 0 || document.hidden) {
          scheduleNext();
          return;
        }

        setRun({
          width,
          color: TRAIL_COLORS[Math.floor(Math.random() * TRAIL_COLORS.length)],
          phase: Math.random() * Math.PI * 2,
        });

        timer = setTimeout(() => {
          if (!mounted) return;
          setRun(null);
          scheduleNext();
        }, DRAW_MS + HOLD_MS);
      }, delay);
    };

    scheduleNext(true);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [minDelayMs, maxDelayMs]);

  const width = run?.width ?? 0;
  const path = run ? buildScribblePath(width, run.phase) : "";

  return (
    <span
      ref={wrapRef}
      style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap" }}
    >
      {children}
      <AnimatePresence>
        {run && (
          <motion.span
            aria-hidden="true"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              position: "absolute",
              left: 0,
              top: "calc(100% - 4px)",
              width: `${width}px`,
              height: "18px",
              pointerEvents: "none",
            }}
          >
            <svg
              width={width}
              height="18"
              style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
            >
              <motion.path
                d={path}
                fill="none"
                stroke={run.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: DRAW_MS / 1000, ease: "easeInOut" }}
              />
            </svg>
            <motion.span
              initial={{ offsetDistance: "0%", opacity: 0 }}
              animate={{ offsetDistance: "100%", opacity: 1 }}
              transition={{
                offsetDistance: { duration: DRAW_MS / 1000, ease: "easeInOut" },
                opacity: { duration: 0.2 },
              }}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                offsetPath: `path('${path}')`,
                offsetRotate: "0deg",
                offsetAnchor: `${TIP_OFFSET_X}px ${TIP_OFFSET_Y}px`,
                pointerEvents: "none",
              }}
            >
              <CursorSVG color={run.color} />
            </motion.span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
