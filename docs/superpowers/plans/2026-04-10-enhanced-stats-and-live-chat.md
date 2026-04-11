# Enhanced Stats Dots & Spencer Live Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Stats cursor dots interactive (hover for page, click to navigate, active/inactive state) and add an AIM-style live chat window that appears when Spencer is on the site.

**Architecture:** Migrate Stats from `window.cursors` to the new `playhtml.presence` API. Each client broadcasts its page and active state as presence channels. Chat uses play events for ephemeral messaging and the typing presence channel for typing indicators. Spencer detection is extracted to a shared util.

**Tech Stack:** React, playhtml (`@playhtml/react@^0.10.1`, `@playhtml/common@^0.6.0`), existing `Popover` component, SCSS

**Dependency:** playhtml PR #74 must be merged and released before upgrading the package. Proceed with implementation assuming the API is available.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/utils/presence.ts` | Shared Spencer detection (`isSpencer`, `SPENCER_COLOR`, `getSpencerStableId`) |
| Create | `src/components/LiveChat.tsx` | Chat window component — messages, input, minimize, typing indicator |
| Create | `src/components/LiveChat.scss` | Chat styles — AIM aesthetic, animations, minimized state |
| Modify | `src/components/trinkets/Stats.tsx` | Migrate to presence API, add hover/click/active/sorting |
| Modify | `src/components/trinkets/CursorPopover.tsx` | Migrate from `window.cursors` to `playhtml.presence` for color/name |
| Modify | `src/components/interactive/CursorPresenceLayer.tsx` | Import `isSpencer` from shared util, render `LiveChat`, broadcast active/page presence |
| Modify | `src/components/interactive/PlayhtmlProvider.tsx` | Add active/page presence broadcasting at provider level |
| Modify | `package.json` | Upgrade `@playhtml/react` to `^0.10.1` |

---

### Task 1: Extract Spencer Detection to Shared Util

**Files:**
- Create: `src/utils/presence.ts`
- Modify: `src/components/interactive/CursorPresenceLayer.tsx:8,40-54`

- [ ] **Step 1: Create `src/utils/presence.ts`**

```ts
// ABOUTME: Shared constants and utilities for playhtml presence detection.
// ABOUTME: Provides Spencer identity checks used across Stats, Chat, and CursorPresenceLayer.

import type { CursorPresenceView } from "@playhtml/common";

export const SPENCER_COLOR = "hsl(41, 100%, 50%)";

export function isSpencer(presence: CursorPresenceView): boolean {
  return (
    presence.playerIdentity?.name === "spencer" &&
    presence.playerIdentity?.playerStyle.colorPalette[0] === SPENCER_COLOR
  );
}

export function getSpencerStableId(
  presences: Map<string, CursorPresenceView>,
): string | null {
  for (const [stableId, presence] of presences) {
    if (isSpencer(presence)) return stableId;
  }
  return null;
}
```

- [ ] **Step 2: Update CursorPresenceLayer to import from shared util**

In `src/components/interactive/CursorPresenceLayer.tsx`, replace:

```ts
const SPENCER_COLOR = "hsl(41, 100%, 50%)";
```

and the `isSpencer` and `getSpencerStableId` function definitions with:

```ts
import { SPENCER_COLOR, isSpencer, getSpencerStableId } from "../../utils/presence";
```

Remove the local `SPENCER_COLOR` constant (line 8), `isSpencer` function (lines 40-45), and `getSpencerStableId` function (lines 47-54).

- [ ] **Step 3: Verify build passes**

Run: `bun run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/utils/presence.ts src/components/interactive/CursorPresenceLayer.tsx
git commit -m "refactor: extract Spencer detection to shared util"
```

---

### Task 2: Broadcast Active State and Page via Presence

**Files:**
- Modify: `src/components/interactive/PlayhtmlProvider.tsx`

This task adds two presence broadcasts at the provider level so all components can read them:
1. `"active"` channel — `true` when tab is focused, `false` when backgrounded
2. `"page"` channel — current `window.location.pathname`

