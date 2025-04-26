import type { CollectionEntry } from "astro:content";
import React, {
  useEffect,
  useMemo,
  useState,
  KeyboardEvent,
  useRef,
} from "react";
import { CreationSummary } from "../CreationSummary";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import "./CreationsView.scss";
import { EventCreationsList } from "../EventCreationsList";

export enum ViewType {
  // FREE = "free",
  GRID = "grid",
  LIST = "list",
}

export enum DescriptionType {
  Selected = "selected",
}

const TwoColumnsColumnCountBreakPoints = {
  350: 1,
  600: 2,
  900: 3,
  1024: 1,
  1250: 2,
  1500: 3,
  1900: 4,
  2400: 5,
};
const OneColumnColumnCountBreakPoints = {
  350: 1,
  600: 2,
  900: 3,
  1024: 4,
  1250: 5,
};

function getDescriptionForDescriptionType(descriptionType?: DescriptionType) {
  switch (descriptionType) {
    case DescriptionType.Selected:
      return (
        <i>
          selected works I've given energy to.{" "}
          <a href="/creation">see everything</a>
        </i>
      );
    default:
      return <i>that which ive given life energy to</i>;
  }
}

interface Props {
  creations: Array<
    CollectionEntry<"creations">["data"] & {
      id: string;
    }
  >;
  description?: DescriptionType;
  // Accounts for if it is in display with something else
  columns: 1 | 2;
}

