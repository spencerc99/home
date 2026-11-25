// The edit mode's state: the edits being made, the picked layer, undo, and
// saving to deckEdits.json through the dev server. See DeckEditor.tsx.
import { useCallback, useMemo, useRef, useState } from "react";
import savedEdits from "./deckEdits.json";
import { SAVE_EDITS_URL, applyDeckEdits, type DeckEdits, type LayerEdit } from "./deckEdits";
import { uneditedDeck, type Slide } from "./perpetualPlayDeck";

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
