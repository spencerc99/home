// The Perpetual Play talk deck, rebuilt from the Figma Slides file
// (figma.com/slides/62ReIh8pxnGuvcIZKviB9U). Every slide is a 1920x1080
// canvas; boxes are [x, y, width, height] in Figma's canvas pixels and layers
// are listed bottom to top, matching Figma's layer order.

export type Box = [number, number, number, number];

export type TextRun = {
  text: string;
  color?: string;
  bold?: boolean;
  underline?: boolean;
  // Slowly fades through the audience's colours instead of one colour.
  shifting?: boolean;
};

export type Layer = LayerContent & {
  // Hidden when the slide comes up; each press of next reveals the layers of
  // the next build number, 1 first, before moving on to the next slide.
  build?: number;
};

type LayerContent =
  | {
      kind: "image";
      src: string;
      box: Box;
      radius?: number;
      // Figma exports an image cropped to the slide edges. Set false for an
      // image whose file holds the whole rectangle (one export reused at
      // positions that spill off the slide).
      clipToSlide?: boolean;
      // Set for an image stored at its original size rather than exported at
      // the rectangle's size, so it fills the box the way Figma's FILL does.
      cover?: boolean;
    }
  | { kind: "video"; src: string; box: Box; radius?: number }
  // A tile that steps through pictures and videos (by file extension),
  // crossfading, while its slide is up: each shows for `every` ms, and
  // `delay` staggers tiles on the same slide. Thumbnails show the first.
  | { kind: "reel"; box: Box; items: string[]; every: number; delay?: number }
  // A live web page, framed. Thumbnails (the overview grid, the notes window)
  // show `still` instead so they don't each load the page.
  | { kind: "website"; url: string; box: Box; still: string }
  | {
      kind: "text";
      box: Box;
      runs: TextRun[];
      // A numbered or bulleted list drawn after `runs`, one entry per item,
      // then `after` continues as plain text below it.
      list?: { style: "ordered" | "bullet"; items: TextRun[][] };
      after?: TextRun[];
      // Figma's auto-width text: keep each line on one line.
      nowrap?: boolean;
      size: number;
      bold?: boolean;
      align?: "left" | "center";
      lineHeight?: number;
    }
  | { kind: "block"; box: Box; color: string }
  | { kind: "label"; title: string; link?: string }
  | { kind: "scribble"; opacity?: number }
  // Shared We Were Online collages drifting onto the slide one after another.
  | { kind: "collages" };

/** How many presses of next reveal the slide's builds before it moves on. */
export function buildCount(slide: Slide): number {
  return Math.max(slide.fridgeDoor ?? 0, slide.joinAt ?? 0, ...slide.layers.map((layer) => layer.build ?? 0));
}

export type Slide = {
  // Figma node id of the slide, so it can be found again in the file.
  figmaId: string;
  layers: Layer[];
  // Slides with a live audience moment layered on top later.
  live?: "join" | "circle" | "seat" | "fridge" | "patina" | "finale";
  // The fridge slide where the big screen draws the shared fridge door, on
  // this build; phones can already move words on the fridge slides before it.
  fridgeDoor?: number;
  // The build where the join card (QR code, people count, everyone's
  // touches) comes up over this slide, fading the rest of it.
  joinAt?: number;
};

const IMG = "/talk/perpetual-play/img";
// Videos are too big for the site bundle; they live in the public R2 bucket
// assets-spencerchang-me at talks/perpetual-play/video/. This is the bucket's
// r2.dev address until assets.spencerchang.me is pointed at it.
const VID = "https://pub-bd6722caa0b449ffa44df72e8cef733a.r2.dev/talks/perpetual-play/video";

// Project videos from the site's creations (public/creation-videos), for the
// reels on slide 2: a spread of websites, objects, devices and performances.
const CREATION = (id: string) => `/creation-videos/bl-${id}.mp4`;

