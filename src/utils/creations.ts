// ABOUTME: Utilities for working with creation data
// ABOUTME: including hydration and type definitions

import type { CollectionEntry } from "astro:content";
import { isEventForthcoming } from "./index";

/** Creation IDs that should always appear at the top of the list. */
export const PINNED_CREATIONS: string[] = [
  // Add creation IDs (filenames without .json) here to pin them to the top.
  "computing-shrines",
  "playhtml",
];

/**
 * Special filter value representing the home page's "featured" selection.
 * Kept distinct from parentCategory values so it can coexist in the same filter.
 */
export const FEATURED_CATEGORY = "Featured";

/**
 * The single source of truth for what counts as "featured" (i.e. what the
 * home page shows): a creation that opts into `featured` and has a hero image.
 * Used both by the home page and the creations filter so they never drift.
 */
export function isFeaturedCreation(data: {
  heroImage?: unknown;
  featured?: boolean;
}): boolean {
  return Boolean(data.heroImage) && Boolean(data.featured);
}

export enum CreationCategory {
  "Talks & Teaching",
  Project = "Project",
  Exhibition = "Exhibition",
  Writing = "Writing",
  Press = "Press",
  FellowshipsResidenciesAwards = "Fellowships, Residencies, Awards",
  Work = "Work",
  Announcements = "Announcements",
  Gathering = "Gathering",
  Tinkering = "Tinkering",
}

export type AllCreationCategories =
  | CreationCategory
  | typeof FEATURED_CATEGORY
  | "all";

/**
 * Hydrates a creation with computed fields like forthcoming status.
 * This ensures the forthcoming field is always accurate based on the current date.
 */
export function hydrateCreation<T extends CollectionEntry<"creation">>(
  creation: T,
): T & { data: T["data"] & { forthcoming: boolean } } {
  return {
    ...creation,
    data: {
      ...creation.data,
      forthcoming: isEventForthcoming(
        creation.data.date,
        creation.data.endDate,
        creation.data.forthcoming,
      ),
    },
  };
}

/**
 * Hydrates multiple creations with computed fields.
 */
export function hydrateCreations<T extends CollectionEntry<"creation">>(
  creations: T[],
): Array<
  T & { data: CollectionEntry<"creation">["data"] & { forthcoming: boolean } }
> {
  return creations.map(hydrateCreation);
}
