// ABOUTME: Wraps Stats in a bare PlayProvider so it has access to playhtml context.
// ABOUTME: Needed because Stats is mounted as a separate Astro island from the init-owning PlayhtmlProvider.

import { PlayProvider } from "@playhtml/react";
import { Stats } from "./Stats";

export function ConnectedStats() {
  return (
    <PlayProvider>
      <Stats />
    </PlayProvider>
  );
}
