// Changes made by hand in the stage's edit mode (press e on the local dev
// server), kept apart from the slides written in perpetualPlayDeck.ts and laid
// over them when the deck loads. Each change is keyed by slide (its Figma id)
// and by the layer's position in that slide's list.
import type { Box, Layer, Slide } from "./perpetualPlayDeck";

export type LayerEdit = {
  // The layer's kind when it was edited. If the slide's layers have since
  // been reordered, the kinds stop matching and loading the deck fails loudly
  // rather than moving the wrong thing.
  kind: Layer["kind"];
  box?: Box;
  size?: number;
  // Every piece of text in the layer, in order: its runs, then each list
  // item's runs, then the runs after the list.
  texts?: string[];
};

export type DeckEdits = Record<string, Record<string, LayerEdit>>;

/** Layers that have a box to move. */
export function editableBox(layer: Layer): Box | null {
  return "box" in layer ? layer.box : null;
}

/** Every piece of text in a text layer, in the order `texts` uses. */
export function textPieces(layer: Layer): string[] {
  if (layer.kind !== "text") return [];
  return [
    ...layer.runs.map((r) => r.text),
    ...(layer.list?.items.flatMap((item) => item.map((r) => r.text)) ?? []),
    ...(layer.after?.map((r) => r.text) ?? []),
  ];
}

function withTexts(layer: Extract<Layer, { kind: "text" }>, texts: string[], where: string): typeof layer {
  const expected = textPieces(layer).length;
  if (texts.length !== expected) {
    throw new Error(`[talk] deckEdits.json: ${where} has ${texts.length} pieces of text, the slide has ${expected}`);
  }
  let i = 0;
  const take = <R extends { text: string }>(run: R): R => ({ ...run, text: texts[i++] });
  return {
    ...layer,
    runs: layer.runs.map(take),
    list: layer.list && { ...layer.list, items: layer.list.items.map((item) => item.map(take)) },
    after: layer.after?.map(take),
  };
}

export function applyLayerEdit(layer: Layer, edit: LayerEdit, where: string): Layer {
  if (edit.kind !== layer.kind) {
    throw new Error(
      `[talk] deckEdits.json: ${where} was a ${edit.kind} when it was edited and is now a ${layer.kind}; the slide's layers moved, so fix or remove that edit`,
    );
  }
  let next: Layer = layer;
  if (edit.box) {
    if (!("box" in next)) throw new Error(`[talk] deckEdits.json: ${where} has no box to move`);
    next = { ...next, box: edit.box } as Layer;
  }
  if (next.kind === "text") {
    if (edit.size !== undefined) next = { ...next, size: edit.size };
    if (edit.texts) next = withTexts(next as Extract<Layer, { kind: "text" }>, edit.texts, where);
  }
  return next;
}

/** The slides with the hand edits laid over them. */
export function applyDeckEdits(slides: readonly Slide[], edits: DeckEdits): Slide[] {
  const ids = new Set(slides.map((s) => s.figmaId));
  for (const id of Object.keys(edits)) {
    if (!ids.has(id)) throw new Error(`[talk] deckEdits.json has edits for slide ${id}, which is no longer in the deck`);
  }
  return slides.map((slide) => {
    const forSlide = edits[slide.figmaId];
    if (!forSlide) return slide;
    for (const key of Object.keys(forSlide)) {
      if (!slide.layers[Number(key)]) {
        throw new Error(`[talk] deckEdits.json: slide ${slide.figmaId} has no layer ${key}`);
      }
    }
    return {
      ...slide,
      layers: slide.layers.map((layer, i) => {
        const edit = forSlide[String(i)];
        return edit ? applyLayerEdit(layer, edit, `slide ${slide.figmaId} layer ${i}`) : layer;
      }),
    };
  });
}

/** Where the dev server saves the edits file. Not served in production. */
export const SAVE_EDITS_URL = "/__talk/deck-edits";
