import { useCallback, useEffect, useRef, useState } from "react";
import { buildCount, perpetualPlayDeck as deck } from "./perpetualPlayDeck";
import { Slide, type MediaMode } from "./Slide";
import { SlideOverview } from "./SlideOverview";
import { useFitScale, type FitMode } from "./useFitScale";
import {
  recallSlide,
  rememberSlide,
  slideFromHash,
  useDeckChannel,
  writeSlideToHash,
  type DeckMessage,
} from "./deckSync";
import { LiveBoundary } from "./live/LiveBoundary";
import { LiveLayer } from "./live/LiveLayer";
import { joinTalkRoom } from "./live/talkRoom";
import "./talk.scss";

const LAST = deck.length - 1;
const FIT_KEY = "talk:fit";
const clamp = (n: number) => Math.min(LAST, Math.max(0, n));

/** Which slide is up, and how many of its builds are revealed. */
type Position = { index: number; build: number };

/**
 * One press of next or back. Next reveals the slide's next build before
 * moving on; back hides the last build, or returns to the slide before fully
 * built, the way Figma and Keynote do.
 */
function stepFrom({ index, build }: Position, by: 1 | -1): Position {
  if (by === 1) {
    if (build < buildCount(deck[index])) return { index, build: build + 1 };
    return index < LAST ? { index: index + 1, build: 0 } : { index, build };
  }
  if (build > 0) return { index, build: build - 1 };
  return index > 0 ? { index: index - 1, build: buildCount(deck[index - 1]) } : { index, build };
}

function linkFor(index: number): string | null {
  for (const layer of deck[index].layers) {
    if (layer.kind === "label" && layer.link) return `https://${layer.link}`;
  }
  return null;
}

// Small line icons for the control bar, drawn in the text colour.
const icon = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.4, "aria-hidden": true } as const;

/** A dot sending out waves: phones follow this screen. */
function LiveIcon() {
  return (
    <svg {...icon} strokeLinecap="round">
      <circle cx="8" cy="8" r="1.8" fill="currentColor" stroke="none" />
      <path d="M5.2 5.2a4 4 0 0 0 0 5.6M10.8 5.2a4 4 0 0 1 0 5.6M3 3a7 7 0 0 0 0 10M13 3a7 7 0 0 1 0 10" />
    </svg>
  );
}

/** A page with lines: the speaker notes window. */
function NotesIcon() {
  return (
    <svg {...icon} strokeLinecap="round">
      <rect x="3" y="2" width="10" height="12" rx="1.2" />
      <path d="M5.6 5.5h4.8M5.6 8h4.8M5.6 10.5h3" />
    </svg>
  );
}

/** Four tiles: every slide at once. */
function GridIcon() {
  return (
    <svg {...icon}>
      <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="0.6" />
      <rect x="9" y="2.5" width="4.5" height="4.5" rx="0.6" />
      <rect x="2.5" y="9" width="4.5" height="4.5" rx="0.6" />
      <rect x="9" y="9" width="4.5" height="4.5" rx="0.6" />
    </svg>
  );
}

