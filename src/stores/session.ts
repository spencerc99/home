// ABOUTME: Nanostore atoms for session-level state.
// ABOUTME: Survives React re-mounts during Astro view transitions.

import { atom } from "nanostores";

export const $sessionStartTime = atom(Date.now());
