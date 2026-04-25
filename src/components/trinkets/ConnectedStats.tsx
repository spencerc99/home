// ABOUTME: Wraps Stats in a PlayProvider so it has access to playhtml context.
// ABOUTME: Needed because Stats is mounted as a separate Astro island from the main PlayhtmlProvider.

import { Stats } from "./Stats";
import { PlayhtmlProvider } from "../interactive/PlayhtmlProvider";

export function ConnectedStats() {
  return (
    <PlayhtmlProvider>
      <Stats />
    </PlayhtmlProvider>
  );
}
