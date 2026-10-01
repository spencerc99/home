// ABOUTME: Nanostore for creations list controls (view, category, sort) per page.
// ABOUTME: Keeps filters intact when visiting a creation and navigating back.

import { map } from "nanostores";

export type CreationsViewControls = {
  view: string;
  category: string;
  sortDirection: "asc" | "desc";
};

// Keyed by pathname: home and /creation each keep their own controls.
export const $creationsViewControls = map<
  Record<string, CreationsViewControls>
>({});
