// The stage's edit mode, for small changes by hand on the local dev server:
// press e, click a box on the slide, drag it, drag its corner, or nudge it with
// the arrow keys; the panel on the right edits its numbers and its text. Each
// change is saved to deckEdits.json (see deckEdits.ts), which the deck lays
// over the slides written in perpetualPlayDeck.ts.
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import savedEdits from "./deckEdits.json";
import {
  SAVE_EDITS_URL,
  applyDeckEdits,
  editableBox,
  textPieces,
  type DeckEdits,
  type LayerEdit,
} from "./deckEdits";
import { uneditedDeck, type Box, type Layer, type Slide } from "./perpetualPlayDeck";

const EDITING_KEY = "talk:editing";
const SAVE_AFTER_MS = 500;

function savedEditing(): boolean {
  try {
    return sessionStorage.getItem(EDITING_KEY) === "on";
  } catch {
    return false;
  }
}

export type DeckEditor = ReturnType<typeof useDeckEditor>;

/** The edit mode's state. `allowed` is false outside the dev server, and then nothing here runs. */
export function useDeckEditor(allowed: boolean) {
  const [editing, setEditing] = useState(() => allowed && savedEditing());
  const [edits, setEdits] = useState<DeckEdits>(savedEdits as DeckEdits);
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState<"saved" | "saving" | { failed: string }>("saved");
  const history = useRef<DeckEdits[]>([]);
  const latest = useRef(edits);
  latest.current = edits;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const deck = useMemo(() => applyDeckEdits(uneditedDeck, edits), [edits]);

  const save = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setSaving("saving");
    try {
      const response = await fetch(SAVE_EDITS_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(latest.current),
      });
      if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
      setSaving("saved");
    } catch (error) {
      console.error("[talk] could not save deck edits", error);
      setSaving({ failed: String(error) });
    }
  }, []);

  const saveSoon = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(save, SAVE_AFTER_MS);
  }, [save]);

  /** Remembers the edits as they are now, so undo can come back to them. */
  const checkpoint = useCallback(() => {
    history.current.push(latest.current);
    if (history.current.length > 200) history.current.shift();
  }, []);

  /** Changes one layer of one slide; the change is saved shortly after. */
  const change = useCallback(
    (slide: Slide, index: number, patch: Partial<Omit<LayerEdit, "kind">>) => {
      const layer = slide.layers[index];
      setEdits((all) => {
        const forSlide = all[slide.figmaId] ?? {};
        const before = forSlide[String(index)] ?? { kind: layer.kind };
        return { ...all, [slide.figmaId]: { ...forSlide, [String(index)]: { ...before, ...patch, kind: layer.kind } } };
      });
      saveSoon();
    },
    [saveSoon],
  );

  const reset = useCallback(
    (slide: Slide, index: number) => {
      checkpoint();
      setEdits((all) => {
        const forSlide = { ...(all[slide.figmaId] ?? {}) };
        delete forSlide[String(index)];
        const next = { ...all, [slide.figmaId]: forSlide };
        if (Object.keys(forSlide).length === 0) delete next[slide.figmaId];
        return next;
      });
      saveSoon();
    },
    [checkpoint, saveSoon],
  );

  const undo = useCallback(() => {
    const previous = history.current.pop();
    if (!previous) return;
    setEdits(previous);
    saveSoon();
  }, [saveSoon]);

  const toggle = useCallback(() => {
    if (!allowed) return;
    setEditing((on) => {
      try {
        sessionStorage.setItem(EDITING_KEY, on ? "off" : "on");
      } catch (error) {
        console.warn("[talk] could not remember edit mode", error);
      }
      return !on;
    });
    setSelected(null);
    if (timer.current) void save();
  }, [allowed, save]);

  return { editing, deck, selected, select: setSelected, change, checkpoint, reset, undo, toggle, saving };
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

const round = (box: Box): Box => box.map((n) => Math.round(n)) as Box;

/**
 * The outlines over the slide, drawn in slide pixels inside the same scaled
 * frame as the slide. Only layers revealed at the current build are shown.
 */
