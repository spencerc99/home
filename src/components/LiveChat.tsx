// ABOUTME: AIM-style live chat window that appears when Spencer is on the site.
// ABOUTME: Uses nanostores for state persistence across Astro view transitions.

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PlayContext, playhtml, useCursorPresences, usePresenceRoom } from "@playhtml/react";
import { useStore } from "@nanostores/react";
import {
  isSpencer,
  SPENCER_COLOR,
  getSpencerStableId,
  getSpencerChatStatus,
} from "../utils/presence";
import {
  $chatMessages,
  $chatVisible,
  $chatMinimized,
  $chatSpencerLeft,
  $chatUnreadCount,
  $chatDismissed,
  type ChatMessage,
} from "../stores/chat";
import "./LiveChat.scss";

const URL_PATTERN = /(https?:\/\/[^\s<>"']+[^\s<>"'.,!?)\]}])/g;

function renderMessageText(text: string): React.ReactNode {
  const parts = text.split(URL_PATTERN);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <a
          key={i}
          className="noanchor"
          href={part}
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export function LiveChat() {
  const { hasSynced } = useContext(PlayContext);
  const cursorPresences = useCursorPresences();
  const room = usePresenceRoom("chat");
  const messages = useStore($chatMessages);
  const visible = useStore($chatVisible);
  const minimized = useStore($chatMinimized);
  const spencerLeft = useStore($chatSpencerLeft);
  const unreadCount = useStore($chatUnreadCount);
  const dismissed = useStore($chatDismissed);
  const [inputValue, setInputValue] = useState("");
  const [name, setName] = useState(() => window.cursors?.name ?? "");
  const [myColor, setMyColor] = useState(() => window.cursors?.color ?? "#888");
  const [flashTitlebar, setFlashTitlebar] = useState(false);
  const [typingStableIds, setTypingStableIds] = useState<Set<string>>(new Set());
  const [activePresences, setActivePresences] = useState<
    Map<string, { active?: boolean }>
  >(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const minimizedRef = useRef(false);
  minimizedRef.current = minimized;
  // Stable IDs (→ {name, color}) of people who have sent a chat message this
  // session. Used to scope "left" notifications to participants — silent lurkers
  // don't get goodbyes. Cached here so we can still label a leave after the user
  // has dropped from cursorPresences.
  const participantsRef = useRef<Map<string, { name?: string; color: string }>>(
    new Map(),
  );
  // Snapshot of stable IDs present last tick, for diffing arrivals vs departures.
  const prevStableIdsRef = useRef<Set<string> | null>(null);
  // Stable IDs we've already announced as joined / left. Each stable ID only
  // gets announced once per kind, so view-transition churn or brief disconnects
  // can't spam duplicate notices. Seeded from persisted messages on mount so
  // dedup survives Astro remounts (refs reset, but the message log doesn't).
  const announcedJoinsRef = useRef<Set<string> | null>(null);
  const announcedLeavesRef = useRef<Set<string> | null>(null);

  const spencerStableId = useMemo(
    () => getSpencerStableId(cursorPresences),
    [cursorPresences],
  );
  const spencerChatStatus = useMemo(
    () => getSpencerChatStatus(cursorPresences, activePresences),
    [cursorPresences, activePresences],
  );

  // Keep the displayed name and color in sync with updates from elsewhere (Stats, Guestbook)
  useEffect(() => {
    if (!hasSynced || !window.cursors) return;
    setName(window.cursors.name ?? "");
    setMyColor(window.cursors.color ?? "#888");
    const handleName = (next?: string) => setName(next ?? "");
    const handleColor = (next?: string) => setMyColor(next ?? "#888");
    window.cursors.on("name", handleName);
    window.cursors.on("color", handleColor);
    return () => {
      window.cursors?.off("name", handleName);
      window.cursors?.off("color", handleColor);
    };
  }, [hasSynced]);

  const handleNameChange = useCallback((next: string) => {
    setName(next);
    if (window.cursors) {
      window.cursors.name = next;
    }
  }, []);

  useEffect(() => {
    if (!hasSynced) return;
    const unsub = playhtml.presence.onPresenceChange("active", (presences) => {
      const next = new Map<string, { active?: boolean }>();
      for (const [stableId, view] of presences) {
        next.set(stableId, { active: (view as any).active });
      }
      setActivePresences(next);
    });
    return unsub;
  }, [hasSynced]);

  // Show chat when Spencer arrives
  useEffect(() => {
    if (!hasSynced) return;
    if (dismissed) return;
    if (spencerChatStatus !== "absent" && !visible) {
      $chatVisible.set(true);
      $chatSpencerLeft.set(false);
      $chatMessages.set([
        ...$chatMessages.get(),
        {
          id: `system-${Date.now()}`,
          text: "spencer just arrived",
          stableId: "",
          color: "",
          timestamp: Date.now(),
          type: "system",
        },
      ]);
    } else if (spencerChatStatus === "absent" && visible && !spencerLeft) {
      $chatSpencerLeft.set(true);
      $chatMessages.set([
        ...$chatMessages.get(),
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
  }, [spencerChatStatus, hasSynced, visible, spencerLeft, dismissed]);

  // HACK: Using presence channel for messaging because play events are page-scoped,
  // not domain-scoped. Each user's latest message is set as their "chat-msg" presence,
  // and we accumulate messages locally by deduping on ID. This means new joiners see
  // stale "last messages" from existing presences, so we filter by joinedAt timestamp.
  // Ideally playhtml would support domain-scoped events (not just presence) so we
  // could use dispatchPlayEvent across pages without this workaround.
  useEffect(() => {
    if (!room) return;
    const joinedAt = Date.now();
    const unsub = room.presence.onPresenceChange("chat-msg", (presences) => {
      for (const [, view] of presences) {
        const msg = (view as any)["chat-msg"] as {
          text: string;
          stableId: string;
          color: string;
          name?: string;
          timestamp: number;
        } | undefined;
        if (!msg?.text || msg.timestamp < joinedAt) continue;
        if (msg.stableId) {
          participantsRef.current.set(msg.stableId, {
            name: msg.name,
            color: msg.color || "#888",
          });
        }
        const msgId = `msg-${msg.timestamp}-${msg.stableId}`;
        const current = $chatMessages.get();
        if (current.some((m) => m.id === msgId)) continue;
        const newMsg: ChatMessage = {
          id: msgId,
          text: msg.text,
          stableId: msg.stableId,
          color: msg.color,
          name: msg.name,
          timestamp: msg.timestamp,
          type: "message",
        };
        $chatMessages.set([...current, newMsg]);
        if (minimizedRef.current) {
          $chatUnreadCount.set($chatUnreadCount.get() + 1);
          setFlashTitlebar(true);
          setTimeout(() => setFlashTitlebar(false), 600);
        }
      }
    });
    return unsub;
  }, [room]);

  // Announce joins/leaves. Show "joined" for any new arrival (excluding self and
  // spencer, who has dedicated handling). Show "left" only for participants who
  // have actually sent a message this session.
  useEffect(() => {
    if (!hasSynced) return;
    if (!visible) {
      // Reset the per-tick snapshot on hide so a future reopen starts fresh.
      // The announced-* sets are NOT cleared — they survive a reopen, and are
      // re-seeded from persisted messages below on the next mount.
      prevStableIdsRef.current = null;
      return;
    }

    // Seed announced-* and participants from persisted messages on first run
    // after mount, so dedup + participant identity survive Astro view-transition
    // remounts (refs reset, the message store doesn't).
    if (announcedJoinsRef.current === null) {
      const joins = new Set<string>();
      const leaves = new Set<string>();
      for (const m of $chatMessages.get()) {
        if (m.type === "message" && m.stableId) {
          participantsRef.current.set(m.stableId, {
            name: m.name,
            color: m.color || "#888",
          });
        } else if (m.type === "system" && m.stableId) {
          if (m.id.startsWith("system-join-")) joins.add(m.stableId);
          else if (m.id.startsWith("system-leave-")) leaves.add(m.stableId);
        }
      }
      announcedJoinsRef.current = joins;
      announcedLeavesRef.current = leaves;
    }

    const myStableId = playhtml.presence.getMyIdentity()?.publicKey ?? "";
    const currentIds = new Set(cursorPresences.keys());

    // First run after open: snapshot everyone currently present without
    // announcing them — they were here before us. If presences haven't loaded
    // yet (size 0), wait for the next tick rather than snapshot empty (which
    // would announce everyone as fresh arrivals on the next tick).
    if (prevStableIdsRef.current === null) {
      if (currentIds.size === 0) return;
      prevStableIdsRef.current = currentIds;
      // Treat the initial snapshot as already-announced so subsequent remounts
      // (which clear the ref) don't re-announce these stable IDs as joining.
      for (const stableId of currentIds) {
        announcedJoinsRef.current.add(stableId);
      }
      return;
    }

    const prev = prevStableIdsRef.current;
    const announcements: ChatMessage[] = [];

    for (const stableId of currentIds) {
      if (prev.has(stableId)) continue;
      if (stableId === myStableId) continue;
      if (stableId === spencerStableId) continue;
      if (announcedJoinsRef.current.has(stableId)) continue;
      announcedJoinsRef.current.add(stableId);
      const presence = cursorPresences.get(stableId);
      const name = presence?.playerIdentity?.name;
      const color =
        presence?.playerIdentity?.playerStyle.colorPalette[0] ?? "#888";
      announcements.push({
        id: `system-join-${stableId}-${Date.now()}`,
        text: name ? `${name} joined` : "joined",
        stableId,
        color,
        timestamp: Date.now(),
        type: "system",
      });
    }
    for (const stableId of prev) {
      if (currentIds.has(stableId)) continue;
      if (stableId === myStableId) continue;
      const participant = participantsRef.current.get(stableId);
      if (!participant) continue;
      if (announcedLeavesRef.current.has(stableId)) continue;
      announcedLeavesRef.current.add(stableId);
      announcements.push({
        id: `system-leave-${stableId}-${Date.now()}`,
        text: participant.name ? `${participant.name} left` : "left",
        stableId,
        color: participant.color,
        timestamp: Date.now(),
        type: "system",
      });
    }

    prevStableIdsRef.current = currentIds;
    if (announcements.length > 0) {
      $chatMessages.set([...$chatMessages.get(), ...announcements]);
    }
  }, [cursorPresences, hasSynced, visible, spencerStableId]);

  // Listen for typing presence changes via chat room
  useEffect(() => {
    if (!room) return;
    const unsub = room.presence.onPresenceChange("typing", (presences) => {
      const typing = new Set<string>();
      for (const [stableId, view] of presences) {
        if ((view as any).typing && !(view as any).isMe) {
          typing.add(stableId);
        }
      }
      setTypingStableIds(typing);
    });
    return unsub;
  }, [room]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingStableIds]);

  const sendMessage = useCallback(() => {
    const text = inputValue.trim();
    if (!text || !room) return;

    const myIdentity = room.presence.getMyIdentity();
    const color = myIdentity?.playerStyle.colorPalette[0] ?? "#888";
    const stableId = myIdentity?.publicKey ?? "";
    const name = myIdentity?.name;
    const timestamp = Date.now();

    // Broadcast via presence room — the listener will pick it up and dedup
    room.presence.setMyPresence("chat-msg", { text, stableId, color, name, timestamp });

    setInputValue("");
    room.presence.setMyPresence("typing", null);
  }, [inputValue, room]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      if (!room) return;
      room.presence.setMyPresence("typing", true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        room.presence.setMyPresence("typing", null);
      }, 2000);
    },
    [room],
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
    $chatMinimized.set(false);
    $chatUnreadCount.set(0);
  }, []);

  const handleClose = useCallback(() => {
    $chatVisible.set(false);
    $chatDismissed.set(true);
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
        <div className="live-chat-titlebar" onClick={() => $chatMinimized.set(true)}>
          <span>✦ spencer.place chat</span>
        </div>
        <div className="live-chat-infobar">
          <span className="live-chat-you">
            <span
              className="live-chat-dot"
              style={{ backgroundColor: myColor }}
            />
            <input
              className="live-chat-name-input"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="set a name..."
              maxLength={20}
            />
          </span>
          {" · "}
          {pplCount} ppl here
          {spencerChatStatus !== "absent" && (
            <>
              {" "}·{" "}
              <span
                className={`live-chat-spencer-status ${
                  spencerChatStatus === "away" ? "away" : ""
                }`}
              >
                <span
                  className="live-chat-dot live-chat-spencer-dot"
                  style={{
                    width: "6px",
                    height: "6px",
                    backgroundColor: SPENCER_COLOR,
                    boxShadow: `0 0 3px ${SPENCER_COLOR}`,
                  }}
                />
                {spencerChatStatus === "away" && (
                  <span className="live-chat-away-mark">Z z z</span>
                )}
                {spencerChatStatus === "away" ? "spencer is away" : "spencer home"}
              </span>
            </>
          )}
        </div>
        <div className="live-chat-messages">
          {messages.map((msg) => {
            if (msg.type === "system") {
              return (
                <div key={msg.id} className="live-chat-message system">
                  {msg.color && (
                    <span
                      className="live-chat-dot"
                      style={{ backgroundColor: msg.color }}
                    />
                  )}
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
                <span className="live-chat-text">
                  {renderMessageText(msg.text)}
                </span>
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
