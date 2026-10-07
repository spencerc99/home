// ABOUTME: Splits creations into the tiers the /home-lab prototypes show:
// ABOUTME: tending (big ongoing), selected works, small things, plus places and counts.

import { getCollection } from "astro:content";
import { hydrateCreations, isFeaturedCreation } from "../../utils/creations";

export const TENDING_IDS = ["computing-shrines", "we-were-online", "playhtml"];

// Institutions to lead with, in order. Edit freely.
export const PLACES = [
  "Internet Archive",
  "Gray Area",
  "New Museum",
  "Rhizome",
  "NEW INC",
  "Museum of the Moving Image",
  "Hyundai Artlab",
  "de Young Museum",
  "SF Arts Commission",
  "National Communication Museum",
  "Confederation Centre of the Arts",
  "SFPC",
];

const SMALL_CATEGORIES = new Set(["Project", "Tinkering"]);

export async function getHomeLabData() {
  const all = hydrateCreations(await getCollection("creation")).sort(
    (a, b) =>
      new Date(b.data.date || 0).getTime() -
      new Date(a.data.date || 0).getTime(),
  );
  const flat = all.map((c) => ({ id: c.id, ...c.data }));

  const tending = TENDING_IDS.map((id) => flat.find((c) => c.id === id)).filter(
    (c): c is (typeof flat)[number] => Boolean(c),
  );
  const works = flat.filter(
    (c) => isFeaturedCreation(c) && !TENDING_IDS.includes(c.id),
  );
  const small = flat.filter(
    (c) =>
      !c.featured &&
      c.heroImage &&
      SMALL_CATEGORIES.has(c.parentCategory || "") &&
      (c.love === "y" || c.love === "m"),
  );

  const count = (cat: string) =>
    flat.filter((c) => c.parentCategory === cat).length;
  const counts = {
    projects: count("Project"),
    exhibitions: count("Exhibition"),
    talks: count("Talks & Teaching"),
    press: count("Press"),
  };

  return { tending, works, small, counts };
}
