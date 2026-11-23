// Speaker notes are written in Spencer's Obsidian vault and copied into
// play-together-notes.md with `bun run talk-notes`. Each slide is a `## `
// heading, then an `<!-- figma id -->` line that ties it to its slide in the
// deck, then the notes themselves.
import { perpetualPlayDeck as deck } from "./perpetualPlayDeck";

const FILE = "play-together-notes.md";

/** Slide id to notes text. Throws on a heading without an id or an id used twice. */
export function parseSpeakerNotes(markdown: string): Map<string, string> {
  const notes = new Map<string, string>();
  // [intro, heading, body, heading, body, ...]
  const parts = markdown.split(/^(## .*)$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i];
    const match = parts[i + 1].match(/^\s*<!--\s*(\S+)\s*-->[^\S\n]*\n?/);
    if (!match) throw new Error(`[talk] "${heading}" in ${FILE} has no <!-- slide id --> line under it`);
    const id = match[1];
    if (notes.has(id)) throw new Error(`[talk] slide ${id} has notes twice in ${FILE}`);
    notes.set(id, parts[i + 1].slice(match[0].length).replace(/^\n+|\s+$/g, ""));
  }
  for (const id of notes.keys()) {
    if (!deck.some((slide) => slide.figmaId === id)) {
      throw new Error(`[talk] ${FILE} has notes for slide ${id}, which is not in the deck`);
    }
  }
  return notes;
}