export function CreationsView({ creations, description, columns }: Props) {
  const [view, setView] = useState(ViewType.GRID);
  const [category, setCategory] = useState("all");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);
  const allCategories = new Set(
    creations.map((creation) => creation.data.parentCategory).filter(Boolean)
  );

  const eventCreations = creations
    .filter((creation) => creation.data.isEvent && creation.data.forthcoming)
    .reverse();
  const nonEventCreations = creations.filter(
    (creation) => !creation.data.isEvent || !creation.data.forthcoming
  );

  const columnsCountBreakPoints = useMemo(() => {
    return columns === 1
      ? OneColumnColumnCountBreakPoints
      : TwoColumnsColumnCountBreakPoints;
  }, [columns]);

  const sortedNonEventCreations = useMemo(() => {
    return [...nonEventCreations].sort((a, b) => {
      // First handle forthcoming
      const multiplier = sortDirection === "asc" ? 1 : -1;
      if (a.data.forthcoming !== b.data.forthcoming) {
        return (a.data.forthcoming ? 1 : -1) * multiplier;
      }

      // Then handle ongoing
      if (a.data.ongoing !== b.data.ongoing) {
        return (a.data.ongoing ? 1 : -1) * multiplier;
      }

      // For regular dates, prefer end date, fallback to start date
      const dateA = new Date(a.data.endDate || a.data.date || 0);
      const dateB = new Date(b.data.endDate || b.data.date || 0);

      return (dateA.getTime() - dateB.getTime()) * multiplier;
    });
  }, [nonEventCreations, sortDirection]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (view !== ViewType.LIST) return;

    setIsKeyboardNav(true);

    const getNextValidIndex = (
      currentIndex: number,
      direction: "up" | "down"
    ) => {
      const increment = direction === "down" ? 1 : -1;
      let nextIndex = currentIndex;

      while (true) {
        nextIndex += increment;

        // Check bounds
        if (nextIndex < 0 || nextIndex >= sortedNonEventCreations.length) {
          return currentIndex;
        }

        // If we're showing all categories or if the item matches current category
        if (
          category === "all" ||
          sortedNonEventCreations[nextIndex].data.parentCategory === category
        ) {
          return nextIndex;
        }
      }
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
        if (selectedIndex >= 0) {
          window.location.href = `/creation/${sortedNonEventCreations[selectedIndex].id}`;
        }
        break;
    }
  };

  // Add ref for the list container
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Add effect to handle scrolling when selection changes
  useEffect(() => {
    if (view !== ViewType.LIST || selectedIndex === -1) return;

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
  }, [selectedIndex, view]);

  const filteredCreations = useMemo(() => {
    return sortedNonEventCreations.filter(
      (creation) =>
        category === "all" || creation.data.parentCategory === category
    );
  }, [sortedNonEventCreations, category]);
  const normalizedSelectedIndex = useMemo(() => {
    return selectedIndex === -1
      ? -1
      : filteredCreations.findIndex(
          (c) => c.id === sortedNonEventCreations[selectedIndex].id
        );
  }, [filteredCreations, sortedNonEventCreations, selectedIndex]);

  function renderCreations() {
    switch (view) {
      case ViewType.LIST:
        return (
          <div
            ref={listContainerRef}
            className="creations listView"
            onKeyDown={handleKeyDown}
            onMouseMove={() => setIsKeyboardNav(false)} // Reset to mouse mode on mouse movement
            tabIndex={0}
          >
            <div className="listViewHeader">
              <div>
                {normalizedSelectedIndex > -1
                  ? normalizedSelectedIndex + 1
                  : "?"}
                /{filteredCreations.length}
              </div>
              <div>What</div>
              <div
                onClick={() =>
                  setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
                }
                style={{ cursor: "pointer" }}
              >
                When{sortDirection === "asc" ? "↑" : "↓"}
              </div>
              <div>teaser</div>
              <div>Kind</div>
            </div>
            {sortedNonEventCreations.map((creation, index) => (
              <div
                key={creation.id}
                data-index={index}
                onMouseEnter={() => !isKeyboardNav && setSelectedIndex(index)}
              >
                <CreationSummary
                  creation={{
                    id: creation.id,
                    ...creation.data,
                  }}
                  isFiltered={
                    category !== "all" &&
                    creation.data.parentCategory !== category
                  }
                  view={view}
                  isSelected={index === selectedIndex}
                />
              </div>
            ))}
          </div>
        );
      case ViewType.GRID:
        return (
          <div className="creationsMasonry">
            <ResponsiveMasonry
              columnsCountBreakPoints={columnsCountBreakPoints}
            >
              <Masonry gutter="2em">
                {nonEventCreations.map((creation) => (
                  <CreationSummary
                    key={creation.id}
                    creation={{
                      id: creation.id,
                      ...creation.data,
                    }}
                    isFiltered={
                      category !== "all" &&
                      creation.data.parentCategory !== category
                    }
                    view={view}
                  />
                ))}
              </Masonry>
            </ResponsiveMasonry>
          </div>
        );
      default:
        throw new Error("Invalid view type");
    }
  }

  return (
    <div className="creationsView">
      <div className="actions">
        {/* Category select */}
        <div>
          highlight{" "}
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
            }}
          >
            <option value="all">All</option>
            {Array.from(allCategories).map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        {/* view select */}
        <div>
          show as{"  "}
          <select
            value={view}
            onChange={(e) => {
              setView(e.target.value);
            }}
          >
            {Object.values(ViewType).map((viewType) => (
              <option value={viewType}>{viewType}</option>
            ))}
          </select>
        </div>
        {/* TODO: sort */}
        {/* reverse chronological, random */}
        <div style={{ marginLeft: "auto" }}>
          {getDescriptionForDescriptionType(description)}
        </div>
      </div>
      {/* EVENTS */}
      {eventCreations.length > 0 && (
        <div className="events">
          <span
            className="mono"
            style={{
              fontSize: "18px",
              textTransform: "uppercase",
              fontWeight: "bold",
            }}
          >
            FORTHCOMING
          </span>
          <EventCreationsList
            creations={eventCreations.map((c) => ({
              ...c.data,
              id: c.id,
            }))}
          />
        </div>
      )}
      {renderCreations()}
    </div>
  );
}

export function SimpleCreationsList({ creations }: Props) {
  return (
    <div className="creations">
      {creations.map((creation) => (
        <CreationSummary
          key={creation.id}
          creation={{
            id: creation.id,
            ...creation.data,
          }}
          view={ViewType.LIST}
        />
      ))}
    </div>
  );
}
