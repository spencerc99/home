# Perpetual Play talk deck on spencer.place (2026-11-17 / 18)

## What exists

- `/talk/stage`: the deck, 39 slides rebuilt from the Figma Slides file
  `figma.com/slides/62ReIh8pxnGuvcIZKviB9U` (visible slides up to the QR
  "Thank you" slide; hidden slides and the ones after it are left out). Figma
  has two "dead internet theory" slides in a row (2059:434 and 2176:43); only
  the newer 2176:43 is kept.
- `/talk/notes`: speaker notes window. Opens from the deck (`n`), stays in sync
  through a `BroadcastChannel`, and can drive the deck (← →, play/pause).
- Both pages use `src/layouts/TalkLayout.astro`, a bare layout with no site
  header, chat, cursors or `PlayhtmlProvider`. They are `noindex` and left out
  of the sitemap.

## How the deck is built

- `src/components/talk/perpetualPlayDeck.ts` is the deck: one entry per slide,
  keyed by its Figma node id, with layers listed bottom to top (Figma order).
  Boxes are Figma canvas pixels on a 1920x1080 slide.
- `Slide.tsx` draws one slide at 1920x1080; the stage scales it to fit.
- The talk is titled "Play Together" (for NCM); slides 3 and 39 and the page
  titles say so. File and folder names keep "perpetual-play".
- Figma Slides has no transitions set, so the deck does its own: when one
  step leads to a slide that shares a picture or video with the last one, each
  shared picture glides from its old box to its new one, extra copies grow out
  of the nearest copy (one browser window becoming ten), and anything new fades
  in (`glideFrom` in `Slide.tsx`). Slides sharing nothing still cut.
- Only the current slide and its neighbours are mounted. The current slide's
  videos play; the next slide's videos buffer (`preload="auto"`) so they start
  instantly; the rest load first frames only.
- The current slide is written to the address (`#12`) and to localStorage, so
  leaving for another site and pressing back, or reloading, lands on the same
  slide. Opening `/talk/stage` with no hash resumes the last slide viewed; press
  Home to start over.
- Keys follow Figma's presenter: ← → space Enter PageUp/PageDown (clickers),
  shift+space or shift+Enter to go back, `r` (or Home) restarts at slide 1,
  number + Enter to jump, `z` switches fit (whole slide, letterboxed) and fill
  (zoomed to cover the screen, edges cropped; remembered in localStorage), `k`
  play/pause, `n` notes, `f` full screen, `o` open the slide's link.
- The notes window follows the "Script" design from the canvas: words
  biggest, current and next slide on the left, wall clock and timer on top.
- Speaker notes come from Figma's `speakerNotes` and live in
  `perpetualPlayNotes.json`, keyed by slide id. A slide without an entry throws.

## Assets

- Images: `public/talk/perpetual-play/img/<figma-node-id>.webp`, exported
  from Figma at 2x (scale 2 PNG, then `cwebp -q 88`) so they stay sharp on
  retina screens. 2070-537 and 2070-579 stay 1x: their original uploads in
  Figma are no bigger.
- Videos: R2 bucket `assets-spencerchang-me`, path
  `talks/perpetual-play/video/*.mp4`, re-encoded from the source files in
  `~/Documents/art:research/...` (Figma Slides cannot export video fills).
  About 98 MB together, too big for the site bundle. The deck reads them from
  the bucket's r2.dev address (`VID` in `perpetualPlayDeck.ts`); switch it to
  `https://assets.spencerchang.me/talks/perpetual-play/video` once that domain
  points at the bucket. Upload with
  `wrangler r2 object put assets-spencerchang-me/talks/perpetual-play/video/<name>.mp4 --file <name>.mp4 --content-type video/mp4 --remote`.
