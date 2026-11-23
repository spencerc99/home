import { Fragment, useEffect, useState, type ReactNode } from "react";
import { perpetualPlayDeck as deck } from "./perpetualPlayDeck";
import { Slide } from "./Slide";
import { speakerNotes } from "./speakerNotes";
import { useFitScale } from "./useFitScale";
import { useDeckChannel, type DeckMessage, type DeckState } from "./deckSync";
import "./talk.scss";

/** The notes use **bold** and *italic*; nothing else needs parsing. */
function renderNotes(text: string): ReactNode {
  // Blank lines between paragraphs in the notes file are not paragraphs themselves.
  return text.split(/\n+/).map((line, i) => (
    <p key={i}>
      {line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).map((part, j) => {
        if (part.startsWith("**")) return <strong key={j}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.length > 1) return <em key={j}>{part.slice(1, -1)}</em>;
        return <Fragment key={j}>{part}</Fragment>;
      })}
    </p>
  ));
}

function Thumb({ index }: { index: number }) {
  const { ref, scale } = useFitScale<HTMLDivElement>();
  return (
    <div className="talk-thumb" ref={ref}>
      {scale > 0 && index < deck.length && (
        <div className="talk-stage__slide" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
          <Slide slide={deck[index]} mode="still" active={false} />
        </div>
      )}
      {index >= deck.length && <span className="talk-thumb__end">end</span>}
    </div>
  );
}

function useClock(startedAt: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const time = new Date(now).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
  if (startedAt === null) return { time, elapsed: "0:00" };
  const seconds = Math.floor((now - startedAt) / 1000);
  return { time, elapsed: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` };
}

export function DeckNotes() {
  const [state, setState] = useState<DeckState | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const { time, elapsed } = useClock(startedAt);

  const send = useDeckChannel((message: DeckMessage) => {
    if (message.type === "state") setState(message.state);
  });

  useEffect(() => {
    send({ type: "hello" });
    // Ask once on open; the stage broadcasts every change after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        send({ type: "step", by: 1 });
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
        event.preventDefault();
        send({ type: "step", by: -1 });
      } else if ((event.key === "k" || event.key === "p") && state) {
        send({ type: "set-playing", playing: !state.playing });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [send, state]);

  if (!state) {
    return (
      <div className="talk-notes talk-notes--waiting">
        <p>Open the deck at /talk/stage in this browser, then press n there.</p>
      </div>
    );
  }

  const slide = deck[state.index];
  const slideNotes = speakerNotes.get(slide.figmaId);
  if (slideNotes === undefined) {
    throw new Error(`No speaker notes for slide ${slide.figmaId}; add a section for it to play-together-notes.md`);
  }
  const hasVideo = slide.layers.some((l) => l.kind === "video");

  return (
    <div className="talk-notes">
      <header className="talk-notes__bar">
        <span>
          {state.index + 1} / {deck.length}
        </span>
        <span className="talk-notes__clock">{time}</span>
        <button type="button" onClick={() => setStartedAt(startedAt === null ? Date.now() : null)}>
          {startedAt === null ? "start timer" : elapsed}
        </button>
      </header>
      <div className="talk-notes__body">
        <div className="talk-notes__slides">
          <Thumb index={state.index} />
          <div className="talk-notes__next">
            <span>{state.index + 1 < deck.length ? `next · ${state.index + 2}` : "next"}</span>
            <Thumb index={state.index + 1} />
          </div>
        </div>
        <article className="talk-notes__text">{renderNotes(slideNotes)}</article>
      </div>
      <footer className="talk-notes__controls">
        <button type="button" onClick={() => send({ type: "step", by: -1 })}>
          ← back
        </button>
        {hasVideo && (
          <button type="button" onClick={() => send({ type: "set-playing", playing: !state.playing })}>
            {state.playing ? "❙❙ pause video" : "▸ play video"}
          </button>
        )}
        <button type="button" className="talk-notes__forward" onClick={() => send({ type: "step", by: 1 })}>
          next →
        </button>
      </footer>
    </div>
  );
}
