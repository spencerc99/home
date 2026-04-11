# Enhanced Stats Dots & Spencer Live Chat

**Date:** 2026-04-10  
**Status:** Approved  
**Dependency:** playhtml PR #74 must be merged and released (`@playhtml/common@0.6.0`, `playhtml@2.9.0`, `@playhtml/react@0.10.1`)

## Overview

Two features that build on playhtml's presence system to make spencer.place feel more alive and social:

1. **Enhanced Stats dots** — cursor dots in the sidebar Stats trinket become interactive, showing page paths on hover, navigating on click, fading when inactive, and sorted by page.
2. **Spencer live chat** — an AIM-style chat window that appears for all visitors when Spencer is on the site, using playhtml events for ephemeral messaging.

Both features share a migration from `window.cursors` to the new `playhtml.presence` API.

---

## Feature 1: Enhanced Stats Dots

### Data Source Migration

Replace the `window.cursors` polling system in `Stats.tsx` with `playhtml.presence` API:

- **Current:** Stats polls `window.cursors` every 100ms, reads `allColors: string[]` only
- **New:** Use `playhtml.presence.getPresences()` and `playhtml.presence.onPresenceChange()` to get full presence data including `playerIdentity`, `cursor`, `page`, `isMe`, and custom channels

### Active/Inactive State

Each client broadcasts tab visibility via the presence `"active"` channel:

```ts
document.addEventListener("visibilitychange", () => {
  playhtml.presence.setMyPresence("active", !document.hidden);
});
```

When rendering dots:
- Active users: full opacity
- Inactive users (tab backgrounded): `opacity: 0.4`

### Dot Interactions

**Hover (non-self dots):** Show a `Popover` (trigger="hover") with:
- Color dot
- Name (if set)
- Page path (e.g., "/events")

Uses the existing `Popover` component. Style should match `CursorPopover` visually — same font, border treatment, sizing.

**Click (non-self dots):** Navigate to that user's page via `window.location.href`.

**Click (self dot):** Existing `CursorPopover` behavior (color picker, name input).

### Sorting

Dots sorted by page path so visitors on the same page cluster together. Self dot always first.

---

## Feature 2: Spencer Live Chat

### Trigger

Chat window appears when Spencer is detected via `isSpencer()` (existing function in `CursorPresenceLayer.tsx` — checks `playerIdentity.name === "spencer"` and golden color). Chat is rendered as a sibling component to `CursorPresenceLayer`, both inside `PlayProvider`.

### Lifecycle

1. **Spencer arrives:** Chat window pops in with scale animation (bottom-right origin, ~300ms)
2. **Active:** All visitors can send and receive messages
3. **Spencer leaves:** System message "spencer has left" appears. Chat remains functional — visitors can keep talking
4. **Page refresh:** All chat history is lost (React state only, no persistence)

### Message Transport

Messages broadcast via play events:

```ts
dispatchPlayEvent({
  type: "chat-message",
  eventPayload: {
    text: string,
    stableId: string,
    color: string,
    name: string | undefined,
    timestamp: number,
  },
});
```

Each client:
- Stores received messages in React state (`useState<ChatMessage[]>`)
- Adds self-sent messages directly to local state
- Listens via `registerPlayEventListener("chat-message", ...)`

### Typing Indicator

Uses the `"typing"` presence channel:

```ts
playhtml.presence.setMyPresence("typing", true);
// Clear after 2s of no keystrokes
```

Displayed as a faded italic line: "[dot] is typing..."

### Identity

Users identified by their cursor color dot (same dot rendered in Stats). Name shown next to dot if set via existing `CursorPopover`. Spencer's dot glows with `box-shadow: 0 0 4px hsl(41, 100%, 50%)`.

No separate name-setting UI in chat — reuses the existing cursor identity system.

### UI Design

**Style:** AIM-inspired chat window with spencer.place aesthetic.

- **Title bar:** Golden `hsl(41, 100%, 50%)` background, "✦ spencer.place chat" label, minimize (–) and close (×) buttons. Minimize button uses a proper dash glyph, not underscore.
- **Info bar:** Below title bar, shows "N ppl here · [glowing dot] spencer is home"
- **Message area:** White background, scrollable, max-height ~300px. Messages show color dot + faded name (if set) + message text.
- **Input area:** Light gray background, text input + "send" button
- **Border:** `border: double 3px #282828` (matches site trinket style)
- **Font:** Mono (Sono/Courier New), 13px

**States:**
- **Expanded:** Full chat window
- **Minimized:** Title bar only. New messages flash the golden bar brighter (keyframe animation). Inline unread count shown as "(3)" in title bar.
- **Spencer left:** System message in chat, info bar updates to remove "spencer is home"

**Positioning:** Fixed, bottom-right corner, above footer. Width ~320px.

**Entrance animation:** Pop-in scale from bottom-right corner origin:
```css
@keyframes pop-in {
  0% { transform: scale(0); opacity: 0; transform-origin: bottom right; }
  70% { transform: scale(1.03); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
```

---

## Component Architecture

### New Components

- `LiveChat.tsx` — Chat window component. Manages message state, renders chat UI, handles send/receive via play events. Subscribes to typing presence channel.
- `LiveChat.scss` — Styles for chat window, animations, minimized state.

### Modified Components

- `Stats.tsx` — Migrate from `window.cursors` to `playhtml.presence`. Add hover popovers, click navigation, active/inactive opacity, page-based sorting.
- `CursorPresenceLayer.tsx` — Add `LiveChat` as sibling. Share Spencer detection. Add `visibilitychange` listener to broadcast active state.

### Shared/Reused

- `Popover.tsx` — Already exists, used for Stats dot hover tooltips (trigger="hover")
- `isSpencer()` — Already exists in `CursorPresenceLayer.tsx`. Extract to `src/utils/presence.ts` so both `Stats.tsx` and `LiveChat.tsx` can import it
- `playhtml.presence` API — New, from `@playhtml/react@0.10.1`

---

## Dependencies

1. Merge playhtml PR #74 and publish `@playhtml/common@0.6.0`, `playhtml@2.9.0`, `@playhtml/react@0.10.1`
2. Update `package.json` to require `@playhtml/react@^0.10.1`

---

## Edge Cases

- **Spencer has multiple tabs:** `isSpencer()` matches by identity, not tab. Multiple Spencer presences shouldn't spawn multiple chat windows — deduplicate by checking if any Spencer presence exists.
- **Messages from users who left:** Messages remain in history with their color. Dot color may no longer be in presences — render with stored color from the message payload.
- **No presences synced yet:** Stats should gracefully show empty until `hasSynced` is true. Chat should not appear until presences are synced.
- **Mobile/small screens:** Chat window should be full-width on narrow viewports. Stats dot interactions (hover) may not work — click should still navigate.