- Shared collages (slide 33): drawn like the wewere.online/collages/ gallery
  (mat, washed card, maker tag; styles from
  `extension/website/collages/galleryStyles.ts` in the playhtml repo). The list
  and each card's text live in `src/components/talk/pinnedCollages.ts`, copied
  from each share's collage.json (`api.wewere.online/collages/<id>`); covers
  are copied from `assets.wewere.online/collages/<id>/cover` into
  `public/talk/perpetual-play/collages/` so the slide works without wifi. Up
  to 8 sit in 4 columns, up to 12 in 6. The 12 are picked from all 28 shares in
  the `wwo-published-collages` R2 bucket for range of makers (a test share,
  near-empty ones and unsigned ones from unknown makers left out). Clicking one opens the real viewer
  (wewere.online/collage/?id=...) in an iframe over the deck; that part needs
  the internet. Esc closes it.
- Slide 15: the playhtml docs screenshot was replaced with a capture of
  playhtml.fun/gallery/.

## Re-syncing from Figma: gotchas

- `download_assets` `export` renders are cropped to the slide edges, so an image
  that hangs off the slide is drawn at its visible part (`clipToSlide`).
- The same export flattens cut-out PNGs onto `#f5f5f5`. Find these by scanning
  exports for large areas of exactly that gray, and use the node's raw image
  instead (`cover: true`). Two were affected: the phone (2070:537) and the
  network drawing (2070:579).
- `get_metadata` and `export_video` do not support Slides files; `use_figma`
  with `figma.getSlideGrid()` does, read-only.
- Text marked `WIDTH_AND_HEIGHT` in Figma is auto-width: render it `nowrap`.

## Live audience (started 2026-11-19)

- Phones open `spencer.place/talk` (`src/pages/talk/index.astro`,
  `live/PhoneApp.tsx`): join, pick a color (6 presets or a hue slider; no
  name, since the keepsake card no longer shows one), then the phone follows
  the stage. The color is kept in localStorage only, not written to the
  playhtml identity, so it does not change anyone's cursor color elsewhere on
  spencer.place.
- Stage and phones share one playhtml room per event,
  `talk-play-together-<event>` (`live/talkRoom.ts`). The event defaults to
  `ncm-2026`; rehearse with `?event=rehearsal` on both pages so practice loops
  never land in the real talk. playhtml prefixes rooms with the hostname, so
  the stage and the phones must use the same host.
- Presence (live only): `talk-stage` from the presenting stage (slide, live
  moment, join card open), `talk-audience` from each phone (color, finger).
  Fingers are sent at most 5 times a second; the stage eases between them.
- Saved data: `talk-title-loops`, one entry per loop keyed `<person>:<n>`,
  written once when the finger lifts, thinned to 160 points, 24 loops each.
- Stage keys: `l` go live (phones only follow a stage that is live, so
  someone else opening /talk/stage cannot drive the room), `j` join card (QR,
  people count, everyone's touches), `w` force slide 2 awake. The live layer
  (`live/LiveLayer.tsx`) is drawn over the current slide in its own frame and
  never blocks the deck; if the room does not connect the deck runs as before.
- Built so far: join flow and lobby, warm-up (slide 2 starts blurred and gray;
  it wakes when 40% of the people in the room hold at once, at least 2, never
  more than the room has; fingers already down when the slide comes up must
  lift first), title loops (slide 3; each person's loops sit a little off
  center so together they spiral). Patina, take a seat, fridge, finale and the
  keepsake card are next.
- Testing two people needs two browsers (or a phone): tabs in one browser
  share a playhtml identity and count as one person.

## Still open

- Stage controls and notes screen look: options on the design canvas
  (claude.ai/artifact/WiCHMWqVdfV9L7e4JFH4Jw), current build is closest to
  "Stamp" + "Script".
- Re-record the two-screen playhtml realtime video on the new playhtml.fun
  design (replaces `video/playhtml-all-interactions.mp4`).
- Spencer replaces the We Were Online portraits montage with Ars footage
  (`video/we-were-browsing-montage.mp4`).
- Point `assets.spencerchang.me` at the R2 bucket (part of moving the whole
  assets host off S3), then switch `VID` to it.
- Live audience: patina, take a seat, fridge, finale, keepsake card. Load
  testing with a full room.
