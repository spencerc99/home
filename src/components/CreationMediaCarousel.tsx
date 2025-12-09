import React, { useEffect, useState } from "react";
import { ImageOrVideo } from "./ImageOrVideo";
import { maybeTransformImgixUrl } from "../utils/images";
import "./CreationMediaCarousel.scss";

interface MediaItem {
  src: string;
  type: "image" | "video";
  title: string;
  date: Date | null;
  id: string;
  link?: string;
  descriptionMd?: string;
}

interface Props {
  mediaItems: MediaItem[];
  cycleSpeed?: number; // milliseconds between transitions
  className?: string;
}

export function CreationMediaCarousel({
  mediaItems,
  cycleSpeed = 3000,
  className = "",
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (mediaItems.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % mediaItems.length);
    }, cycleSpeed);

    return () => clearInterval(interval);
  }, [mediaItems.length, cycleSpeed]);

  if (mediaItems.length === 0) {
    return null;
  }

  const currentMedia = mediaItems[currentIndex];
  const internalLink = currentMedia.descriptionMd
    ? `/creation/${currentMedia.id}`
    : currentMedia.link;

  const year = currentMedia.date
    ? new Date(currentMedia.date).getFullYear()
    : null;

  return (
    <div className={`creation-media-carousel ${className}`}>
      <div className="carousel-container">
        {mediaItems.map((item, index) => {
          const transformedSrc = maybeTransformImgixUrl(item.src, {
            auto: "format,compress",
            fit: "max",
            w: "800",
          });
          return (
            <div
              key={`${item.src}-${index}`}
              className={`carousel-item ${
                index === currentIndex ? "active" : ""
              }`}
            >
              <ImageOrVideo
                src={transformedSrc}
                type={item.type}
                withZoom={false}
                className="carousel-media"
                autoPlay
                muted
                loop
                playsInline
                controls={false}
              />
            </div>
          );
        })}
      </div>
      <div className="carousel-caption">
        <span className="carousel-title">{currentMedia.title}</span>
        {year && <span className="carousel-year">, {year}</span>}
        {internalLink && (
          <a href={internalLink} className="carousel-title">
            {" "}
            (info)
          </a>
        )}
      </div>
    </div>
  );
}
