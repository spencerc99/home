// ABOUTME: Handles Spencer arrival detection, notifications, and cursor gestures.
// ABOUTME: Monitors cursor presences and triggers local animations via playhtml's cursor API.

import { useContext, useEffect, useRef, useState, useCallback } from "react";
import { PlayContext, useCursorPresences } from "@playhtml/react";
import type { CursorPresenceView } from "@playhtml/common";

const SPENCER_COLOR = "hsl(41, 100%, 50%)";

type GestureType = "wave" | "dance" | "bounce" | "spencer-entrance";

const GESTURE_KEYS: Record<string, GestureType> = {
  "1": "wave",
  "2": "dance",
  "3": "bounce",
};

const GESTURE_DURATION: Record<GestureType, number> = {
  wave: 1500,
  dance: 2000,
  bounce: 1000,
  "spencer-entrance": 2500,
};

const GESTURE_MENU_ITEMS: {
  key: string;
  gesture: GestureType;
  label: string;
  icon: string;
}[] = [
  { key: "1", gesture: "wave", label: "wave", icon: "\\o" },
  { key: "2", gesture: "dance", label: "dance", icon: "~\\/~" },
  { key: "3", gesture: "bounce", label: "spin", icon: "','" },
];

// Radial menu positioning: items evenly spaced in a circle
const MENU_RADIUS = 55;
const MENU_ITEM_ANGLES = [-90, 30, 150]; // degrees: top, bottom-right, bottom-left

function isSpencer(presence: CursorPresenceView): boolean {
  return (
    presence.playerIdentity?.name === "spencer" &&
    presence.playerIdentity?.playerStyle.colorPalette[0] === SPENCER_COLOR
  );
}

function getSpencerStableId(
  presences: Map<string, CursorPresenceView>,
): string | null {
  for (const [stableId, presence] of presences) {
    if (isSpencer(presence)) return stableId;
  }
  return null;
}

// Cursor SVG matching playhtml's mouse cursor shape
function CursorSVG({ color }: { color: string }) {
  return (
    <svg
      height="32"
      viewBox="0 0 32 32"
      width="32"
      xmlns="http://www.w3.org/2000/svg"
      style={{ pointerEvents: "none" }}
    >
      <g fill="none" fillRule="evenodd" transform="translate(10 7)">
        <path
          d="m6.148 18.473 1.863-1.003 1.615-.839-2.568-4.816h4.332l-11.379-11.408v16.015l3.316-3.221z"
          fill="#fff"
        />
        <path
          d="m6.431 17 1.765-.941-2.775-5.202h3.604l-8.025-8.043v11.188l2.53-2.442z"
          fill={color}
        />
      </g>
    </svg>
  );
}

type GestureOverlayInfo = {
  gestureType: GestureType;
  position: { x: number; y: number };
  color: string;
};