const img = (name: string, box: Box, extra: Partial<Extract<Layer, { kind: "image" }>> = {}): Layer => ({
  kind: "image",
  src: `${IMG}/${name}.webp`,
  box,
  ...extra,
});
const vid = (name: string, box: Box, radius?: number): Layer => ({
  kind: "video",
  src: `${VID}/${name}.mp4`,
  box,
  radius,
});
const LINK = "#007fd9";
const byline: Layer = {
  kind: "text",
  box: [16, 29, 280, 48],
  size: 24,
  lineHeight: 1,
  runs: [{ text: "Spencer Chang\n" }, { text: "spencer.place", color: LINK }],
};
// The deck's type scale, in slide pixels. Every text layer uses one of these.
//   statement 120 bold: a slide that is one big line ("software you can touch")
//   title 84: the line a slide is about ("People give meaning to technology")
//   listTitle 72 bold: the heading over a list
//   body 56: second lines and list items
//   small 40: dense lists (the thank-you links)
//   byline and labels stay at 24.
const TYPE = {
  statement: { size: 120, bold: true, lineHeight: 1.08 },
  title: { size: 84, lineHeight: 1.15 },
  listTitle: { size: 72, bold: true, lineHeight: 1.15 },
  body: { size: 56, lineHeight: 1.3 },
  small: { size: 40, lineHeight: 1.35 },
} as const;
// The space between a heading and what follows it.
const GAP = 36;

const heading = (
  box: Box,
  text: string,
  opts: { bold?: boolean; align?: "left" | "center"; size?: number; nowrap?: boolean } = {},
): Layer => ({
  kind: "text",
  box,
  nowrap: opts.nowrap,
  size: opts.size ?? 84,
  bold: opts.bold,
  align: opts.align ?? "left",
  lineHeight: 1.2,
  runs: [{ text }],
});
const label = (title: string, link?: string): Layer => ({ kind: "label", title, link });

// One reused "browser window" image, scattered across slides 20 and 21.
const windowAt = (x: number, y: number) => img("2070-537", [x, y, 1059, 658], { clipToSlide: false, cover: true });

// The playhtml collage of living websites, shown on two slides.
const livingSites = (withImage201: boolean): Layer[] => [
  vid("communal-kitchen", [0, 19, 922, 571]),
  img("45-370", [960, 0, 918, 735], { radius: 8 }),
  ...(withImage201 ? [img("45-373", [16, 540, 563, 563])] : []),
  img("45-376", [601, 505, 598, 598]),
  img("2075-618", [16, -20, 1036, 824]),
  img("2075-623", [1208, 576, 621, 492]),
  img("2075-621", [1052, 0, 1194, 740]),
  img("2075-622", [183, 471, 717, 824]),
];

