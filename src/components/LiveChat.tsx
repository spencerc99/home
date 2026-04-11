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
import type { PresenceRoom } from "@playhtml/common";
import { isSpencer, SPENCER_COLOR, getSpencerStableId } from "../utils/presence";
import "./LiveChat.scss";

let chatRoom: PresenceRoom | null = null;
function getChatRoom(): PresenceRoom {
  if (!chatRoom) {
    chatRoom = playhtml.createPresenceRoom("chat");
  }
  return chatRoom;
}

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
  const { hasSynced } =
    useContext(PlayContext);
  const cursorPresences = useCursorPresences();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [minimized, setMinimized] = useState(false);
  const [visible, setVisible] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(true);
  const [spencerLeft, setSpencerLeft] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
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

  // Listen for chat messages via presence room
  useEffect(() => {
    if (!hasSynced) return;
    const room = getChatRoom();
    const unsub = room.presence.onPresenceChange("chat-msg", (presences) => {
      for (const [, view] of presences) {
        const msg = (view as any)["chat-msg"] as {
          text: string;
          stableId: string;
          color: string;
          name?: string;
          timestamp: number;
        } | undefined;
        if (!msg?.text) continue;
        const msgId = `msg-${msg.timestamp}-${msg.stableId}`;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msgId)) return prev;
          const newMsg: ChatMessage = {
            id: msgId,
            text: msg.text,
            stableId: msg.stableId,
            color: msg.color,
            name: msg.name,
            timestamp: msg.timestamp,
            type: "message",
          };
          if (minimizedRef.current) {
            setUnreadCount((c) => c + 1);
            setFlashTitlebar(true);
            setTimeout(() => setFlashTitlebar(false), 600);
          }
          return [...prev, newMsg];
        });
      }
    });
    return unsub;
  }, [hasSynced]);

  // Listen for typing presence changes via chat room
  useEffect(() => {
    if (!hasSynced) return;
    const room = getChatRoom();
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
  }, [hasSynced]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingStableIds]);

  const sendMessage = useCallback(() => {
    const text = inputValue.trim();
    if (!text) return;

    const room = getChatRoom();
    const myIdentity = room.presence.getMyIdentity();
    const color = myIdentity?.playerStyle.colorPalette[0] ?? "#888";
    const stableId = myIdentity?.publicKey ?? "";
    const name = myIdentity?.name;
    const timestamp = Date.now();

    // Broadcast via presence room — the listener will pick it up and dedup
    room.presence.setMyPresence("chat-msg", { text, stableId, color, name, timestamp });

    setInputValue("");
    room.presence.setMyPresence("typing", null);
  }, [inputValue]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      const room = getChatRoom();
      room.presence.setMyPresence("typing", true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        room.presence.setMyPresence("typing", null);
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
      <div className={`live-chat${shouldAnimate ? " animate-entrance" : ""}`} onAnimationEnd={() => setShouldAnimate(false)}>
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
        <div className="live-chat-titlebar" onClick={() => setMinimized(true)}>
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
