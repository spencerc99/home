import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { buildCount, type Box, type Layer, type Slide as SlideData, type TextRun } from "./perpetualPlayDeck";
import { SharedCollages } from "./SharedCollages";

export const SLIDE_W = 1920;
export const SLIDE_H = 1080;

const PAPER = "/talk/perpetual-play/img/paper.webp";
const SCRIBBLE = "/talk/perpetual-play/img/scribble.svg";

function clip([x, y, w, h]: Box): Box {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(SLIDE_W, x + w);
  const y1 = Math.min(SLIDE_H, y + h);
  return [x0, y0, x1 - x0, y1 - y0];
}

function place([x, y, w, h]: Box): CSSProperties {
  return { position: "absolute", left: x, top: y, width: w, height: h };
}

// play/pause: the slide on screen. ready: the next slide, paused but fully
// buffering so it starts instantly. still: anything else, first frame only.
export type MediaMode = "play" | "pause" | "ready" | "still";

function Runs({ runs }: { runs: TextRun[] }) {
  return (
    <>
      {runs.map((run, i) => (
        <span
          key={i}
          style={{
            color: run.color,
            fontWeight: run.bold ? 700 : undefined,
            textDecoration: run.underline ? "underline" : undefined,
          }}
        >
          {run.text}
        </span>
      ))}
    </>
  );
}

function SlideVideo({ src, box, radius, mode }: { src: string; box: Box; radius?: number; mode: MediaMode }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (mode === "play") {
      video.play().catch((error: unknown) => {
        // Autoplay of a muted video can still be refused (power saving, a
        // background tab). The presenter can press play, so log and carry on.
        console.warn(`[talk] could not autoplay ${src}`, error);
      });
    } else {
      video.pause();
    }
  }, [mode, src]);
  return (
    <video
      ref={ref}
      src={src}
      muted
      loop
      playsInline
      preload={mode === "still" ? "metadata" : "auto"}
      style={{ ...place(box), objectFit: "cover", borderRadius: radius }}
    />
  );
}

const isVideo = (src: string) => /\.(mp4|webm|mov)$/i.test(src);

function ReelItem({ src, shown, playing }: { src: string; shown: boolean; playing: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (playing) {
      video.play().catch((error: unknown) => console.warn(`[talk] could not autoplay ${src}`, error));
    } else {
      video.pause();
    }
  }, [playing, src]);
  const style: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    opacity: shown ? 1 : 0,
    transition: "opacity 900ms ease",
  };
  return isVideo(src) ? (
    <video ref={ref} src={src} muted loop playsInline preload="auto" style={style} />
  ) : (
    <img src={src} alt="" draggable={false} style={style} />
  );
}

/** A tile stepping through `items` while its slide plays; see the "reel" layer. */
function SlideReel({ layer, mode }: { layer: Extract<Layer, { kind: "reel" }>; mode: MediaMode }) {
  const [at, setAt] = useState(0);
  const playing = mode === "play";
  useEffect(() => {
    if (!playing) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      setAt((i) => (i + 1) % layer.items.length);
      interval = setInterval(() => setAt((i) => (i + 1) % layer.items.length), layer.every);
    }, (layer.delay ?? 0) + layer.every);
    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [playing, layer]);
  const n = layer.items.length;
  // Only the one showing, the one fading out and the one coming up are in
  // the page, so a tile never loads all of its videos at once.
  const mounted = mode === "still" ? [0] : [...new Set([(at - 1 + n) % n, at, (at + 1) % n])];
  return (
    <div style={{ ...place(clip(layer.box)), overflow: "hidden" }}>
      {mounted.map((i) => (
        <ReelItem key={i} src={layer.items[i]} shown={i === at} playing={playing && i !== (at + 1) % n} />
      ))}
    </div>
  );
}

function SlideLayer({ layer, mode, active }: { layer: Layer; mode: MediaMode; active: boolean }) {
  switch (layer.kind) {
    case "image":
      return (
        <img
          src={layer.src}
          alt=""
          draggable={false}
          style={{
            ...place(layer.clipToSlide === false ? layer.box : clip(layer.box)),
            borderRadius: layer.radius,
            objectFit: layer.cover ? "cover" : undefined,
          }}
        />
      );
    case "video":
      return <SlideVideo src={layer.src} box={layer.box} radius={layer.radius} mode={mode} />;
    case "reel":
      return <SlideReel layer={layer} mode={mode} />;
    case "website":
      // Not clickable: a click inside would take the keyboard from the deck.
      return mode === "still" ? (
        <img src={layer.still} alt="" draggable={false} style={{ ...place(layer.box), objectFit: "cover" }} />
      ) : (
        <iframe
          src={layer.url}
          title={layer.url}
          tabIndex={-1}
          style={{ ...place(layer.box), border: 0, pointerEvents: "none", background: "#fff" }}
        />
      );
    case "block":
      return <div style={{ ...place(layer.box), background: layer.color }} />;
    case "text":
      return (
        <div
          style={{
            ...place(layer.box),
            fontSize: layer.size,
            lineHeight: layer.lineHeight ?? 1.2,
            fontWeight: layer.bold ? 700 : 400,
            textAlign: layer.align ?? "left",
            whiteSpace: layer.nowrap ? "pre" : "pre-wrap",
            color: "#000",
          }}
        >
          <Runs runs={layer.runs} />
          {layer.list &&
            (() => {
              const List = layer.list.style === "ordered" ? "ol" : "ul";
              return (
                <List style={{ margin: 0, paddingLeft: "1.1em" }}>
                  {layer.list.items.map((item, i) => (
                    <li key={i}>
                      <Runs runs={item} />
                    </li>
                  ))}
                </List>
              );
            })()}
          {layer.after && <Runs runs={layer.after} />}
        </div>
      );
    case "label":
      return (
        <div
          style={{
            ...place([0, 974, 262, 106]),
            background: "#ff8901",
            boxSizing: "border-box",
            padding: "0 16px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            fontSize: 24,
            lineHeight: 1,
          }}
        >
          <span style={{ color: "#000" }}>{layer.title}</span>
          {layer.link && <span style={{ color: "#007fd9" }}>{layer.link}</span>}
        </div>
      );
    case "scribble":
      return (
        <img src={SCRIBBLE} alt="" draggable={false} style={{ ...place([0, 0, SLIDE_W, SLIDE_H]), opacity: layer.opacity }} />
      );
    case "collages":
      return <SharedCollages active={active} />;
  }
}

