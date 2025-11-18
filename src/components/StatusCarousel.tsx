import React, { useEffect, useState } from "react";
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
  previewImg?: string;
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

function getCategoryLink(category: string): string | null {
  const categoryLower = category.toLowerCase();
  if (categoryLower === "writing") return "/posts";
  if (categoryLower === "building") return "/creations";
  return null;
}

function StatusItemView({
  date,
  birthdayEpoch,
  category,
  what,
  link,
  emoji,
  previewImg,
}: StatusItem) {
  const categoryLink = getCategoryLink(category);

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
        {categoryLink ? (
          <a href={categoryLink} className="category-link">
            {emoji} {category}
          </a>
        ) : (
          <span className="category-text">
            {emoji} {category}
          </span>
        )}
      </div>
      <div className="status-content">
        {link ? (
          <a
            href={link}
            className="title-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            {what}
          </a>
        ) : (
          <div className="title">{what}</div>
        )}
        {previewImg && <img src={previewImg} alt="" className="preview-img" />}
      </div>
    </div>
  );
}

export function StatusCarousel() {
  const [items, setItems] = useState<StatusItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("https://status.spencer.place/me")
      .then((res) => res.json())
      .then((data) => {
        setItems(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="status-loading">
        Loading...
      </div>
    );
  }

  return (
    <Carousel
      items={items}
      renderItem={(item) => <StatusItemView {...item} />}
      middleText="SPENCER'S STATUS"
    />
  );
}
