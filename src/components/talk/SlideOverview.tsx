import { useEffect, useRef, useState } from "react";
import type { Slide as SlideData } from "./perpetualPlayDeck";
import { Slide, SLIDE_W, SLIDE_H } from "./Slide";

// Every slide at once, like Figma's grid view: pick one to jump there. The
// slides where the audience does something carry a small orange mark.

const PAD = 40;
const GAP = 24;

function columnsFor(width: number): number {
  if (width >= 1600) return 6;
  if (width >= 1100) return 5;
  if (width >= 800) return 4;
  return 2;
}

function useTileLayout() {
  const measure = () => {
    const columns = columnsFor(window.innerWidth);
    const tileW = Math.floor((window.innerWidth - PAD * 2 - GAP * (columns - 1)) / columns);
    return { columns, tileW };
  };
  const [layout, setLayout] = useState(measure);
  useEffect(() => {
    const onResize = () => setLayout(measure());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return layout;
}

export function SlideOverview({
  deck,
  current,
  onPick,
  onClose,
}: {
  deck: readonly SlideData[];
  current: number;
  onPick: (index: number) => void;
  onClose: () => void;
}) {
  const { columns, tileW } = useTileLayout();
  const [cursor, setCursor] = useState(current);
  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;
  const tiles = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    tiles.current[cursor]?.focus({ preventScroll: true });
    tiles.current[cursor]?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  // The grid takes the keyboard while it is open, so the deck underneath
  // does not also change slides.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const moves: Record<string, number> = {
        ArrowRight: 1,
        ArrowLeft: -1,
        ArrowDown: columns,
        ArrowUp: -columns,
      };
      event.stopPropagation();
      if (event.key in moves) {
        event.preventDefault();
        setCursor((c) => Math.min(deck.length - 1, Math.max(0, c + moves[event.key])));
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onPick(cursorRef.current);
      } else if (event.key === "Escape" || event.key === "g") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [columns, deck.length, onClose, onPick]);

  const scale = tileW / SLIDE_W;
  const tileH = Math.round(SLIDE_H * scale);

  return (
    <div className="talk-overview" role="dialog" aria-label="All slides">
      <header className="talk-overview__bar">
        <span>{deck.length} slides</span>
        <span className="talk-overview__key">
          <span className="talk-overview__live-dot" /> audience joins in
        </span>
        <button type="button" onClick={onClose}>
          close <kbd>g</kbd>
        </button>
      </header>
      <ol
        className="talk-overview__grid"
        style={{ gridTemplateColumns: `repeat(${columns}, ${tileW}px)`, gap: GAP, padding: `0 ${PAD}px ${PAD}px` }}
      >
        {deck.map((slide, i) => (
          <li
            key={slide.figmaId}
            className="talk-overview__tile"
            aria-current={i === current ? "true" : undefined}
            data-cursor={i === cursor || undefined}
          >
            <span className="talk-overview__thumb" style={{ width: tileW, height: tileH }} aria-hidden="true">
              <span className="talk-overview__slide" style={{ transform: `scale(${scale})` }}>
                <Slide slide={slide} mode="still" active={false} />
              </span>
            </span>
            <span className="talk-overview__caption" aria-hidden="true">
              <span>{i + 1}</span>
              {slide.live && (
                <span className="talk-overview__live">
                  <span className="talk-overview__live-dot" />
                  {slide.live}
                </span>
              )}
            </span>
            {/* Laid over the preview rather than around it: some slides have
                their own buttons, which cannot sit inside another button. */}
            <button
              type="button"
              ref={(el) => {
                tiles.current[i] = el;
              }}
              className="talk-overview__pick"
              onClick={() => onPick(i)}
              onFocus={() => setCursor(i)}
              aria-label={`Slide ${i + 1}${slide.live ? `, audience: ${slide.live}` : ""}`}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
