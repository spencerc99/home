import React, { useState, useEffect } from "react";
import "./Carousel.scss";

interface CarouselProps<T> {
  items: T[] | null; // null if loading or failed
  renderItem: (item: T) => React.ReactNode;
  transitionInterval?: number;
  middleText?: string;
  className?: string;
  maxVisibleSteps?: number;
}

export function Carousel<T>({
  items: initialItems,
  renderItem,
  transitionInterval = 5000,
  middleText,
  className,
  maxVisibleSteps = 10,
}: CarouselProps<T>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const items = initialItems || [];

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPaused) {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
      }
    }, transitionInterval);

    return () => clearInterval(interval);
  }, [items.length, isPaused, transitionInterval]);

  // Calculate which dots to show
  const getVisibleDots = () => {
    const totalDots = items.length;
    if (totalDots <= maxVisibleSteps) {
      return Array.from({ length: totalDots }, (_, i) => i);
    }

    const halfVisible = Math.floor(maxVisibleSteps / 2);
    let start = Math.max(0, currentIndex - halfVisible);
    let end = Math.min(totalDots - 1, start + maxVisibleSteps - 1);

    // Adjust start if we're near the end
    if (end === totalDots - 1) {
      start = Math.max(0, end - maxVisibleSteps + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  return (
    <div
      className={`carousel ${className || ""}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="screen-content">
        {initialItems === null ? (
          <div>loading...</div>
        ) : (
          renderItem(items[currentIndex])
        )}
      </div>
      <div className="carousel-footer">
        <div className="carousel-controls">
          <button
            onClick={() =>
              setCurrentIndex((prevIndex) =>
                prevIndex === 0 ? items.length - 1 : prevIndex - 1
              )
            }
            className="control-btn"
            title="Previous"
          >
            ◀
          </button>
          <div className="status-indicator">
            {getVisibleDots().map((index) => (
              <span
                key={index}
                className={`dot ${index === currentIndex ? "active" : ""}`}
                onClick={() => setCurrentIndex(index)}
                title={`Item ${index + 1}`}
              />
            ))}
          </div>
          <button
            onClick={() =>
              setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length)
            }
            className="control-btn"
            title="Next"
          >
            ▶
          </button>
        </div>
        <div className="status-count">
          {currentIndex + 1}/{items.length}
        </div>
        {middleText && <div className="middle-text">{middleText}</div>}
      </div>
    </div>
  );
}
