import { PlayProvider, withSharedState } from "@playhtml/react";
import { Footnote } from "../Footnote";
import { useStickyState } from "../../hooks/useStickyState";
import { useTime } from "../../hooks/useTime";
import "./Guestbook.scss";
import React, { useMemo, useState } from "react";

interface GuestbookEntry {
  name: string;
  color?: string;
  message: string;
  timestamp: number;
}

interface GuestbookEntryViewProps
  extends Omit<GuestbookEntry, "name" | "message"> {
  message: string | React.ReactNode;
  name: string | React.ReactNode;
}

const GuestbookTimeout = 1000 * 60 * 60 * 24 * 1; // 1 day

function getDateString(timestamp: number) {
  const entryDate = new Date(timestamp);
  const time = entryDate.toTimeString().split(" ")[0];
  const isToday = entryDate.toDateString() === new Date().toDateString();
  // TODO: this is naive and incorrect but works most of the time lol
  const now = new Date();
  let dateString = "";
  if (
    now.getFullYear() !== entryDate.getFullYear() ||
    now.getMonth() !== entryDate.getMonth()
  ) {
    dateString = "Sometime before";
  } else if (isToday) {
    dateString = "Today";
  } else if (now.getDate() - entryDate.getDate() === 1) {
    dateString = "Yesterday";
  } else if (now.getDate() - entryDate.getDate() < 7) {
    dateString = "This week";
  } else {
    dateString = "Sometime before";
  }

  return `${dateString} at ${time}`;
}

function GuestbookEntryView({
  name,
  color,
  message,
  timestamp,
}: GuestbookEntryViewProps) {
  const dateString = getDateString(timestamp);
  return (
    <div className="guestbookEntry">
      <span
        style={{
          marginBottom: ".2em",
        }}
      >
        <em>Dear spencer,</em>
      </span>
      <div className="guestbookEntryMessage">{message}</div>
      <div className="guestbookEntrySignoff">
        <span className="guestbookEntryTimestamp">{dateString}</span>
        <span
          className="guestbookEntryName"
          style={{ color, textAlign: "right" }}
        >
          {name}
        </span>
      </div>
    </div>
  );
}
const EntriesPerPage = 1;

export const GuestbookImpl = withSharedState(
  {
    defaultData: [] as GuestbookEntry[],
  },
  ({ data, setData }) => {
    const [name, setName] = useStickyState<string | null>(
      "username",
      null,
      (newName) => {
        window.cursors?.setName(newName);
      }
    );
    const [message, setMessage] = useState("");
    const [currentIndex, setCurrentIndex] = useState(0);

    const next = () => {
      if (currentIndex + EntriesPerPage < data.length) {
        setCurrentIndex(currentIndex + EntriesPerPage);
      }
    };

    const prev = () => {
      if (currentIndex - EntriesPerPage >= 0) {
        setCurrentIndex(currentIndex - EntriesPerPage);
      }
    };

    function submitMessage() {
      const nameInput = name;
      const messageInput = message;

      if (!nameInput || !messageInput) {
        return;
      }

      const nameTransformed = nameInput.trim();
      const messageTransformed = messageInput.trim();

      if (nameTransformed === "") {
        alert("Name cannot be empty.");
        return;
      }

      if (messageTransformed === "") {
        alert("Message cannot be empty.");
        return;
      }

      const newEntry: GuestbookEntry = {
        name: nameTransformed,
        color: window?.cursors?.color,
        message: messageTransformed,
        timestamp: Date.now(),
      };

      setData([...sortedData, newEntry]);
      setMessage("");
    }

    const sortedData = useMemo(
      () => data.sort((a, b) => b.timestamp - a.timestamp),
      [data]
    );

    const time = useTime();

    return (
      <div id="guestbook">
        <h3>
          my guestbook
          <Footnote
            isHtmlCaption
            caption="a guestbook made with <a href='/creation/playhtml'>playhtml</a>"
          ></Footnote>
        </h3>
        {sortedData.length > 0 && (
          <>
            <div className="guestbookEntries">
              {sortedData
                .slice(currentIndex, currentIndex + EntriesPerPage)
                .map((entry) => (
                  <GuestbookEntryView key={entry.timestamp} {...entry} />
                ))}
            </div>
            <div className="carouselControls">
              <button onClick={prev} disabled={currentIndex === 0}>
                Previous
              </button>
              <button
                onClick={next}
                disabled={currentIndex + EntriesPerPage >= data.length}
              >
                Next
              </button>
            </div>
          </>
        )}
        <span>
          leave a nice message for me! i'll be reviewing submissions :)
        </span>
        <div className="guestbookActions">
          <GuestbookEntryView
            timestamp={time}
            name={
              <input
                className="guestbookEntryName"
                type="text"
                placeholder="your name..."
                maxLength={20}
                value={name || ""}
                onChange={(e) => setName(e.target.value)}
                style={{
                  color: window?.cursors?.color,
                }}
              />
            }
            message={
              <textarea
                placeholder="your message..."
                maxLength={500}
                style={{
                  minHeight: "200px",
                  width: "100%",
                }}
                value={message || ""}
                onChange={(e) => setMessage(e.target.value)}
              />
            }
            color={window?.cursors?.color || "black"}
          />

          <button onClick={submitMessage}>Submit</button>
        </div>
      </div>
    );
  }
);

export function Guestbook() {
  return (
    <PlayProvider>
      <GuestbookImpl />
    </PlayProvider>
  );
}