export function CursorPresenceLayer() {
  const {
    registerPlayEventListener,
    removePlayEventListener,
    dispatchPlayEvent,
    getMyPlayerIdentity,
    hasSynced,
    triggerCursorAnimation,
  } = useContext(PlayContext);
  const cursorPresences = useCursorPresences();
  const [showArrival, setShowArrival] = useState(false);
  const [activeGestures, setActiveGestures] = useState<
    Map<string, GestureOverlayInfo>
  >(new Map());
  const spencerWasPresent = useRef(false);
  const mousePos = useRef({ x: 0, y: 0 });
  const [emoteMenuOpen, setEmoteMenuOpen] = useState(false);
  const [emoteMenuPos, setEmoteMenuPos] = useState({ x: 0, y: 0 });
  const [showInteractHint, setShowInteractHint] = useState(false);
  const hintShownThisSession = useRef(false);

  // Track mouse position for self-gesture overlay positioning
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      mousePos.current = { x: e.clientX, y: e.clientY };
    }
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  // Show "press E to interact" hint once per session when other cursors are nearby
  useEffect(() => {
    if (hintShownThisSession.current) return;

    // Check if there are other cursors (more than just yourself)
    const myIdentity = getMyPlayerIdentity();
    const otherCursors = Array.from(cursorPresences.entries()).filter(
      ([stableId]) => stableId !== myIdentity?.publicKey,
    );
    if (otherCursors.length === 0) return;

    // Check proximity — any other cursor within 400px
    const nearby = otherCursors.some(([, presence]) => {
      if (!presence.cursor) return false;
      const dx = presence.cursor.x - mousePos.current.x;
      const dy = presence.cursor.y - mousePos.current.y;
      return Math.sqrt(dx * dx + dy * dy) < 400;
    });

    if (nearby) {
      hintShownThisSession.current = true;
      setShowInteractHint(true);
      setTimeout(() => setShowInteractHint(false), 4000);
    }
  }, [cursorPresences, getMyPlayerIdentity]);

  const triggerGestureOverlay = useCallback(
    (
      stableId: string,
      gestureType: GestureType,
      position: { x: number; y: number },
      color: string,
    ) => {
      setActiveGestures((prev) => {
        const next = new Map(prev);
        next.set(stableId, { gestureType, position, color });
        return next;
      });

      setTimeout(() => {
        setActiveGestures((prev) => {
          const next = new Map(prev);
          next.delete(stableId);
          return next;
        });
      }, GESTURE_DURATION[gestureType]);
    },
    [],
  );

  const performGesture = useCallback(
    (gesture: GestureType) => {
      const myIdentity = getMyPlayerIdentity();
      if (!myIdentity?.publicKey) return;

      // Animate locally
      const didAnimate =
        typeof triggerCursorAnimation === "function" &&
        triggerCursorAnimation(
          myIdentity.publicKey,
          `cursor-gesture-${gesture}`,
          GESTURE_DURATION[gesture],
        );
      if (!didAnimate) {
        const color = myIdentity.playerStyle.colorPalette[0] ?? "#888";
        triggerGestureOverlay(
          myIdentity.publicKey,
          gesture,
          { ...mousePos.current },
          color,
        );
      }

      // Broadcast to same-page peers
      dispatchPlayEvent({
        type: "cursor-gesture",
        eventPayload: {
          gestureType: gesture,
          stableId: myIdentity.publicKey,
        },
      });
    },
    [
      getMyPlayerIdentity,
      triggerCursorAnimation,
      triggerGestureOverlay,
      dispatchPlayEvent,
    ],
  );

  // Detect Spencer's arrival from cursor presences (works cross-page since cursors use domain room)
  useEffect(() => {
    if (!hasSynced) return;

    const spencerStableId = getSpencerStableId(cursorPresences);
    const spencerIsPresent = spencerStableId !== null;

    if (spencerIsPresent && !spencerWasPresent.current) {
      setShowArrival(true);
      setTimeout(() => setShowArrival(false), 4000);

      if (spencerStableId) {
        const didAnimate =
          typeof triggerCursorAnimation === "function" &&
          triggerCursorAnimation(
            spencerStableId,
            "cursor-gesture-spencer-entrance",
            GESTURE_DURATION["spencer-entrance"],
          );
        if (!didAnimate) {
          const presence = cursorPresences.get(spencerStableId);
          if (presence?.cursor) {
            triggerGestureOverlay(
              spencerStableId,
              "spencer-entrance",
              { x: presence.cursor.x, y: presence.cursor.y },
              SPENCER_COLOR,
            );
          }
        }
      }
    }

    spencerWasPresent.current = spencerIsPresent;
  }, [
    cursorPresences,
    hasSynced,
    triggerCursorAnimation,
    triggerGestureOverlay,
  ]);

  // Listen for cursor gesture events from same-page peers
  useEffect(() => {
    const id = registerPlayEventListener("cursor-gesture", {
      onEvent: (payload: { gestureType: GestureType; stableId: string }) => {
        if (!payload?.gestureType || !payload?.stableId) return;
        const didAnimate =
          typeof triggerCursorAnimation === "function" &&
          triggerCursorAnimation(
            payload.stableId,
            `cursor-gesture-${payload.gestureType}`,
            GESTURE_DURATION[payload.gestureType],
          );
        if (!didAnimate) {
          const presence = cursorPresences.get(payload.stableId);
          if (presence?.cursor) {
            const color =
              presence.playerIdentity?.playerStyle.colorPalette[0] ?? "#888";
            triggerGestureOverlay(
              payload.stableId,
              payload.gestureType,
              { x: presence.cursor.x, y: presence.cursor.y },
              color,
            );
          }
        }
      },
    });

    return () => removePlayEventListener("cursor-gesture", id);
  }, [
    registerPlayEventListener,
    removePlayEventListener,
    triggerGestureOverlay,
    triggerCursorAnimation,
    cursorPresences,
  ]);

  // Keyboard listener for emote menu + direct gesture keys
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      // Toggle emote menu with E
      if (e.key === "e" || e.key === "E") {
        setEmoteMenuOpen((prev) => {
          if (!prev) {
            setEmoteMenuPos({ ...mousePos.current });
          }
          return !prev;
        });
        return;
      }

      // Close menu with Escape
      if (e.key === "Escape" && emoteMenuOpen) {
        setEmoteMenuOpen(false);
        return;
      }

      // Gesture keys work whether menu is open or not
      const gesture = GESTURE_KEYS[e.key];
      if (!gesture) return;

      setEmoteMenuOpen(false);
      performGesture(gesture);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [emoteMenuOpen, performGesture]);

  return (
    <>
      {showArrival && <ArrivalNotification />}
      {showInteractHint && (
        <InteractHint x={mousePos.current.x} y={mousePos.current.y} />
      )}
      {emoteMenuOpen && (
        <EmoteMenu
          x={emoteMenuPos.x}
          y={emoteMenuPos.y}
          onSelect={(gesture) => {
            setEmoteMenuOpen(false);
            performGesture(gesture);
          }}
          onClose={() => setEmoteMenuOpen(false)}
        />
      )}
      {Array.from(activeGestures.entries()).map(([stableId, info]) => (
        <GestureOverlay
          key={stableId}
          x={info.position.x}
          y={info.position.y}
          gestureType={info.gestureType}
          color={info.color}
        />
      ))}
    </>
  );
}