export const perpetualPlayDeck: Slide[] = [
  {
    figmaId: "2081:708",
    layers: [byline, heading([669, 151, 581, 101], "Hi I’m Spencer", { nowrap: true }), img("2088-788", [298, 287, 1324, 824])],
  },
  {
    figmaId: "1:193",
    // The QR code, the people count and everyone's touches come up over this
    // slide on the next press.
    live: "join",
    joinAt: 1,
    layers: [
      {
        kind: "reel",
        box: [0, -104, 1233, 824],
        every: 4200,
        items: [
          `${IMG}/2102-144.webp`,
          CREATION("oWbNjGXdjK"), // html garden
          CREATION("pcKpYu0tOF"), // nothing on my computer
          CREATION("21P7fqNtic"), // Webcollages
          CREATION("3sAn_jqexq"), // cursor watching
          CREATION("UApY84pF0v"), // minute faces (together)
          CREATION("1JtvwPkD5S"), // playhtml
        ],
      },
      {
        kind: "reel",
        box: [1233, 0, 784, 1061],
        every: 4200,
        delay: 1400,
        items: [
          `${IMG}/2102-141.webp`,
          CREATION("3iG3YRioYt"), // everyday
          CREATION("PkmObpZzQs"), // Internet Sculptures
          CREATION("qERwPYcAzY"), // Sharing Stories
          CREATION("I3Z8iiQmXs"), // Wi-Fi Graffiti
          CREATION("_1DHAWsaB2"), // Free Agents
          CREATION("F-kruJn5lE"), // SIGIL I
        ],
      },
      {
        kind: "reel",
        box: [0, 524, 1233, 660],
        every: 4200,
        delay: 2800,
        items: [
          `${IMG}/2102-128.webp`,
          CREATION("oDGrU4LJTF"), // Computing-Infused Objects
          CREATION("WMZO6IlYNO"), // alive internet theory
          CREATION("WWhDKi1Q-U"), // iframe quilt
          CREATION("vf4rrdhrob"), // CMU.PLACE
          CREATION("M0Wu51rgfw"), // everyday at the Internet Archive
        ],
      },
      { kind: "block", box: [506, 314, 910, 356], color: "#ff8901" },
      { ...heading([504, 405, 912, 240], "software you can touch", { bold: true, align: "center", size: 120 }), lineHeight: 1.02 },
      { kind: "text", box: [0, 335, 1920, 64], size: 64, align: "center", lineHeight: 1, runs: [{ text: "I make" }] },
    ],
  },
  {
    figmaId: "2070:448",
    layers: [{ kind: "scribble" }, byline, heading([560, 486, 800, 67], "Play Together", { bold: true, size: 56, nowrap: true, align: "center" })],
  },
  { figmaId: "2070:583", layers: [vid("da-vinci", [600, 180, 720, 720]), byline] },
  { figmaId: "2070:594", layers: [img("2070-595", [606, 188, 707, 703]), byline] },
  // Phones draw loops over the video of the circle being drawn.
  { figmaId: "2002:158", live: "circle", layers: [vid("drawing-circle", [0, -328, 1920, 1792]), byline] },
  { figmaId: "2070:602", layers: [byline, img("2070-605", [370, 194, 1214, 692])] },
  {
    figmaId: "2059:441",
    layers: [
      { ...heading([356, 350, 1207, 194], "People give meaning to technology"), ...TYPE.title },
      {
        kind: "text",
        box: [356, 350 + 194 + GAP, 1207, 146],
        ...TYPE.body,
        runs: [{ text: "So we can make it what we want:\nfun, caring, creative, " }, { text: "???", bold: true, shifting: true }],
        build: 1,
      },
      byline,
    ],
  },
  {
    figmaId: "2176:43",
    layers: [
      byline,
      img("2075-616", [526, 53, 868, 503]),
      img("2075-696", [0, 607, 707, 473]),
      img("2075-698", [752, 607, 371, 473]),
      img("2176-51", [1163, 607, 757, 473]),
    ],
  },
  { figmaId: "2083:714", layers: [byline, img("2083-721", [350, 274, 1220, 531])] },
  {
    figmaId: "2075:612",
    layers: [{ ...heading([426, 410, 1067, 260], "The Internet has no benches", { align: "center" }), ...TYPE.statement }, byline],
  },
  {
    figmaId: "2075:702",
    live: "seat",
    layers: [
      img("2075-705", [586, 217, 747, 645]),
      byline,
      // Benches and playgrounds join one at a time, clockwise from the top left.
      img("2096-60", [70, 665, 590, 393], { build: 4 }),
      img("2096-63", [1240, 30, 680, 510], { build: 2 }),
      img("2096-65", [1277, 540, 606, 540], { build: 3 }),
      img("2096-66", [70, 29, 671, 504], { build: 1 }),
    ],
  },
  {
    figmaId: "2176:38",
    layers: [
      { ...heading([356, 318, 1207, 166], "We need to offer different, positive visions"), ...TYPE.listTitle },
      {
        kind: "text",
        box: [356, 318 + 166 + GAP, 1207, 220],
        ...TYPE.body,
        runs: [],
        list: { style: "ordered", items: [[{ text: "new websites/apps" }], [{ text: "new devices" }], [{ text: "new browsers" }]] },
      },
      byline,
    ],
  },
  {
    figmaId: "1:105",
    live: "fridge",
    layers: [
      // playhtml.fun in a desktop window and a phone at once: what one does,
      // the other sees (recorded with Playwright, 1920x1188). It fills the
      // slide; the dark margin above and below the windows is cropped.
      vid("playhtml-home-interactions", [0, -44, 1920, 1188]),
    ],
  },
  {
    figmaId: "36:224",
    live: "fridge",
    // The real fridge first; the next press brings up the room's own door.
    fridgeDoor: 1,
    layers: [img("36-226", [-22, -237, 1942, 1554], { radius: 8 }), label("poems we found on the internet", "playhtml.fun/fridge")],
  },
  {
    figmaId: "45:363",
    // One more website on each press, ending on recent ones made with playhtml.
    layers: [
      ...[
        ...livingSites(true),
        img("2075-619", [1004, 285, 874, 818]),
        img("student-teletext", [70, 60, 760, 475], { radius: 8, cover: true }),
        img("student-cyberspace", [1110, 50, 760, 475], { radius: 8, cover: true }),
        img("student-compost", [230, 545, 760, 475], { radius: 8, cover: true }),
        img("student-trash", [1010, 560, 760, 475], { radius: 8, cover: true }),
      ].map((layer, i) => ({ ...layer, build: i })),
      label("playhtml", "playhtml.fun"),
    ],
  },
  {
    figmaId: "2086:769",
    live: "patina",
    layers: [
      byline,
      {
        kind: "text",
        box: [635, 1015, 649, 24],
        size: 24,
        lineHeight: 1,
        nowrap: true,
        runs: [{ text: "https://www.are.na/spencer-chang/proof-of-life-patina", underline: true }],
      },
      img("2086-772", [479, 128, 479, 824]),
      img("2086-773", [479, 128, 479, 824]),
      img("2086-774", [958, 128, 465, 824]),
      img("2086-775", [1423, 128, 497, 824]),
      img("2086-776", [-1, 128, 479, 824]),
      img("2086-777", [1440, 128, 480, 824]),
    ],
  },
  {
    figmaId: "2086:766",
    layers: [{ ...heading([356, 395, 1207, 290], "Proof of Life\n<>\nPossibility of Surprise", { bold: true, align: "center" }), ...TYPE.title, bold: true }, byline],
  },
  { figmaId: "43:350", layers: [byline, windowAt(430, 211)] },
  {
    figmaId: "2070:540",
    layers: [
      byline,
      ...[
        [270, -151],
        [-100, 34],
        [430, 211],
        [-421, -61],
        [184, 507],
        [-345, 507],
        [1172, -198],
        [714, 507],
        [861, -25],
        [1049, 444],
      ].map(([x, y]) => windowAt(x, y)),
    ],
  },
  {
    figmaId: "2070:555",
    layers: [
      byline,
      ...[
        [270, -151],
        [-100, 34],
        [430, 211],
        [-421, -61],
        [184, 507],
        [-345, 507],
        [1172, -198],
        [714, 507],
        [861, -25],
        [1107, 460],
      ].map(([x, y]) => windowAt(x, y)),
      img("2070-579", [12, 0, 1908, 1080], { clipToSlide: false, cover: true }),
    ],
  },
  { figmaId: "2002:204", layers: [label("everyday"), vid("everyday-internet-archive", [262, 128, 1465, 824])] },
  {
    figmaId: "30:82",
    layers: [
      img("30-85", [-40, 0, 720, 1080]),
      img("30-89", [655, 0, 720, 1080]),
      img("30-92", [1332, 0, 720, 1080]),
      label("Computing Shrines", "shrine.computer"),
    ],
  },
  {
    figmaId: "27:63",
    layers: [
      img("27-66", [-37, -30, 672, 1161]),
      img("27-68", [1192, -29, 759, 1138]),
      img("27-69", [579, -30, 678, 1139]),
      label("Computing Shrines", "shrine.computer"),
    ],
  },
  {
    figmaId: "2043:300",
    layers: [
      label("Computing Shrines", "shrine.computer"),
      vid("shrine-to-earth", [728, 128, 464, 824]),
      vid("shrine-to-others", [1251, 128, 464, 824]),
      vid("shrine-to-voice", [198, 128, 471, 824]),
    ],
  },
  { figmaId: "2070:460", layers: [label("Computing Shrines", "shrine.computer"), img("2070-467", [591, 3, 702, 1077])] },
  { figmaId: "2096:74", layers: [img("2096-75", [548, 128, 824, 824]), byline, img("2096-77", [640, 259, 639, 561])] },
  { figmaId: "2002:201", layers: [byline, img("2048-375", [294, 38, 1331, 1003])] },
  { figmaId: "2058:389", layers: [byline, img("2058-393", [506, 55, 908, 969])] },
  {
    figmaId: "33:182",
    layers: [
      { kind: "website", url: "https://wewere.online/", box: [0, 0, 1920, 1080], still: `${IMG}/36-201.webp` },
      label("we were online", "wewere.online"),
    ],
  },
  {
    figmaId: "33:185",
    layers: [
      vid("we-were-browsing-montage", [0, 0, 613, 1091]),
      vid("we-were-typing", [613, 0, 1307, 514]),
      vid("colored-windows", [613, 514, 1307, 577]),
      label("we were online", "wewere.online"),
    ],
  },
  {
    figmaId: "2176:53",
    layers: [byline, label("we were online", "wewere.online"), vid("internet-scraps-demo", [233, 5, 1454, 1075])],
  },
  { figmaId: "2176:61", layers: [{ kind: "collages" }, byline, label("we were online", "wewere.online")] },
  {
    figmaId: "1:98",
    layers: [
      byline,
      vid("wikipedia-cursors", [16, 291, 601, 720]),
      vid("wikipedia-demo", [668, 164, 1161, 882]),
      label("we were online", "wewere.online"),
      // The Wikipedia main page's "Welcome to Wikipedia", its link tinted by
      // everyone's cursor colours.
      { ...img("wikipedia-patina", [260, 330, 1400, 368], { radius: 12, cover: true }), build: 1 },
    ],
  },
  { figmaId: "2096:87", layers: [byline, ...livingSites(false), img("2075-619", [1004, 285, 874, 818]), label("we were online", "wewere.online")] },
  {
    figmaId: "2075:608",
    layers: [
      { ...heading([452, 375, 1099, 83], "rules of play"), ...TYPE.listTitle },
      {
        kind: "text",
        box: [452, 375 + 83 + GAP, 1099, 220],
        ...TYPE.body,
        runs: [],
        list: {
          style: "ordered",
          items: [[{ text: "inhabit > use" }], [{ text: "seeds > products" }], [{ text: "program for surprise" }]],
        },
      },
      byline,
      { kind: "scribble", opacity: 0.3 },
    ],
  },
  {
    figmaId: "2002:212",
    live: "finale",
    layers: [heading([560, 486, 800, 67], "Play Together", { bold: true, size: 56, nowrap: true, align: "center" }), { kind: "scribble" }, byline],
  },
  {
    figmaId: "2094:36",
    layers: [
      { ...heading([960, 218, 900, 97], "Thank you :)"), ...TYPE.title },
      {
        kind: "text",
        box: [960, 218 + 97 + GAP, 900, 520],
        ...TYPE.small,
        runs: [],
        list: {
          style: "bullet",
          items: [
            [{ text: "Make a living website: " }, { text: "playhtml.fun", color: LINK }],
            [{ text: "Host a shrine: " }, { text: "shrine.computer", color: LINK }],
            [{ text: "Be part of a living internet: " }, { text: "wewere.online", color: LINK }],
          ],
        },
        after: [
          { text: "\n\nspencer.place\n", color: LINK },
          { text: "hi@spencer.place", underline: true },
          { text: "\nspencercha.ng on tiktok / ig / bsky" },
        ],
      },
      img("2094-39", [204, 218, 643, 643]),
    ],
  },
];
