// ABOUTME: Shared list view component for displaying creations in a table format
// ABOUTME: with keyboard navigation and customizable columns

import type { CollectionEntry } from "astro:content";
import React, {
  useEffect,
  useState,
  KeyboardEvent,
  useRef,
  ReactNode,
} from "react";
import "./CreationsView.scss";

interface CreationListViewProps<T extends CollectionEntry<"creation">> {
  creations: T[];
  className?: string;
  headerClassName?: string;
  headerColumns: ReactNode | ((selectedIndex: number) => ReactNode);
  renderRow: (creation: T, index: number, isSelected: boolean) => ReactNode;
  rowKey: (creation: T) => string;
  onNavigate?: (creation: T, index: number) => void;
}

export function CreationListView<
  T extends CollectionEntry<"creation"> & {
    data: CollectionEntry<"creation">["data"] & { forthcoming: boolean };
  }
>({
  creations,
  className = "",
  headerClassName = "",
  headerColumns,
  renderRow,
  rowKey,
  onNavigate,
}: CreationListViewProps<T>) {
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: KeyboardEvent) => {
    setIsKeyboardNav(true);

    const getNextValidIndex = (
      currentIndex: number,
      direction: "up" | "down"
    ) => {
      const increment = direction === "down" ? 1 : -1;
      let nextIndex = currentIndex + increment;

      // Check bounds
      if (nextIndex < 0 || nextIndex >= creations.length) {
        return currentIndex;
      }

      return nextIndex;
    };

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => getNextValidIndex(prev, "down"));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => getNextValidIndex(prev, "up"));
        break;
      case "Enter":
        if (selectedIndex >= 0 && onNavigate) {
          onNavigate(creations[selectedIndex], selectedIndex);
        }
        break;
    }
  };

  useEffect(() => {
    if (selectedIndex === -1) return;

    const container = listContainerRef.current;
    const selectedElement = container?.querySelector(
      `[data-index="${selectedIndex}"]`
    );

    if (container && selectedElement) {
      selectedElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  const renderedHeaderColumns = typeof headerColumns === 'function'
    ? headerColumns(selectedIndex)
    : headerColumns;

  return (
    <div
      ref={listContainerRef}
      className={`creations listView ${className}`}
      onKeyDown={handleKeyDown}
      onMouseMove={() => setIsKeyboardNav(false)}
      tabIndex={0}
    >
      <div className={headerClassName || "listViewHeader"}>{renderedHeaderColumns}</div>
      {creations.map((creation, index) => (
        <div
          key={rowKey(creation)}
          data-index={index}
          onMouseEnter={() => !isKeyboardNav && setSelectedIndex(index)}
        >
          {renderRow(creation, index, index === selectedIndex)}
        </div>
      ))}
    </div>
  );
}
