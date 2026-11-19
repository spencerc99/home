// Shared We Were Online collages for the scraps slide, newest share first.
// Each entry is a share id from a viewer link (wewere.online/collage/?id=<id>)
// plus what the wewere.online/collages/ gallery prints on its card, copied from
// the share's collage.json so the slide works without wifi. Covers are kept in
// public/talk/perpetual-play/collages/<id>.webp, from
// assets.wewere.online/collages/<id>/cover.

export type CollageMaker = { name: string; color: string };

export type SharedCollage = {
  id: string;
  by: CollageMaker;
  title: string;
  // When it was made, in ms; the gallery prints it beside the maker's name.
  createdAt: number;
  sharedAt: number;
  pieces: number;
  sites: number;
  frame: { width: number; height: number };
};

// Twelve of the collages shared from the scraps studio (the wwo-published-collages
// R2 bucket), picked for range: different makers, a test share and near-empty
// ones left out. Each maker's name and cursor colour come from the share's
// signature; the two older shares made before signatures existed are named as
// the gallery's pinnedCollages.ts names them.
export const SHARED_COLLAGES: SharedCollage[] = [
  {
    id: "ft7mkff8bWnfO6oUY7FpgQ",
    by: { name: "spencer", color: "#ffae00" },
    title: "masking",
    createdAt: 1794090653945,
    sharedAt: 1795026990555,
    pieces: 34,
    sites: 5,
    frame: { width: 1500, height: 1000 },
  },
  {
    id: "ouXTmba9ze7mt2j7UNjbmg",
    by: { name: "lookatthiscoolness", color: "#42c1e0" },
    title: "play/pause 11/15",
    createdAt: 1794764331144,
    sharedAt: 1794764652033,
    pieces: 12,
    sites: 6,
    frame: { width: 1500, height: 1000 },
  },
  {
    id: "20btcirOJKONiqf5P91Z5A",
    by: { name: "ponyo", color: "#56e18b" },
    title: "bruinvis",
    createdAt: 1794602137903,
    sharedAt: 1794602911715,
    pieces: 14,
    sites: 4,
    frame: { width: 1500, height: 1000 },
  },
  {
    id: "uKfCgpGxXgAHA0J8rIDS4g",
    by: { name: "thorns", color: "#9a9db6" },
    title: "The Awakening",
    createdAt: 1794434717914,
    sharedAt: 1794438426771,
    pieces: 26,
    sites: 12,
    frame: { width: 1500, height: 1000 },
  },
  {
    id: "TGsWdtIjnb3Bzz70wto-oA",
    by: { name: "pia", color: "#ffaa00" },
    title: "Asphalt Garden",
    createdAt: 1794430428788,
    sharedAt: 1794431061463,
    pieces: 19,
    sites: 8,
    frame: { width: 1500, height: 1000 },
  },
  {
    id: "VlrNjFtyos369GEu0UW2BA",
    by: { name: "Alixan", color: "#669c35" },
    title: "I don't want to study",
    createdAt: 1794223333351,
    sharedAt: 1794341741470,
    pieces: 41,
    sites: 12,
    frame: { width: 1500, height: 1000 },
  },
  {
    id: "Po6CVCCPu7eP3uXBmoKqhg",
    by: { name: "alataria", color: "#116204" },
    title: "light",
    createdAt: 1794298612292,
    sharedAt: 1794299978007,
    pieces: 29,
    sites: 11,
    frame: { width: 1500, height: 1000 },
  },
  {
    id: "7r_i4Vmd6lS1p1FTNIIK-Q",
    by: { name: "Jacob berger", color: "#ff0000" },
    title: "October 28 <3",
    createdAt: 1794276251324,
    sharedAt: 1794276830829,
    pieces: 27,
    sites: 5,
    frame: { width: 1500, height: 1000 },
  },
  {
    id: "Xx6Bw7i8a-1sSMWPNDc-vw",
    by: { name: "boo", color: "#8a2005" },
    title: "",
    createdAt: 1793986995318,
    sharedAt: 1793987472875,
    pieces: 26,
    sites: 5,
    frame: { width: 1500, height: 1000 },
  },
  {
    id: "drz_z9F5ctDGmo1Sxis6Yg",
    by: { name: "saphi", color: "#e98f53" },
    title: "nov 5, 2026",
    createdAt: 1793933939443,
    sharedAt: 1793936449294,
    pieces: 49,
    sites: 23,
    frame: { width: 1500, height: 1000 },
  },
  {
    id: "Nrz8x6uOpGSKdmN2N9gLdA",
    by: { name: "spencer", color: "#ffae00" },
    title: "you can see everything",
    createdAt: 1793654933935,
    sharedAt: 1793657899718,
    pieces: 94,
    sites: 5,
    frame: { width: 1200, height: 1200 },
  },
  {
    id: "TTmQjpbr6KXvePqO7lEwpQ",
    by: { name: "JCLaHoot", color: "#c9c2b8" },
    title: "Internet shrine",
    createdAt: 1793316764219,
    sharedAt: 1793593232094,
    pieces: 62,
    sites: 25,
    frame: { width: 1500, height: 1000 },
  },
];

export const collageViewerUrl = (id: string) => `https://wewere.online/collage/?id=${encodeURIComponent(id)}`;
