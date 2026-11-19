// The Perpetual Play talk deck, rebuilt from the Figma Slides file
// (figma.com/slides/62ReIh8pxnGuvcIZKviB9U). Every slide is a 1920x1080
// canvas; boxes are [x, y, width, height] in Figma's canvas pixels and layers
// are listed bottom to top, matching Figma's layer order.

export type Box = [number, number, number, number];

export type TextRun = { text: string; color?: string; bold?: boolean; underline?: boolean };

export type Layer =
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

export type Slide = {
  // Figma node id of the slide, so it can be found again in the file.
  figmaId: string;
  layers: Layer[];
  // Slides with a live audience moment layered on top later.
  live?: "warmup" | "title" | "fridge" | "patina" | "finale";
};

const IMG = "/talk/perpetual-play/img";
// Videos are too big for the site bundle; they live in the public R2 bucket
// assets-spencerchang-me at talks/perpetual-play/video/. This is the bucket's
// r2.dev address until assets.spencerchang.me is pointed at it.
const VID = "https://pub-bd6722caa0b449ffa44df72e8cef733a.r2.dev/talks/perpetual-play/video";

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
    live: "warmup",
    layers: [
      img("2102-144", [0, -104, 1233, 824]),
      img("2102-141", [1233, 0, 784, 1061]),
      img("2102-128", [0, 524, 1233, 660]),
      { kind: "block", box: [506, 314, 910, 356], color: "#ff8901" },
      heading([504, 399, 912, 240], "software you can touch", { bold: true, align: "center", size: 120 }),
      { kind: "text", box: [0, 335, 1920, 64], size: 64, align: "center", lineHeight: 1, runs: [{ text: "I make" }] },
    ],
  },
  {
    figmaId: "2070:448",
    live: "title",
    layers: [{ kind: "scribble" }, byline, heading([560, 486, 800, 67], "Play Together", { bold: true, size: 56, nowrap: true, align: "center" })],
  },
  { figmaId: "2070:583", layers: [vid("da-vinci", [600, 180, 720, 720]), byline] },
  { figmaId: "2070:594", layers: [img("2070-595", [606, 188, 707, 703]), byline] },
  { figmaId: "2002:158", layers: [vid("drawing-circle", [0, -328, 1920, 1792]), byline] },
  { figmaId: "2070:602", layers: [byline, img("2070-605", [370, 194, 1214, 692])] },
  {
    figmaId: "2059:441",
    layers: [heading([356, 439, 1207, 202], "I think technology is meaningless without people"), byline],
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
    layers: [heading([426, 420, 1067, 240], "The Internet has no benches", { bold: true, align: "center", size: 120 }), byline],
  },
  {
    figmaId: "2075:702",
    layers: [
      img("2075-705", [586, 217, 747, 645]),
      byline,
      img("2096-60", [70, 665, 590, 393]),
      img("2096-63", [1240, 30, 680, 510]),
      img("2096-65", [1277, 540, 606, 540]),
      img("2096-66", [70, 29, 671, 504]),
    ],
  },
  {
    figmaId: "2176:38",
    layers: [
      {
        kind: "text",
        box: [356, 389, 1207, 303],
        size: 84,
        lineHeight: 1.2,
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
      vid("playhtml-all-interactions", [0, 0, 1125, 805]),
      // playhtml.fun/gallery/, captured at 980x919 to fill the box the docs
      // screenshot used in Figma.
      img("playhtml-gallery", [986, 490, 980, 919]),
    ],
  },
  {
    figmaId: "36:224",
    live: "fridge",
    layers: [img("36-226", [-22, -237, 1942, 1554], { radius: 8 }), label("poems we found on the internet", "playhtml.fun/fridge")],
  },
  {
    figmaId: "45:363",
    layers: [...livingSites(true), label("playhtml", "playhtml.fun"), img("2075-619", [1004, 285, 874, 818])],
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
    layers: [heading([356, 388, 1207, 303], "Proof of Life\n<>\nPossibility of Surprise", { bold: true, align: "center" }), byline],
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
  { figmaId: "33:182", layers: [img("36-201", [0, -186, 1920, 1452]), label("we were online", "wewere.online")] },
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
    ],
  },
  { figmaId: "2086:723", layers: [byline, img("2086-728", [411, 128, 1098, 824]), label("we were online", "wewere.online")] },
  { figmaId: "2096:87", layers: [byline, ...livingSites(false), img("2075-619", [1004, 285, 874, 818]), label("we were online", "wewere.online")] },
  {
    figmaId: "2075:608",
    layers: [
      {
        kind: "text",
        box: [452, 336, 1099, 406],
        size: 84,
        lineHeight: 1.2,
        runs: [{ text: "rules of play", bold: true }],
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
      heading([838, 218, 880, 101], "Thank you :)", { align: "center" }),
      {
        kind: "text",
        box: [1025, 319, 727, 528],
        size: 48,
        lineHeight: 1,
        runs: [],
        list: {
          style: "bullet",
          items: [
            [{ text: "Make a living website: " }, { text: "playhtml.fun", color: LINK }],
            [{ text: "Host a shrine: " }, { text: "shrine.computer", color: LINK }],
            [{ text: "Be part of a living internet: " }, { text: "wewere.online", color: LINK }],
          ],
        },
        after: [{ text: "\n\n\nspencer.place\n", color: LINK }, { text: "hi@spencer.place", underline: true }],
      },
      img("2094-39", [204, 218, 643, 643]),
    ],
  },
];
