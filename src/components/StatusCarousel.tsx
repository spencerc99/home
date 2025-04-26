import React from "react";
import { Carousel } from "./Carousel";
import { Footnote } from "./Footnote";
import "./StatusCarousel.scss";

interface StatusItem {
  date: string;
  birthdayEpoch: string;
  category: string;
  what: string;
  link?: string;
  emoji: string;
}

function formatDate(date: Date) {
  return date
    .toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(", ", "|")
    .replace("/", ".");
}

function StatusItemView({
  date,
  birthdayEpoch,
  category,
  what,
  link,
  emoji,
}: StatusItem) {
  return (
    <div className="status-card">
      <div className="header">
        <Footnote
          caption="this is a set of live attributes from what I consume and make streamed to this little status bar. The numbers represent Spencer epoch time, a play on UNIX epoch."
          asChild
        >
          <div className="timestamp">
            [{formatDate(new Date(date))}]
            <span className="epoch">{birthdayEpoch}</span>
          </div>
        </Footnote>
        <div className="category-badge">
          {emoji} {category}
        </div>
      </div>
      <div className="title">{what}</div>
      {link && (
        <a
          href={link}
          className="status-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {new URL(link).hostname}
        </a>
      )}
    </div>
  );
}

interface StatusCarouselProps {
  items: StatusItem[] | null;
}

export function StatusCarousel({ items }: StatusCarouselProps) {
  return (
    <Carousel
      items={items}
      renderItem={(item) => <StatusItemView {...item} />}
      middleText="SPENCER.STATUS.v1"
    />
  );
}