function ArrivalNotification() {
  return (
    <div
      style={{
        position: "fixed",
        top: "2rem",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        zIndex: 10000,
        pointerEvents: "none",
        animation: "arrival-fade-in 0.3s ease-out",
      }}
    >
      <div
        style={{
          background: "hsl(41, 100%, 50%)",
          color: "#1a1a1a",
          padding: "0.75rem 1.25rem",
          borderRadius: "3em",
          boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
          fontFamily: "inherit",
          fontSize: "0.95rem",
          pointerEvents: "none",
        }}
      >
        ✦ spencer is home! ✦
      </div>
    </div>
  );
}

function InteractHint({ x, y }: { x: number; y: number }) {
  return (
    <div
      style={{
        position: "fixed",
        left: `${x + 20}px`,
        top: `${y + 20}px`,
        zIndex: 10000,
        pointerEvents: "none",
        animation: "arrival-fade-in 0.3s ease-out",
        fontFamily: "monospace",
        fontSize: "0.75rem",
        color: "var(--color-text-color, #666)",
        opacity: 0.8,
        whiteSpace: "nowrap",
      }}
    >
      press{" "}
      <kbd
        style={{
          border: "1px solid currentColor",
          borderRadius: "3px",
          padding: "0 4px",
          fontSize: "0.7rem",
        }}
      >
        E
      </kbd>{" "}
      to interact
    </div>
  );
}

function EmoteMenu({
  x,
  y,
  onSelect,
  onClose,
}: {
  x: number;
  y: number;
  onSelect: (gesture: GestureType) => void;
  onClose: () => void;
}) {
  const [fadingOut, setFadingOut] = useState(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".emote-menu")) {
        onClose();
      }
    }
    // Delay to avoid closing immediately from the same click
    const timer = setTimeout(() => {
      window.addEventListener("click", handleClick);
    }, 50);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", handleClick);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, [onClose]);

  const handleMouseLeave = useCallback(() => {
    setFadingOut(true);
    fadeTimer.current = setTimeout(() => onClose(), 300);
  }, [onClose]);

  const handleMouseEnter = useCallback(() => {
    setFadingOut(false);
    if (fadeTimer.current) {
      clearTimeout(fadeTimer.current);
      fadeTimer.current = null;
    }
  }, []);

  return (
    <div
      className="emote-menu"
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      style={{
        position: "fixed",
        left: `${x}px`,
        top: `${y}px`,
        zIndex: 10002,
        animation: fadingOut ? undefined : "emote-menu-open 0.15s ease-out",
        opacity: fadingOut ? 0 : 1,
        transition: "opacity 0.3s ease-out",
      }}
    >
      {/* Center ring */}
      <div
        style={{
          position: "absolute",
          width: `${MENU_RADIUS * 2 + 30}px`,
          height: `${MENU_RADIUS * 2 + 30}px`,
          left: `${-(MENU_RADIUS + 20)}px`,
          top: `${-(MENU_RADIUS + 20)}px`,
          borderRadius: "50%",
          background:
            "var(--color-neutral-background-translucent, rgba(255,255,255,0.1))",
          boxShadow: "0 0 2px 0 var(--color-box-shadow)",
        }}
      />
      {GESTURE_MENU_ITEMS.map((item, i) => {
        const angle = (MENU_ITEM_ANGLES[i] * Math.PI) / 180;
        const ix = Math.cos(angle) * MENU_RADIUS;
        const iy = Math.sin(angle) * MENU_RADIUS;

        return (
          <button
            key={item.key}
            onClick={() => onSelect(item.gesture)}
            style={{
              position: "absolute",
              left: `${ix - 28}px`,
              top: `${iy - 22}px`,
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "monospace",
              fontSize: "0.7rem",
              color: "var(--color-text-color, #333)",
              padding: 0,
              transition: "transform 0.1s ease, background 0.1s ease",
              animation: `emote-item-pop 0.2s ease-out ${i * 0.04}s both`,
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.transform = "scale(1.15)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.transform = "scale(1)";
            }}
          >
            <span style={{ fontSize: ".8rem", lineHeight: 1 }}>
              {item.icon}
            </span>
            <span
              style={{ opacity: 0.5, fontSize: "0.6rem", marginTop: "2px" }}
            >
              {item.key}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function GestureOverlay({
  x,
  y,
  gestureType,
  color,
}: {
  x: number;
  y: number;
  gestureType: GestureType;
  color: string;
}) {
  return (
    <div
      className={`cursor-gesture cursor-gesture-${gestureType}`}
      style={{
        position: "fixed",
        left: `${x}px`,
        top: `${y}px`,
        zIndex: 10001,
        pointerEvents: "none",
        opacity: 0.5,
        transformOrigin: "top left",
      }}
    >
      <CursorSVG color={color} />
    </div>
  );
}