- [ ] **Step 1: Add presence broadcasting to PlayhtmlProvider**

In `src/components/interactive/PlayhtmlProvider.tsx`, add an import for `playhtml` and a new component that handles broadcasting:

```ts
import { PlayProvider, playhtml } from "@playhtml/react";
```

Add a new component inside the provider that broadcasts presence:

```tsx
function PresenceBroadcaster() {
  useEffect(() => {
    // Broadcast current page
    playhtml.presence.setMyPresence("page", window.location.pathname);

    // Broadcast active state
    playhtml.presence.setMyPresence("active", !document.hidden);
    const handleVisibility = () => {
      playhtml.presence.setMyPresence("active", !document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}
```

Import `useEffect` from React at the top of the file:

```ts
import type { PropsWithChildren } from "react";
```

becomes:

```ts
import { useEffect, type PropsWithChildren } from "react";
```

Add `<PresenceBroadcaster />` inside the `PlayProvider` return, after `<CursorPresenceLayer />`:

```tsx
return (
  <PlayProvider initOptions={...}>
    <CursorPresenceLayer />
    <PresenceBroadcaster />
    {children}
  </PlayProvider>
);
```

- [ ] **Step 2: Verify build passes**

Run: `bun run build`
Expected: Build succeeds. (The `playhtml.presence` API won't exist until the package is upgraded, but the code structure is correct.)

- [ ] **Step 3: Commit**

```bash
git add src/components/interactive/PlayhtmlProvider.tsx
git commit -m "feat: broadcast active state and page via presence API"
```

---

### Task 3: Migrate Stats to Presence API

**Files:**
- Modify: `src/components/trinkets/Stats.tsx`

Replace the `window.cursors` polling system with `playhtml.presence`. Add hover popovers for non-self dots, click-to-navigate, active/inactive opacity, and page-based sorting.

- [ ] **Step 1: Rewrite Stats to use presence API**

Replace the entire content of `src/components/trinkets/Stats.tsx` with:

```tsx
// ABOUTME: Sidebar trinket showing active visitors, session time, and battery.
// ABOUTME: Uses playhtml presence API for cursor data with hover tooltips and click navigation.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playhtml, useCursorPresences } from "@playhtml/react";
import { CursorPopoverContent } from "./CursorPopover";
import { Popover } from "../Popover";
import { trackVisit } from "../../utils/roles";
import { isSpencer, SPENCER_COLOR } from "../../utils/presence";

interface PresenceEntry {
  stableId: string;
  color: string;
  name?: string;
  page?: string;
  active: boolean;
  isMe: boolean;
  isSpencer: boolean;
}

function usePresenceEntries(): PresenceEntry[] {
  const cursorPresences = useCursorPresences();
  const [presenceData, setPresenceData] = useState<
    Map<string, { page?: string; active?: boolean }>
  >(new Map());

  useEffect(() => {
    const unsub = playhtml.presence.onPresenceChange(
      "active",
      (presences) => {
        const data = new Map<string, { page?: string; active?: boolean }>();
        for (const [stableId, view] of presences) {
          data.set(stableId, {
            page: (view as any).page,
            active: (view as any).active,
          });
        }
        setPresenceData(data);
      },
    );
    return unsub;
  }, []);

  return useMemo(() => {
    const entries: PresenceEntry[] = [];
    for (const [stableId, presence] of cursorPresences) {
      const color =
        presence.playerIdentity?.playerStyle.colorPalette[0] ?? "#888";
      const data = presenceData.get(stableId);
      const myIdentity = playhtml.presence.getMyIdentity();
      const isMe = presence.playerIdentity?.publicKey === myIdentity?.publicKey;

      entries.push({
        stableId,
        color,
        name: presence.playerIdentity?.name,
        page: data?.page,
        active: data?.active ?? true,
        isMe,
        isSpencer: isSpencer(presence),
      });
    }

    // Sort: self first, then by page path
    entries.sort((a, b) => {
      if (a.isMe) return -1;
      if (b.isMe) return 1;
      return (a.page ?? "").localeCompare(b.page ?? "");
    });

    return entries;
  }, [cursorPresences, presenceData]);
}

export function Stats() {
  const entries = usePresenceEntries();
  const startTime = new Date().getTime();
  const [time, setTime] = useState(0);
  const [deviceBattery, setDeviceBattery] = useState(100);

  useEffect(() => {
    trackVisit();

    const timeInterval = setInterval(() => {
      setTime((new Date().getTime() - startTime) / 1000 / 60);
    }, 66);

    if (navigator.getBattery) {
      navigator.getBattery().then((battery) => {
        setDeviceBattery(battery.level * 100);
        battery.addEventListener("levelchange", () => {
          navigator.getBattery().then((b) => {
            setDeviceBattery(b.level * 100);
          });
        });
      });
    }

    return () => clearInterval(timeInterval);
  }, []);

  const batteryDisplay = useMemo(() => {
    return deviceBattery > 0 ? Math.round(deviceBattery) : "unknown";
  }, [deviceBattery]);

  return (
    <div
      className="trinket bg-[var(--color-background-teal)] mono text-sm p-2 overflow-hidden"
      style={{ border: "double", gap: 0 }}
    >
      <span>
        ppl
        <span
          className="text-xs"
          style={{ letterSpacing: "-0.05em" }}
        >
          ({entries.length})
        </span>
        :{" "}
        {entries.map((entry, index) => (
          <CursorDot key={entry.stableId} entry={entry} isFirst={index === 0} />
        ))}
      </span>
      <span>
        time: <span>{time.toFixed(1)}m</span>
      </span>
      <span>
        energy: <span>{batteryDisplay}%</span>
      </span>
    </div>
  );
}

function CursorDot({
  entry,
  isFirst,
}: {
  entry: PresenceEntry;
  isFirst: boolean;
}) {
  const dotStyle: React.CSSProperties = {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    display: "inline-block",
    backgroundColor: entry.color,
    opacity: entry.active ? 1 : 0.4,
    transition: "opacity 0.3s ease",
    cursor: entry.isMe ? "pointer" : "pointer",
    ...(entry.isSpencer
      ? { boxShadow: `0 0 4px ${SPENCER_COLOR}` }
      : {}),
  };

  const [showSelfPopover, setShowSelfPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const selfDotRef = useRef<HTMLSpanElement>(null);

  const handleSelfClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = selfDotRef.current?.getBoundingClientRect();
    if (rect) {
      setPopoverPosition({ x: rect.left, y: rect.top - 4 });
      setShowSelfPopover((prev) => !prev);
    }
  }, []);

  if (entry.isMe) {
    return (
      <Popover
        trigger="manual"
        isOpen={showSelfPopover}
        onOpenChange={setShowSelfPopover}
        position="fixed"
        fixedPosition={popoverPosition}
        showCloseButton
      >
        <span
          className="relative inline-block mr-[2px]"
          ref={selfDotRef}
          style={{ height: "8px" }}
        >
          <span className="absolute -top-[2px] left-1/2 -translate-x-1/2 text-[8px] leading-none">
            you
          </span>
          <span style={dotStyle} onClick={handleSelfClick} />
        </span>
        <CursorPopoverContent color={entry.color} />
      </Popover>
    );
  }

  return (
    <Popover trigger="hover" hoverDelay={200} position="top">
      <span
        style={dotStyle}
        onClick={() => {
          if (entry.page) {
            window.location.href = entry.page;
          }
        }}
      />
      <div className="bg-[var(--color-background-teal)] mono text-xs p-2">
        <div className="flex items-center gap-1">
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: entry.color,
              display: "inline-block",
              ...(entry.isSpencer
                ? { boxShadow: `0 0 3px ${SPENCER_COLOR}` }
                : {}),
            }}
          />
          {entry.name && <span>{entry.name}</span>}
        </div>
        {entry.page && (
          <div style={{ opacity: 0.6, marginTop: "2px" }}>{entry.page}</div>
        )}
      </div>
    </Popover>
  );
}
```

- [ ] **Step 2: Verify build passes**

Run: `bun run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/trinkets/Stats.tsx
git commit -m "feat: migrate Stats dots to presence API with hover/click/active state"
```

---

### Task 4: Update CursorPopover to Use Presence API

**Files:**
- Modify: `src/components/trinkets/CursorPopover.tsx`

The CursorPopover currently reads/writes `window.cursors.color` and `window.cursors.name`. Since Stats no longer uses `window.cursors`, update CursorPopover to also use the presence API for name changes (color is still managed via `window.cursors` since it's how playhtml's cursor rendering works).

- [ ] **Step 1: Update CursorPopover to use playhtml for name**

In `src/components/trinkets/CursorPopover.tsx`, replace the `window.cursors` name subscription with presence API:

Add import at top:

```ts
import { playhtml } from "@playhtml/react";
```

Replace the name effect (lines 46-51):

```ts
useEffect(() => {
  const unsub = playhtml.presence.onPresenceChange("active", (presences) => {
    const myIdentity = playhtml.presence.getMyIdentity();
    if (myIdentity?.name) {
      setInternalName(myIdentity.name);
    }
  });
  return unsub;
}, []);
```

Keep the `window.cursors.color` usage for color changes since that's how the cursor rendering system works. Keep `window.cursors.name` for name changes too since it's the source of truth for cursor labels.

Actually — on reflection, `CursorPopover` works fine as-is. The `window.cursors` API still exists alongside the new presence API. The color/name setting goes through `window.cursors` which is the cursor client's interface. No changes needed here.

**Skip this task — CursorPopover works correctly with `window.cursors` for its purpose (setting cursor appearance). The presence API is for reading aggregate presence data, not for configuring the local cursor.**

---

### Task 4 (revised): Create LiveChat Component

**Files:**
- Create: `src/components/LiveChat.tsx`
- Create: `src/components/LiveChat.scss`

- [ ] **Step 1: Create `src/components/LiveChat.scss`**

```scss
// ABOUTME: Styles for the AIM-inspired live chat window.
// ABOUTME: Handles chat layout, animations, minimized state, and title bar flash.

@keyframes chat-pop-in {
  0% {
    transform: scale(0);
    opacity: 0;
    transform-origin: bottom right;
  }
  70% {
    transform: scale(1.03);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
    transform-origin: bottom right;
  }
}

@keyframes titlebar-flash {
  0% {
    background: hsl(41, 100%, 50%);
  }
  30% {
    background: hsl(41, 100%, 80%);
  }
  60% {
    background: hsl(41, 100%, 50%);
  }
  100% {
    background: hsl(41, 100%, 50%);
  }
}

.live-chat {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  width: 320px;
  z-index: 9998;
  font-family: var(--site-font-mono, "Sono", "Courier New", monospace);
  font-size: 13px;
  animation: chat-pop-in 0.3s ease-out both;

  @media (max-width: 480px) {
    width: calc(100vw - 2rem);
    right: 1rem;
  }
}

.live-chat-window {
  background: #fff;
  border: double 3px #282828;
  display: flex;
  flex-direction: column;

  .dark-mode & {
    background: var(--color-background-dark, #1a1a1a);
    border-color: rgb(235, 232, 227);
  }
}

.live-chat-titlebar {
  background: hsl(41, 100%, 50%);
  color: #1a1a1a;
  padding: 4px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  font-size: 12px;
  cursor: pointer;
  user-select: none;

  &.flashing {
    animation: titlebar-flash 0.6s ease-out;
  }
}

.live-chat-titlebar-actions {
  display: flex;
  gap: 8px;
  align-items: center;

  button {
    background: none;
    border: none;
    color: #1a1a1a;
    cursor: pointer;
    font-family: inherit;
    font-size: 14px;
    padding: 0;
    line-height: 1;
    display: flex;
    align-items: center;
  }
}

.live-chat-infobar {
  padding: 4px 8px;
  border-bottom: 1px solid #ddd;
  font-size: 11px;
  color: #666;
  background: #fafafa;

  .dark-mode & {
    background: var(--color-background-dark, #222);
    border-color: #444;
    color: #aaa;
  }
}

.live-chat-messages {
  padding: 8px 10px;
  min-height: 80px;
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.live-chat-message {
  display: flex;
  gap: 5px;
  align-items: baseline;

  &.system {
    font-size: 11px;
    opacity: 0.5;
    text-align: center;
    justify-content: center;
  }

  &.typing {
    opacity: 0.5;
    font-style: italic;
    font-size: 11px;
  }
}

.live-chat-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.live-chat-name {
  font-size: 11px;
  opacity: 0.5;
  flex-shrink: 0;
}

.live-chat-input {
  border-top: 1px solid #ddd;
  padding: 6px;
  display: flex;
  gap: 4px;
  background: #fafafa;

  .dark-mode & {
    background: var(--color-background-dark, #222);
    border-color: #444;
  }

  input {
    flex: 1;
    border: 1px solid #ccc;
    padding: 4px 6px;
    font-family: inherit;
    font-size: 12px;
    background: #fff;

    .dark-mode & {
      background: var(--color-background-dark, #1a1a1a);
      border-color: #555;
      color: rgb(235, 232, 227);
    }
  }

  button {
    border: 1px solid #ccc;
    padding: 3px 10px;
    font-family: inherit;
    font-size: 11px;
    background: #eee;
    cursor: pointer;

    .dark-mode & {
      background: #333;
      border-color: #555;
      color: rgb(235, 232, 227);
    }
  }
}
```

- [ ] **Step 2: Create `src/components/LiveChat.tsx`**

```tsx
// ABOUTME: AIM-style live chat window that appears when Spencer is on the site.
// ABOUTME: Uses playhtml events for ephemeral messaging and presence for typing indicators.

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PlayContext, playhtml, useCursorPresences } from "@playhtml/react";
import { isSpencer, SPENCER_COLOR, getSpencerStableId } from "../utils/presence";
import "./LiveChat.scss";

interface ChatMessage {
  id: string;
  text: string;
  stableId: string;
  color: string;
  name?: string;
  timestamp: number;
  type: "message" | "system";
}

export function LiveChat() {
  const { dispatchPlayEvent, registerPlayEventListener, removePlayEventListener, hasSynced } =
    useContext(PlayContext);
  const cursorPresences = useCursorPresences();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [minimized, setMinimized] = useState(false);
  const [visible, setVisible] = useState(false);
  const [spencerLeft, setSpencerLeft] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [flashTitlebar, setFlashTitlebar] = useState(false);
  const [typingStableIds, setTypingStableIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const spencerStableId = useMemo(
    () => getSpencerStableId(cursorPresences),
    [cursorPresences],
  );

  // Show chat when Spencer arrives
  useEffect(() => {
    if (!hasSynced) return;
    if (spencerStableId && !visible) {
      setVisible(true);
      setSpencerLeft(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `system-${Date.now()}`,
          text: "spencer just arrived",
          stableId: "",
          color: "",
          timestamp: Date.now(),
          type: "system",
        },
      ]);
    } else if (!spencerStableId && visible && !spencerLeft) {
      setSpencerLeft(true);
      setMessages((prev) => [
        ...prev,
        {
          id: `system-${Date.now()}`,
          text: "spencer has left",
          stableId: "",
          color: "",
          timestamp: Date.now(),
          type: "system",
        },
      ]);
    }
  }, [spencerStableId, hasSynced, visible, spencerLeft]);

  // Listen for chat messages
  useEffect(() => {
    const id = registerPlayEventListener("chat-message", {
      onEvent: (payload: {
        text: string;
        stableId: string;
        color: string;
        name?: string;
        timestamp: number;
      }) => {
        if (!payload?.text) return;
        const msg: ChatMessage = {
          id: `msg-${payload.timestamp}-${payload.stableId}`,
          text: payload.text,
          stableId: payload.stableId,
          color: payload.color,
          name: payload.name,
          timestamp: payload.timestamp,
          type: "message",
        };
        setMessages((prev) => [...prev, msg]);

        if (minimized) {
          setUnreadCount((c) => c + 1);
          setFlashTitlebar(true);
          setTimeout(() => setFlashTitlebar(false), 600);
        }
      },
    });

    return () => removePlayEventListener("chat-message", id);
  }, [registerPlayEventListener, removePlayEventListener, minimized]);

  // Listen for typing presence changes
  useEffect(() => {
    const unsub = playhtml.presence.onPresenceChange("typing", (presences) => {
      const typing = new Set<string>();
      for (const [stableId, view] of presences) {
        if ((view as any).typing && !(view as any).isMe) {
          typing.add(stableId);
        }
      }
      setTypingStableIds(typing);
    });
    return unsub;
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingStableIds]);

  const sendMessage = useCallback(() => {
    const text = inputValue.trim();
    if (!text) return;

    const myIdentity = playhtml.presence.getMyIdentity();
    const color = myIdentity?.playerStyle.colorPalette[0] ?? "#888";
    const stableId = myIdentity?.publicKey ?? "";
    const name = myIdentity?.name;
    const timestamp = Date.now();

    // Add to local state
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${timestamp}-${stableId}`,
        text,
        stableId,
        color,
        name,
        timestamp,
        type: "message",
      },
    ]);

    // Broadcast to peers
    dispatchPlayEvent({
      type: "chat-message",
      eventPayload: { text, stableId, color, name, timestamp },
    });

    setInputValue("");
    playhtml.presence.setMyPresence("typing", null);
  }, [inputValue, dispatchPlayEvent]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      playhtml.presence.setMyPresence("typing", true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        playhtml.presence.setMyPresence("typing", null);
      }, 2000);
    },
    [],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  const handleExpand = useCallback(() => {
    setMinimized(false);
    setUnreadCount(0);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
  }, []);

  const pplCount = cursorPresences.size;

  if (!visible) return null;

  // Minimized state
  if (minimized) {
    return (
      <div className="live-chat">
        <div className="live-chat-window">
          <div
            className={`live-chat-titlebar ${flashTitlebar ? "flashing" : ""}`}
            onClick={handleExpand}
          >
            <span>
              ✦ spencer.place chat
              {unreadCount > 0 && (
                <span style={{ fontSize: "10px", opacity: 0.7 }}>
                  {" "}
                  ({unreadCount})
                </span>
              )}
            </span>
            <div className="live-chat-titlebar-actions">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Typing users
  const typingUsers = Array.from(typingStableIds)
    .map((stableId) => {
      const presence = cursorPresences.get(stableId);
      if (!presence) return null;
      return {
        stableId,
        color:
          presence.playerIdentity?.playerStyle.colorPalette[0] ?? "#888",
        name: presence.playerIdentity?.name,
        isSpencer: isSpencer(presence),
      };
    })
    .filter(Boolean);

  return (
    <div className="live-chat">
      <div className="live-chat-window">
        <div className="live-chat-titlebar">
          <span>✦ spencer.place chat</span>
          <div className="live-chat-titlebar-actions">
            <button onClick={() => setMinimized(true)}>–</button>
            <button onClick={handleClose}>×</button>
          </div>
        </div>
        <div className="live-chat-infobar">
          {pplCount} ppl here
          {spencerStableId && (
            <>
              {" "}·{" "}
              <span
                className="live-chat-dot"
                style={{
                  width: "6px",
                  height: "6px",
                  backgroundColor: SPENCER_COLOR,
                  boxShadow: `0 0 3px ${SPENCER_COLOR}`,
                }}
              />{" "}
              spencer is home
            </>
          )}
        </div>
        <div className="live-chat-messages">
          {messages.map((msg) => {
            if (msg.type === "system") {
              return (
                <div key={msg.id} className="live-chat-message system">
                  {msg.text}
                </div>
              );
            }

            const msgIsSpencer =
              msg.name === "spencer" && msg.color === SPENCER_COLOR;
            return (
              <div key={msg.id} className="live-chat-message">
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    flexShrink: 0,
                  }}
                >
                  <span
                    className="live-chat-dot"
                    style={{
                      backgroundColor: msg.color,
                      ...(msgIsSpencer
                        ? { boxShadow: `0 0 4px ${SPENCER_COLOR}` }
                        : {}),
                    }}
                  />
                  {msg.name && (
                    <span className="live-chat-name">{msg.name}</span>
                  )}
                </span>
                <span>{msg.text}</span>
              </div>
            );
          })}
          {typingUsers.map((user) => (
            <div key={`typing-${user!.stableId}`} className="live-chat-message typing">
              <span
                className="live-chat-dot"
                style={{
                  backgroundColor: user!.color,
                  ...(user!.isSpencer
                    ? { boxShadow: `0 0 4px ${SPENCER_COLOR}` }
                    : {}),
                }}
              />
              <span>
                {user!.name ?? "someone"} is typing...
              </span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="live-chat-input">
          <input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="say something..."
          />
          <button onClick={sendMessage}>send</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build passes**

Run: `bun run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/LiveChat.tsx src/components/LiveChat.scss
git commit -m "feat: add AIM-style live chat component"
```

---

### Task 5: Mount LiveChat in PlayhtmlProvider

**Files:**
- Modify: `src/components/interactive/PlayhtmlProvider.tsx`

- [ ] **Step 1: Import and render LiveChat**

In `src/components/interactive/PlayhtmlProvider.tsx`, add import:

```ts
import { LiveChat } from "../LiveChat";
```

Add `<LiveChat />` inside the `PlayProvider` return, after `<PresenceBroadcaster />`:

```tsx
return (
  <PlayProvider initOptions={...}>
    <CursorPresenceLayer />
    <PresenceBroadcaster />
    <LiveChat />
    {children}
  </PlayProvider>
);
```

- [ ] **Step 2: Verify build passes**

Run: `bun run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/interactive/PlayhtmlProvider.tsx
git commit -m "feat: mount LiveChat in PlayhtmlProvider"
```

---

### Task 6: Upgrade playhtml Dependency

**Files:**
- Modify: `package.json`

This task should be done once playhtml PR #74 is merged and published.

- [ ] **Step 1: Update package.json**

```bash
bun add @playhtml/react@latest
```

This should pull in `@playhtml/react@0.10.1` which depends on `@playhtml/common@0.6.0` and `playhtml@2.9.0`.

- [ ] **Step 2: Verify build passes**

Run: `bun run build`
Expected: Build succeeds with the new APIs available.

- [ ] **Step 3: Test locally**

Run: `bun run dev`

Verify:
- Stats dots appear from playhtml presences (not `window.cursors`)
- Hovering a non-self dot shows page path tooltip
- Clicking a non-self dot navigates to their page
- Inactive tab users' dots are faded
- If you can simulate Spencer's identity, verify chat appears

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lockb
git commit -m "chore: upgrade playhtml to 0.10.1 with presence API"
```

---

## Task Dependency Order

```
Task 1 (extract isSpencer) ──┐
                              ├── Task 3 (Stats migration)
Task 2 (presence broadcast) ──┤
                              ├── Task 4 (LiveChat component)
                              │         │
                              │         ├── Task 5 (mount LiveChat)
                              │
                              └── Task 6 (upgrade playhtml) ← do when PR #74 is published
```

Tasks 1 and 2 can run in parallel. Tasks 3 and 4 can run in parallel after 1+2 are done. Task 5 depends on 4. Task 6 can be done independently whenever the package is published.
