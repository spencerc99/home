// ABOUTME: Top-level PlayProvider that initializes playhtml with cursor config.
// ABOUTME: Mounted in BaseLayout to provide play context to all interactive components.

import { PlayProvider } from "@playhtml/react";
import type { PropsWithChildren } from "react";
import { CursorPresenceLayer } from "./CursorPresenceLayer";

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