export function DeckStage() {
  const [position, setPosition] = useState<Position>(() => ({
    index: slideFromHash(deck.length) ?? recallSlide(deck.length) ?? 0,
    build: 0,
  }));
  const { index, build } = position;
  const step = useCallback((by: 1 | -1) => setPosition((p) => stepFrom(p, by)), []);
  const [playing, setPlaying] = useState(true);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [typed, setTyped] = useState("");
  const [overview, setOverview] = useState(false);
  // Live audience: the room connects in the background and the deck never
  // waits on it. Phones only follow this stage once `presenting` is on (l).
  const [roomReady, setRoomReady] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [fit, setFit] = useState<FitMode>(() => {
    try {
      return localStorage.getItem(FIT_KEY) === "fill" ? "fill" : "fit";
    } catch {
      return "fit";
    }
  });
  const { ref, scale } = useFitScale<HTMLDivElement>(fit);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  // The slide shown before this render, so a single step can glide shared
  // pictures across (see Slide). Updated after each change has been drawn.
  const shownIndex = useRef(index);
  const cameFrom = Math.abs(shownIndex.current - index) === 1 ? deck[shownIndex.current] : null;
  useEffect(() => {
    shownIndex.current = index;
  }, [index]);

  const goto = useCallback((n: number) => {
    setPosition({ index: clamp(n), build: 0 });
    setPlaying(true);
  }, []);

  const pickFromOverview = useCallback(
    (n: number) => {
      goto(n);
      setOverview(false);
    },
    [goto],
  );
  const closeOverview = useCallback(() => setOverview(false), []);

  // The slide before and after are always drawn. Start fetching the pictures
  // two and three ahead too, so on a slow connection they are ready by the
  // time a glide or a cut reaches them.
  useEffect(() => {
    for (const ahead of [index + 2, index + 3]) {
      for (const layer of deck[ahead]?.layers ?? []) {
        if (layer.kind === "image") new Image().src = layer.src;
      }
    }
  }, [index]);

  const send = useDeckChannel((message: DeckMessage) => {
    if (message.type === "goto") goto(message.index);
    if (message.type === "step") step(message.by);
    if (message.type === "set-playing") setPlaying(message.playing);
    if (message.type === "hello") send({ type: "state", state: { index, playing } });
  });

  useEffect(() => {
    writeSlideToHash(index);
    rememberSlide(index);
    send({ type: "state", state: { index, playing } });
    // send is rebuilt every render; only a state change should broadcast.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, playing]);

  // Coming back to the tab (browser back, or a hash typed in the address bar).
  useEffect(() => {
    const onHash = () => {
      const fromHash = slideFromHash(deck.length);
      if (fromHash !== null) setPosition((p) => (p.index === fromHash ? p : { index: fromHash, build: 0 }));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const toggleFit = useCallback(() => {
    setFit((current) => {
      const next: FitMode = current === "fit" ? "fill" : "fit";
      try {
        localStorage.setItem(FIT_KEY, next);
      } catch (error) {
        console.warn("[talk] could not remember the fit setting", error);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    joinTalkRoom().then(
      () => setRoomReady(true),
      (error: unknown) => console.error("[talk] the live room did not connect; the deck runs without it", error),
    );
  }, []);

  const showChrome = useCallback(() => {
    setChromeVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setChromeVisible(false), 2200);
  }, []);

  const openNotes = useCallback(() => {
    const notes = window.open("/talk/notes", "perpetual-play-notes", "popup,width=1280,height=800");
    if (!notes) console.warn("[talk] the notes window was blocked; allow pop-ups for this site");
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch((error: unknown) => {
        console.warn("[talk] fullscreen was refused", error);
      });
    }
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key;
      if (/^\d$/.test(key)) {
        setTyped((t) => (t + key).slice(-2));
        return;
      }
      if (key === "Enter" && typed) {
        goto(Number(typed) - 1);
        setTyped("");
        return;
      }
      setTyped("");
      // Keys follow Figma's presenter: space and Enter go forward, shift
      // goes back, R restarts from the first slide, Z switches fit and fill.
      const back = event.shiftKey && (key === " " || key === "Enter");
      if (!back && ["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(key)) {
        event.preventDefault();
        step(1);
      } else if (back || ["ArrowLeft", "ArrowUp", "PageUp"].includes(key)) {
        event.preventDefault();
        step(-1);
      } else if (key === "Home" || key === "r" || key === "R") goto(0);
      else if (key === "End") goto(LAST);
      else if (key === "k" || key === "p") setPlaying((p) => !p);
      else if (key === "n") openNotes();
      else if (key === "f") toggleFullscreen();
      else if (key === "z" || key === "Z") toggleFit();
      else if (key === "l") setPresenting((p) => !p);
      else if (key === "j") setJoinOpen((open) => !open);
      else if (key === "g") setOverview(true);
      else if (key === "o") {
        const link = linkFor(index);
        if (link) window.open(link, "_blank", "noopener");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goto, index, openNotes, step, toggleFit, toggleFullscreen, typed]);

  const hasVideo = deck[index].layers.some((l) => l.kind === "video");
  const link = linkFor(index);

  return (
    <div className="talk-stage" data-chrome={chromeVisible || undefined} onPointerMove={showChrome}>
      <div className="talk-stage__frame" ref={ref}>
        {scale > 0 &&
          deck.map((slide, i) => {
            if (Math.abs(i - index) > 1) return null;
            const mode: MediaMode = i === index ? (playing ? "play" : "pause") : i === index + 1 ? "ready" : "still";
            return (
              <div
                key={slide.figmaId}
                className="talk-stage__slide"
                aria-hidden={i !== index}
                style={{
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  visibility: i === index ? "visible" : "hidden",
                }}
              >
                <Slide
                  slide={slide}
                  mode={mode}
                  active={i === index}
                  from={i === index ? cameFrom : null}
                  build={i === index ? build : i > index ? 0 : undefined}
                />

              </div>
            );
          })}
        {scale > 0 && (
          // The audience layer sits over whichever slide is up, in its own
          // frame, so it stays mounted (and keeps its room state) across slides.
          <div
            className="talk-stage__slide talk-stage__live"
            style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
          >
            <LiveBoundary>
              <LiveLayer
                ready={roomReady}
                slide={index}
                build={build}
                moment={deck[index].live ?? null}
                fridgeDoor={deck[index].fridgeDoor !== undefined && build >= deck[index].fridgeDoor}
                joinShown={deck[index].joinAt !== undefined && build >= deck[index].joinAt}
                presenting={presenting}
                joinOpen={joinOpen}
              />
            </LiveBoundary>
          </div>
        )}
      </div>

      <nav className="talk-chrome" aria-label="Slide controls">
        <button type="button" onClick={() => step(-1)} aria-label="Previous slide">
          ←
        </button>
        <span className="talk-chrome__count">
          {typed ? `go to ${typed}` : `${index + 1} / ${deck.length}`}
        </span>
        <button type="button" onClick={() => step(1)} aria-label="Next slide">
          →
        </button>
        {hasVideo && (
          <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause video" : "Play video"}>
            {playing ? "❙❙" : "▸"}
          </button>
        )}
        {link && (
          <a href={link} target="_blank" rel="noopener">
            {link.replace("https://", "")} ↗
          </a>
        )}
        <button
          type="button"
          className="talk-chrome__live"
          aria-pressed={presenting}
          onClick={() => setPresenting((p) => !p)}
          aria-label={presenting ? "Live: phones follow this screen" : "Go live"}
          title={`${presenting ? "Live" : "Go live"}: phones follow this screen (l). j shows the join card over any slide.`}
        >
          <LiveIcon />
        </button>
        <button type="button" onClick={openNotes} aria-label="Speaker notes" title="Speaker notes (n)">
          <NotesIcon />
        </button>
        <button type="button" onClick={() => setOverview(true)} aria-label="All slides" title="All slides (g)">
          <GridIcon />
        </button>
        <button type="button" onClick={toggleFullscreen} aria-label="Full screen" title="Full screen (f). z switches fit and fill.">
          ⛶
        </button>
      </nav>
      {overview && <SlideOverview deck={deck} current={index} onPick={pickFromOverview} onClose={closeOverview} />}
    </div>
  );
}
