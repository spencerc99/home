// Copies the Play Together speaker notes from Spencer's Obsidian vault into
// the site (src/components/talk/play-together-notes.md), after checking that
// every slide in the deck has notes and every note belongs to a slide.
//
//   bun run talk-notes
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { perpetualPlayDeck as deck } from "../src/components/talk/perpetualPlayDeck";
import { parseSpeakerNotes, readNoteSections } from "../src/components/talk/speakerNotes";

const VAULT_NOTE = join(
  homedir(),
  "Library/Mobile Documents/iCloud~md~obsidian/Documents/obsidian-brain/projects/talks/ncm play together - speaker notes.md",
);
const SITE_NOTES = new URL("../src/components/talk/play-together-notes.md", import.meta.url);

const HEADER = `# Play Together · speaker notes

Copied from the Obsidian note "projects/talks/ncm play together - speaker notes"
by \`bun run talk-notes\`. Edit the notes there, not here: this file is replaced
each time the command runs.

`;

const note = readFileSync(VAULT_NOTE, "utf8");
const firstSlide = note.search(/^## /m);
if (firstSlide < 0) throw new Error(`No "## " slide headings in ${VAULT_NOTE}`);
const next = HEADER + note.slice(firstSlide).replace(/\s*$/, "\n");

const fresh = parseSpeakerNotes(next);
const missing = deck.filter((slide) => !fresh.has(slide.figmaId));
if (missing.length) {
  throw new Error(`The Obsidian note has no notes for slides ${missing.map((s) => s.figmaId).join(", ")}`);
}

// The copy on the site may still hold slides the deck has since dropped.
const old = readNoteSections(readFileSync(SITE_NOTES, "utf8"));
const changed = deck.flatMap((slide, i) => (old.get(slide.figmaId) === fresh.get(slide.figmaId) ? [] : [i + 1]));
writeFileSync(SITE_NOTES, next);
console.log(changed.length ? `Notes updated for slides ${changed.join(", ")}.` : "Notes already up to date.");
