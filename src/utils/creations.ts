// ABOUTME: Utilities for working with creation data
// ABOUTME: including hydration and type definitions

import type { CollectionEntry } from "astro:content";
import { isEventForthcoming } from "./index";

export enum CreationCategory {
  "Speaking & Workshops",
  Project,
  Exhibition,
  Writing,
  Press,
  "Fellowships, Residencies, Awards",
  Work,
  Announcements,
  Gathering,
  Tinkering,
}

/**
 * Hydrates a creation with computed fields like forthcoming status.
 * This ensures the forthcoming field is always accurate based on the current date.
 */
export function hydrateCreation<T extends CollectionEntry<"creation">>(
  creation: T
): T & { data: T["data"] & { forthcoming: boolean } } {
  return {
    ...creation,
    data: {
      ...creation.data,
      forthcoming: isEventForthcoming(creation.data.date, creation.data.endDate),
    },
  };
}

/**
 * Hydrates multiple creations with computed fields.
 */
export function hydrateCreations<T extends CollectionEntry<"creation">>(
  creations: T[]
): Array<T & { data: T["data"] & { forthcoming: boolean } }> {
  return creations.map(hydrateCreation);
}
