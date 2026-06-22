// ABOUTME: Top-level PlayProvider that initializes playhtml with cursor config.
// ABOUTME: Mounted in BaseLayout to provide play context to all interactive components.

import { PlayProvider, PlayContext, playhtml } from "@playhtml/react";
import { useContext, useEffect, type PropsWithChildren } from "react";
import { CursorPresenceLayer } from "./CursorPresenceLayer";
import { LiveChat } from "../LiveChat";
import { isRegular } from "../../utils/roles";
import {
  VISITOR_AWAY_DELAY_MS,
  getVisitorAvailability,
} from "../../utils/presence";

const VISIBLE_TAB_HEARTBEAT_KEY = "spencer-place-visible-tab-at";
const VISIBLE_TAB_HEARTBEAT_INTERVAL_MS = 5_000;

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

function PresenceBroadcaster() {
  const { hasSynced } = useContext(PlayContext);

  useEffect(() => {
    if (!hasSynced) return;

    let hiddenSince = document.hidden ? Date.now() : null;
    let awayTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    const getLastVisibleAt = () => {
      const value = localStorage.getItem(VISIBLE_TAB_HEARTBEAT_KEY);
      if (!value) return null;
      const timestamp = Number(value);
      return Number.isFinite(timestamp) ? timestamp : null;
    };

    const writeVisibleHeartbeat = () => {
      localStorage.setItem(VISIBLE_TAB_HEARTBEAT_KEY, String(Date.now()));
    };

    const broadcastAvailability = () => {
      const availability = getVisitorAvailability(
        document.hidden,
        hiddenSince,
        getLastVisibleAt(),
      );
      playhtml.presence.setMyPresence("active", availability === "available");
    };

    const clearAwayTimer = () => {
      if (awayTimer) {
        clearTimeout(awayTimer);
        awayTimer = null;
      }
    };

    const scheduleAwayTimer = () => {
      clearAwayTimer();
      awayTimer = setTimeout(() => {
        broadcastAvailability();
      }, VISITOR_AWAY_DELAY_MS);
    };

    // Broadcast current page, active state, and regular status
    playhtml.presence.setMyPresence("page", window.location.pathname);
    playhtml.presence.setMyPresence("regular", isRegular());
    if (!document.hidden) {
      writeVisibleHeartbeat();
    } else {
      scheduleAwayTimer();
    }
    broadcastAvailability();

    const handleVisibility = () => {
      if (document.hidden) {
        hiddenSince = Date.now();
        broadcastAvailability();
        scheduleAwayTimer();
      } else {
        hiddenSince = null;
        clearAwayTimer();
        writeVisibleHeartbeat();
        broadcastAvailability();
      }
    };
    // Update page on view transition navigation
    const handlePageLoad = () => {
      playhtml.presence.setMyPresence("page", window.location.pathname);
    };

    heartbeatTimer = setInterval(() => {
      if (!document.hidden) {
        writeVisibleHeartbeat();
        broadcastAvailability();
      }
    }, VISIBLE_TAB_HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("astro:page-load", handlePageLoad);

    return () => {
      clearAwayTimer();
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("astro:page-load", handlePageLoad);
    };
  }, [hasSynced]);

  return null;
}

// Strip trailing slash from the pathname so /about/ and /about resolve to
// the same playhtml room. Cloudflare Pages serves Astro's directory output
// with a trailing slash, but earlier site config did not — so the database
// has data under both forms for the same logical page.
function normalizedPagePath(): string {
  const p = window.location.pathname.replace(/\.[^/.]+$/, "");
  return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
}

export function PlayhtmlProvider({ children }: PropsWithChildren) {
  return (
    <PlayProvider
      initOptions={{
        room: normalizedPagePath,
        cursors: {
          enabled: true,
          room: "domain",
          coordinateMode: "absolute",
          container: "#playhtml-cursor-container",
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
      <PresenceBroadcaster />
      <LiveChat />
      {children}
    </PlayProvider>
  );
}
