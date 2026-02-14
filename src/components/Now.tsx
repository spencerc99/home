import React from "react";

/** Each item is rendered as "- " + content (content may contain HTML). */
export interface NowEntry {
  date: string;
  items: string[];
}

interface NowBlockProps {
  entry: NowEntry;
  /** When true, shows a small "see history" link to /now. Default true. */
  showHistoryLink?: boolean;
}

/** Formats ISO date (YYYY-MM-DD) to MM-DD-YY for display. */
export function formatNowDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  const yy = y.slice(-2);
  return `${m}-${d}-${yy}`;
}

export function NowBlock({ entry, showHistoryLink = true }: NowBlockProps) {
  const displayDate = formatNowDate(entry.date);

  return (
    <div className="now" style={{ position: "relative" }}>
      <div id="nowTitle">
        <span id="new">NOW</span>{" "}
        <span
          style={{
            float: "right",
            marginRight: "6px",
          }}
          className="descriptionText"
        >
          Updated {displayDate}
        </span>
      </div>
      {entry.items.map((item, i) => (
        <p key={i}>
          - <span dangerouslySetInnerHTML={{ __html: item }} />
        </p>
      ))}
      {showHistoryLink && (
        <div style={{ textAlign: "right", marginTop: "0.5em" }}>
          <a href="/now" className="descriptionText" style={{ fontSize: "0.9em", opacity: 0.85 }}>
            see history
          </a>
        </div>
      )}
    </div>
  );
}
