import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./Carousel.scss";

interface CarouselProps<T> {
  items: T[] | null; // null if loading or failed
  renderItem: (item: T) => React.ReactNode;
  transitionInterval?: number;
  shouldAutoTransition?: boolean;
  middleText?: string;
  className?: string;
  maxVisibleSteps?: number;
}

export function Carousel<T>({
  items: initialItems,
  renderItem,
  transitionInterval = 5000,
  shouldAutoTransition = true,
  middleText,
  className,
  maxVisibleSteps = 10,
}: CarouselProps<T>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right
  const [isPaused, setIsPaused] = useState(false);
  const items = initialItems || [];

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPaused && shouldAutoTransition) {
        setDirection(1);
        setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
      }
    }, transitionInterval);

    return () => clearInterval(interval);
  }, [items.length, isPaused, transitionInterval, shouldAutoTransition]);

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

  const slideVariants = {
    enter: (direction: number) => ({
      position: "absolute",
      width: "100%",
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      position: "relative",
      width: "100%",
      x: 0,
      opacity: 1,
      zIndex: 1,
    },
    exit: (direction: number) => ({
      position: "absolute",
      width: "100%",
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0,
      zIndex: 0,
    }),
  };

  const handlePrevious = () => {
    setDirection(-1);
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? items.length - 1 : prevIndex - 1
    );
  };

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
  };

  return (
    <div
      className={`carousel ${className || ""}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="screen-content"
        style={{ position: "relative", overflow: "hidden" }}
      >
        <AnimatePresence initial={false} custom={direction}>
          {initialItems === null ? (
            <div>loading...</div>
          ) : (
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: {
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                  duration: 0.3,
                },
                opacity: { duration: 0.2 },
              }}
            >
              {renderItem(items[currentIndex])}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="carousel-footer">
        <div className="carousel-controls">
          <button
            onClick={handlePrevious}
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
                onClick={() => {
                  setDirection(index > currentIndex ? 1 : -1);
                  setCurrentIndex(index);
                }}
                title={`Item ${index + 1}`}
              />
            ))}
          </div>
          <button onClick={handleNext} className="control-btn" title="Next">
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
