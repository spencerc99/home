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
import { PlayContext, useCursorPresences, usePresenceRoom } from "@playhtml/react";
import { useStore } from "@nanostores/react";
import { isSpencer, SPENCER_COLOR, getSpencerStableId } from "../utils/presence";
import {
  $chatMessages,
  $chatVisible,
  $chatMinimized,
  $chatSpencerLeft,
  $chatUnreadCount,
  type ChatMessage,
} from "../stores/chat";
import "./LiveChat.scss";

export function LiveChat() {
  const { hasSynced } = useContext(PlayContext);
  const cursorPresences = useCursorPresences();
  const room = usePresenceRoom("chat");
  const messages = useStore($chatMessages);
  const visible = useStore($chatVisible);
  const minimized = useStore($chatMinimized);
  const spencerLeft = useStore($chatSpencerLeft);
  const unreadCount = useStore($chatUnreadCount);
  const [inputValue, setInputValue] = useState("");
  const [flashTitlebar, setFlashTitlebar] = useState(false);
  const [typingStableIds, setTypingStableIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const minimizedRef = useRef(false);
  minimizedRef.current = minimized;

  const spencerStableId = useMemo(
    () => getSpencerStableId(cursorPresences),
    [cursorPresences],
  );

  // Show chat when Spencer arrives
  useEffect(() => {
    if (!hasSynced) return;
    if (spencerStableId && !visible) {
      $chatVisible.set(true);
      $chatSpencerLeft.set(false);
      $chatMessages.set([
        ...messages,
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
      $chatSpencerLeft.set(true);
      $chatMessages.set([
        ...messages,
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
            {spencerLeft && (
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
            )}
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
          {spencerLeft && (
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
          )}
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
