// ABOUTME: Top-level PlayProvider that initializes playhtml with cursor config.
// ABOUTME: Mounted in BaseLayout to provide play context to all interactive components.

import { PlayProvider } from "@playhtml/react";
import type { PropsWithChildren } from "react";
import { CursorPresenceLayer } from "./CursorPresenceLayer";

// Migrate legacy "username" from localStorage into playhtml's identity if needed.
// Runs once before PlayProvider initializes the cursor client.
function migrateLegacyUsername() {
  const IDENTITY_KEY = "playhtml_player_identity";
  const LEGACY_KEY = "username";
  const legacyName = localStorage.getItem(LEGACY_KEY);
  if (!legacyName) return;

  try {
    const parsed = JSON.parse(legacyName) as string | null;
    if (!parsed) return;

    const stored = localStorage.getItem(IDENTITY_KEY);
    if (stored) {
      const identity = JSON.parse(stored);
      if (identity.publicKey && !identity.name) {
        identity.name = parsed;
        localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
      }
    }
  } catch {
    // legacyName wasn't valid JSON or identity was malformed — skip
  }
}

migrateLegacyUsername();

export function PlayhtmlProvider({ children }: PropsWithChildren) {
  return (
    <PlayProvider
      initOptions={{
        cursors: {
          enabled: true,
          room: "domain",
          getCursorStyle: (presence) => {
            if (presence.page !== window.location.pathname) {
              return {
                opacity: "0.7",
                filter: "blur(2px)",
              };
            }
            return {};
          },
        },
      }}
    >
      <CursorPresenceLayer />
      {children}
    </PlayProvider>
  );
}
