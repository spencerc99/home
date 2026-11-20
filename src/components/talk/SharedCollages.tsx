import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { SHARED_COLLAGES, collageViewerUrl, type SharedCollage } from "./pinnedCollages";

// The wewere.online/collages/ gallery, pinned up on the slide: each collage on
// its mat over a detail card washed with blots of its own colours. The styles
// and the wash follow extension/website/collages/ in the playhtml repo.

const CARD_W = 320;
const GAP_X = 48;
const GAP_Y = 64;
// The board is centred on the slide and scaled to this width, which keeps it
// clear of the byline (top left) and the label (bottom left).
const FIT_W = 1780;
const ARRIVE_STAGGER_MS = 70;

/** Small, steady tilts, so the cards look laid down by hand. */
const CARD_TILTS = [1.5, -1, 2, -1.5, 1, -2];

const coverSrc = (id: string) => `/talk/perpetual-play/collages/${id}.webp`;

function madeOn(timestamp: number): string {
  return new Date(timestamp)
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toLowerCase();
}

function countOf(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** The studio's paper grain, the same two turbulence passes the gallery uses. */
const GRAIN = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <defs>
    <filter id="g-noise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 2 -1"/></filter>
    <filter id="g-grain"><feTurbulence type="turbulence" baseFrequency="0.5" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="discrete" tableValues="0 0.2 0.3 0.4"/></feComponentTransfer></filter>
  </defs>
  <rect width="100%" height="100%" filter="url(#g-noise)" opacity="0.7"/>
  <rect width="100%" height="100%" filter="url(#g-grain)" opacity="0.21"/>
</svg>`)}`;

/** A steady pseudo-random sequence, so a collage's wash keeps its shape. */
function seeded(text: string): () => number {
  let state = 0;
  for (const char of text) state = (state * 31 + char.charCodeAt(0)) | 0;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

const BLOTS = [
  { x: -12, y: -40, w: 70, h: 150, blur: 22, opacity: 0.42 },
  { x: 48, y: 10, w: 55, h: 120, blur: 26, opacity: 0.38 },
  { x: 22, y: 55, w: 40, h: 80, blur: 20, opacity: 0.3 },
];

function cardWash(id: string, colors: readonly string[]): CSSProperties[] {
  const random = seeded(id);
  const corner = () => `${Math.round(34 + random() * 32)}%`;
  return colors.slice(0, BLOTS.length).map((color, i) => {
    const blot = BLOTS[i];
    return {
      left: `${blot.x}%`,
      top: `${blot.y}%`,
      width: `${blot.w}%`,
      height: `${blot.h}%`,
      background: color,
      borderRadius: `${corner()} ${corner()} ${corner()} ${corner()} / ${corner()} ${corner()} ${corner()} ${corner()}`,
      filter: `blur(${blot.blur}px)`,
      opacity: blot.opacity,
      transform: `rotate(${Math.round((random() - 0.5) * 60)}deg)`,
    };
  });
}

/** The cover's few loud colours, strongest first (coverPalette.ts in the gallery). */
function coverColors(image: HTMLImageElement): string[] {
  const side = 48;
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("[talk] no 2d canvas to read collage colours");
  context.drawImage(image, 0, 0, side, side);
  const pixels = context.getImageData(0, 0, side, side).data;
  const buckets = new Map<number, { r: number; g: number; b: number; n: number; weight: number }>();
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3] < 200) continue;
    const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
    const vividness = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    if (vividness < 0.2) continue;
    const key = (Math.floor(r / 16) << 8) | (Math.floor(g / 16) << 4) | Math.floor(b / 16);
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0, weight: 0 };
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.n += 1;
    bucket.weight += vividness * vividness;
    buckets.set(key, bucket);
  }
  const ranked = [...buckets.values()]
    .map((b) => ({ r: Math.round(b.r / b.n), g: Math.round(b.g / b.n), b: Math.round(b.b / b.n), weight: b.weight }))
    .sort((a, b) => b.weight - a.weight);
  const picked: typeof ranked = [];
  for (const color of ranked) {
    if (picked.every((o) => Math.abs(o.r - color.r) + Math.abs(o.g - color.g) + Math.abs(o.b - color.b) > 90)) {
      picked.push(color);
    }
    if (picked.length === 3) break;
  }
  return picked.map(({ r, g, b }) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`);
}

function PinnedCard({ collage, at, onOpen }: { collage: SharedCollage; at: number; onOpen: () => void }) {
  const [colors, setColors] = useState<string[]>([]);
  const title = collage.title.trim() || "untitled";
  // A collage with no loud colour of its own takes its maker's.
  const wash = useMemo(
    () => cardWash(collage.id, colors.length > 0 ? colors : [collage.by.color]),
    [collage.id, colors, collage.by.color],
  );
  return (
    <button
      type="button"
      className="talk-pin"
      style={{ animationDelay: `${at * ARRIVE_STAGGER_MS}ms` }}
      onClick={onOpen}
      aria-label={`Open ${title}, a collage by ${collage.by.name}`}
    >
      <div className="talk-pin__mat">
        <div className="talk-pin__window" style={{ aspectRatio: `${collage.frame.width} / ${collage.frame.height}` }}>
          <img
            className="talk-pin__cover"
            src={coverSrc(collage.id)}
            alt=""
            draggable={false}
            onLoad={(event) => setColors(coverColors(event.currentTarget))}
          />
        </div>
        <div className="talk-pin__caption">
          <span className="talk-pin__title">{title}</span>
        </div>
      </div>
      <div className="talk-pin__card" style={{ transform: `rotate(${CARD_TILTS[at % CARD_TILTS.length]}deg)` }}>
        {wash.map((style, i) => (
          <span key={i} className="talk-pin__blot" style={style} />
        ))}
        <div className="talk-pin__byline">
          <span className="talk-pin__name" style={{ backgroundColor: collage.by.color }}>
            {collage.by.name}
          </span>
          <span className="talk-pin__date">{madeOn(collage.createdAt)}</span>
        </div>
        <span className="talk-pin__meta">
          {countOf(collage.pieces, "scrap", "scraps")} from {countOf(collage.sites, "site", "sites")}
        </span>
      </div>
    </button>
  );
}

/** The real collage viewer, over the deck, so its provenance can be explored. */
function CollageViewer({ collage, onClose }: { collage: SharedCollage; onClose: () => void }) {
  useEffect(() => {
    // Capture runs before the deck's own key handler on window, so arrows and
    // space stay inside the viewer instead of changing slides.
    const onKey = (event: KeyboardEvent) => {
      event.stopImmediatePropagation();
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [onClose]);

  const url = collageViewerUrl(collage.id);
  return createPortal(
    <div className="talk-viewer" role="dialog" aria-label={`${collage.title || "untitled"}, a collage`} onClick={onClose}>
      <div className="talk-viewer__frame" onClick={(event) => event.stopPropagation()}>
        <div className="talk-viewer__bar">
          <span>
            {collage.title.trim() || "untitled"} · {collage.by.name}
          </span>
          <span className="talk-viewer__actions">
            <a href={url} target="_blank" rel="noopener">
              open ↗
            </a>
            <button type="button" onClick={onClose} aria-label="Close">
              ×
            </button>
          </span>
        </div>
        <iframe src={url} title={`${collage.title || "untitled"}, a collage`} />
      </div>
    </div>,
    document.body,
  );
}

/** Shared collages pinned up like the wewere.online gallery; click one to open it. */
export function SharedCollages({ active }: { active: boolean }) {
  const [open, setOpen] = useState<SharedCollage | null>(null);

  useEffect(() => {
    if (!active) setOpen(null);
  }, [active]);

  const columns = SHARED_COLLAGES.length <= 8 ? 4 : 6;
  const boardW = columns * CARD_W + (columns - 1) * GAP_X;
  const scale = Math.min(1, FIT_W / boardW);

  return (
    <>
      <div
        // Remounts each time the slide comes up, so the cards arrive again.
        key={active ? "shown" : "waiting"}
        className="talk-pins"
        data-arrive={active || undefined}
        style={
          {
            left: 960,
            top: 540,
            width: boardW,
            transformOrigin: "0 0",
            gridTemplateColumns: `repeat(${columns}, ${CARD_W}px)`,
            columnGap: GAP_X,
            rowGap: GAP_Y,
            transform: `scale(${scale}) translate(-50%, -50%)`,
            "--paper-grain": `url("${GRAIN}")`,
          } as CSSProperties
        }
      >
        {SHARED_COLLAGES.map((collage, at) => (
          <PinnedCard key={collage.id} collage={collage} at={at} onOpen={() => setOpen(collage)} />
        ))}
      </div>
      {open && <CollageViewer collage={open} onClose={() => setOpen(null)} />}
    </>
  );
}
