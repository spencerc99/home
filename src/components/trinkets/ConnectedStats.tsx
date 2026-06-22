// ABOUTME: Wraps Stats in a bare PlayProvider so it has access to playhtml context.
// ABOUTME: Needed because Stats is mounted as a separate Astro island from the init-owning PlayhtmlProvider.

import { Stats } from "./Stats";
import { PlayhtmlProvider } from "../interactive/PlayhtmlProvider";

export function ConnectedStats() {
  return (
    <PlayhtmlProvider>
      <Stats />
    </PlayhtmlProvider>
  );
}
