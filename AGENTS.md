# Spencer's Website — Project Notes

## Stack
- Astro with React integration, deployed to Cloudflare
- Package manager: bun
- playhtml (`@playhtml/react`) for real-time collaborative features
- nanostores (`@nanostores/react`) for state persistence across navigation

## React Islands and View Transitions

`ViewTransitions` is enabled. `transition:persist` is set on the sidebar, footer, and PlayhtmlProvider.

**`client:only="react"` components re-mount on every navigation** even with `transition:persist`. This is a known Astro issue ([#8944](https://github.com/withastro/astro/issues/8944)). `client:load` would handle persistence better, but components needing browser APIs (`window`, `localStorage`, playhtml) can't SSR.

**Workaround: nanostores.** Put state that must survive navigation in nanostore atoms (`src/stores/`). Atoms are module-level singletons that persist when React re-mounts.

### What goes where
- **Nanostores** — state that must survive navigation: chat messages, session start time, visibility flags, accumulated data
- **React state** — ephemeral UI: input values, animation flags, hover/popover state, typing indicators

### Files
- `src/stores/chat.ts` — chat messages, visibility, minimized, spencer-left, unread count
- `src/stores/session.ts` — session start timestamp

## playhtml Presence API

`playhtml.presence` throws before `init()`. Always guard with `hasSynced` from PlayContext:

```tsx
useEffect(() => {
  if (!hasSynced) return;
  const unsub = playhtml.presence.onPresenceChange("channel", callback);
  return unsub;
}, [hasSynced]);
```

Play events (`dispatchPlayEvent`) are **page-scoped** — they only reach clients on the same page. For cross-page communication, use `playhtml.createPresenceRoom("name")` which creates a domain-scoped presence room.