export function EditOverlay({
  editor,
  slide,
  build,
  scale,
}: {
  editor: DeckEditor;
  slide: Slide;
  build: number;
  scale: number;
}) {
  const { selected, select, change, checkpoint, undo } = editor;
  const drag = useRef<{ index: number; resize: boolean; from: { x: number; y: number }; box: Box } | null>(null);

  // Arrow keys nudge the selected layer (shift: 10px), escape lets go of it,
  // cmd/ctrl+z undoes. With nothing selected, the arrows still change slides.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      if ((event.metaKey || event.ctrlKey) && event.key === "z") {
        event.preventDefault();
        event.stopPropagation();
        undo();
        return;
      }
      if (selected === null) return;
      if (event.key === "Escape") {
        event.stopPropagation();
        select(null);
        return;
      }
      const by = event.shiftKey ? 10 : 1;
      const move = { ArrowLeft: [-by, 0], ArrowRight: [by, 0], ArrowUp: [0, -by], ArrowDown: [0, by] }[event.key];
      const box = editableBox(slide.layers[selected]);
      if (!move || !box) return;
      event.preventDefault();
      event.stopPropagation();
      checkpoint();
      change(slide, selected, { box: [box[0] + move[0], box[1] + move[1], box[2], box[3]] });
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [change, checkpoint, select, selected, slide, undo]);

  const start = (event: ReactPointerEvent, index: number, resize: boolean) => {
    const box = editableBox(slide.layers[index]);
    if (!box) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    select(index);
    checkpoint();
    drag.current = { index, resize, from: { x: event.clientX, y: event.clientY }, box };
  };
  const moveTo = (event: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (event.clientX - d.from.x) / scale;
    const dy = (event.clientY - d.from.y) / scale;
    const [x, y, w, h] = d.box;
    let box: Box;
    if (!d.resize) box = [x + dx, y + dy, w, h];
    else if (event.shiftKey) {
      // Shift keeps the shape, for pictures.
      const k = Math.max((w + dx) / w, 0.05);
      box = [x, y, w * k, h * k];
    } else box = [x, y, Math.max(10, w + dx), Math.max(10, h + dy)];
    change(slide, d.index, { box: round(box) });
  };
  const end = () => {
    drag.current = null;
  };

  const handle = 18 / scale;
  return (
    <div className="talk-edit" onPointerDown={() => select(null)}>
      {slide.layers.map((layer, i) => {
        const box = editableBox(layer);
        if (!box || (layer.build ?? 0) > build) return null;
        const [x, y, w, h] = box;
        return (
          <div
            key={i}
            className="talk-edit__box"
            data-selected={selected === i || undefined}
            style={{ left: x, top: y, width: w, height: h, borderWidth: 2 / scale }}
            onPointerDown={(event) => start(event, i, false)}
            onPointerMove={moveTo}
            onPointerUp={end}
            onPointerCancel={end}
          >
            {selected === i && (
              <span
                className="talk-edit__handle"
                style={{ width: handle, height: handle, right: -handle / 2, bottom: -handle / 2 }}
                onPointerDown={(event) => start(event, i, true)}
                onPointerMove={moveTo}
                onPointerUp={end}
                onPointerCancel={end}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function describe(layer: Layer): string {
  if (layer.kind === "text") {
    const words = textPieces(layer).join(" ").replace(/\s+/g, " ").trim();
    return `text · ${words.slice(0, 28)}${words.length > 28 ? "…" : ""}`;
  }
  if (layer.kind === "image" || layer.kind === "video") return `${layer.kind} · ${layer.src.split("/").pop()}`;
  return layer.kind;
}

/** The panel on the right: the slide's layers, and the selected one's numbers and text. */
export function EditPanel({ editor, slide, slideNumber }: { editor: DeckEditor; slide: Slide; slideNumber: number }) {
  const { selected, select, change, checkpoint, reset, undo, toggle, saving } = editor;
  const layer = selected === null ? null : slide.layers[selected];
  const box = layer ? editableBox(layer) : null;
  const texts = layer ? textPieces(layer) : [];

  const setBox = (i: number, value: number) => {
    if (!box || selected === null || !Number.isFinite(value)) return;
    const next = [...box] as Box;
    next[i] = value;
    change(slide, selected, { box: next });
  };

  return (
    <aside className="talk-edit-panel" aria-label="Edit this slide">
      <header>
        <strong>Editing slide {slideNumber}</strong>
        <button type="button" onClick={toggle}>
          done (e)
        </button>
      </header>
      <p className="talk-edit-panel__status" role="status">
        {saving === "saved" ? "saved" : saving === "saving" ? "saving…" : `could not save: ${saving.failed}`}
      </p>

      <ol className="talk-edit-panel__layers">
        {slide.layers.map((l, i) =>
          editableBox(l) ? (
            <li key={i}>
              <button type="button" aria-pressed={selected === i} onClick={() => select(i)}>
                {describe(l)}
                {l.build ? ` · press ${l.build}` : ""}
              </button>
            </li>
          ) : null,
        )}
      </ol>

      {layer && box && selected !== null && (
        <div className="talk-edit-panel__layer">
          <div className="talk-edit-panel__numbers">
            {(["x", "y", "width", "height"] as const).map((name, i) => (
              <label key={name}>
                {name}
                <input
                  type="number"
                  value={box[i]}
                  onFocus={checkpoint}
                  onChange={(event) => setBox(i, Number(event.target.value))}
                />
              </label>
            ))}
            {layer.kind === "text" && (
              <label>
                text size
                <input
                  type="number"
                  value={layer.size}
                  onFocus={checkpoint}
                  onChange={(event) => {
                    const size = Number(event.target.value);
                    if (Number.isFinite(size) && size > 0) change(slide, selected, { size });
                  }}
                />
              </label>
            )}
          </div>
          {texts.map((text, i) => (
            <label key={i} className="talk-edit-panel__text">
              {texts.length > 1 ? `text ${i + 1}` : "text"}
              <textarea
                value={text}
                rows={Math.min(5, text.split("\n").length + 1)}
                onFocus={checkpoint}
                onChange={(event) => {
                  const next = [...texts];
                  next[i] = event.target.value;
                  change(slide, selected, { texts: next });
                }}
              />
            </label>
          ))}
          <div className="talk-edit-panel__actions">
            <button type="button" onClick={undo}>
              undo
            </button>
            <button type="button" onClick={() => reset(slide, selected)}>
              back to the original
            </button>
          </div>
        </div>
      )}

      <p className="talk-edit-panel__hint">
        Click a box to pick it. Drag to move, drag the corner to resize (shift keeps the shape). Arrow keys nudge 1px,
        shift 10px. Esc lets go. Cmd+Z undoes. With nothing picked, the arrows change slides.
      </p>
    </aside>
  );
}