/** Where a picture or video layer is drawn, in slide pixels. */
function drawnBox(layer: Layer): Box | null {
  if (layer.kind === "image") return layer.clipToSlide === false ? layer.box : clip(layer.box);
  if (layer.kind === "video") return layer.box;
  return null;
}

const GLIDE_MS = 650;
const GLIDE_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

/**
 * Like Figma's smart animate: a picture that is on both slides glides from
 * where it was to where it is now, and a picture that appears more often than
 * before (one window becoming ten) grows out of the nearest copy. Anything new
 * fades in. Slides that share no picture keep a plain cut.
 */
function glideFrom(root: HTMLElement, slide: SlideData, from: SlideData) {
  const before = from.layers.flatMap((layer) => {
    const box = drawnBox(layer);
    return box && (layer.kind === "image" || layer.kind === "video") ? [{ src: layer.src, box }] : [];
  });
  const shared = slide.layers.some((l) => (l.kind === "image" || l.kind === "video") && before.some((b) => b.src === l.src));
  if (!shared) return;

  const unchanged = new Set(from.layers.map((l) => JSON.stringify(l)));
  const taken = new Set<number>();
  const distance = (a: Box, b: Box) => Math.hypot(a[0] + a[2] / 2 - (b[0] + b[2] / 2), a[1] + a[3] / 2 - (b[1] + b[3] / 2));
  const elements = Array.from(root.children) as HTMLElement[];
  if (elements.length !== slide.layers.length) {
    throw new Error(`[talk] slide ${slide.figmaId} drew ${elements.length} elements for ${slide.layers.length} layers`);
  }

  slide.layers.forEach((layer, i) => {
    const el = elements[i];
    const box = drawnBox(layer);
    if (box && (layer.kind === "image" || layer.kind === "video")) {
      // The nearest copy not yet claimed; once every copy is claimed, extra
      // copies grow out of the nearest one.
      let nearest = -1;
      let nearestFree = -1;
      before.forEach((b, k) => {
        if (b.src !== layer.src) return;
        if (nearest < 0 || distance(b.box, box) < distance(before[nearest].box, box)) nearest = k;
        if (!taken.has(k) && (nearestFree < 0 || distance(b.box, box) < distance(before[nearestFree].box, box))) nearestFree = k;
      });
      const source = nearestFree >= 0 ? nearestFree : nearest;
      if (source >= 0) {
        taken.add(source);
        const [ox, oy, ow, oh] = before[source].box;
        const [x, y, w, h] = box;
        if (ox === x && oy === y && ow === w && oh === h) return;
        el.animate(
          [
            { transformOrigin: "0 0", transform: `translate(${ox - x}px, ${oy - y}px) scale(${ow / w}, ${oh / h})` },
            { transformOrigin: "0 0", transform: "none" },
          ],
          { duration: GLIDE_MS, easing: GLIDE_EASE },
        );
        return;
      }
    }
    if (unchanged.has(JSON.stringify(layer))) return;
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 150, easing: "ease-out", fill: "backwards" });
  });
}

/** One slide drawn at its native 1920x1080; the parent scales it to fit. */
export function Slide({
  slide,
  mode,
  active,
  from = null,
  build = Infinity,
}: {
  slide: SlideData;
  mode: MediaMode;
  active: boolean;
  // The slide just left, when this one was reached by a single step.
  from?: SlideData | null;
  // How many builds are revealed; layers with a higher build stay hidden.
  // Left out, every layer shows (the overview, a slide already passed).
  build?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!active || !from || !root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    glideFrom(root, slide, from);
  }, [active, from, slide]);

  // Layers wait for their build. Set on the drawn elements rather than in
  // each layer's own style, so the glide above still lines elements up with
  // layers; a layer revealed by pressing next fades in.
  const shownBuild = useRef(build);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || buildCount(slide) === 0) return;
    const reveal = active && build > shownBuild.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    slide.layers.forEach((layer, i) => {
      const el = root.children[i] as HTMLElement | undefined;
      if (!el) throw new Error(`[talk] slide ${slide.figmaId} has no element for layer ${i}`);
      const at = layer.build ?? 0;
      el.style.visibility = at > build ? "hidden" : "";
      if (reveal && at > shownBuild.current && at <= build) {
        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: "ease-out" });
      }
    });
    shownBuild.current = build;
  }, [active, build, slide]);

  return (
    <div
      ref={ref}
      className="talk-slide"
      style={{
        position: "relative",
        width: SLIDE_W,
        height: SLIDE_H,
        overflow: "hidden",
        background: `#f5f5f5 url(${PAPER}) center / cover`,
        fontFamily: "'Vulf Sans', sans-serif",
      }}
    >
      {slide.layers.map((layer, i) => (
        <SlideLayer key={i} layer={layer} mode={mode} active={active} />
      ))}
    </div>
  );
}
