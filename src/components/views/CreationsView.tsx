import type { CollectionEntry } from "astro:content";
import React, {
  useMemo,
  useState,
} from "react";
import { CreationSummary } from "../CreationSummary";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import "./CreationsView.scss";
import { EventCreationsList } from "../EventCreationsList";
import { CreationListView } from "./CreationListView";
import classNames from "classnames";

export enum ViewType {
  // FREE = "free",
  GRID = "grid",
  LIST = "list",
}

export enum DescriptionType {
  Selected = "selected",
}

// Adjusted breakpoints to account for 200px sidebar width
const TwoColumnsColumnCountBreakPoints = {
  350: 1,
  650: 2,
  1100: 3,
  1279: 3, // 1024 + 200px sidebar
  1280: 2, // 1250 + 200px sidebar
  1600: 3, // 1500 + 200px sidebar
  2000: 4, // 1900 + 200px sidebar
  2600: 5, // 2400 + 200px sidebar
};
const OneColumnColumnCountBreakPoints = {
  350: 1,
  600: 2,
  900: 3,
  1224: 4, // 1024 + 200px sidebar
  1450: 5, // 1250 + 200px sidebar
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
  defaultView?: ViewType;
}

export function CreationsView({
  creations,
  description,
  columns,
  defaultView,
}: Props) {
  const [view, setView] = useState(defaultView || ViewType.GRID);
  const [category, setCategory] = useState("all");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
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

  const filteredCreations = useMemo(() => {
    return sortedNonEventCreations.filter(
      (creation) =>
        category === "all" || creation.data.parentCategory === category
    );
  }, [sortedNonEventCreations, category]);

  function renderCreations() {
    switch (view) {
      case ViewType.LIST:
        return (
          <CreationListView
            creations={filteredCreations}
            headerColumns={(selectedIndex) => (
              <>
                <div>
                  {selectedIndex > -1 ? selectedIndex + 1 : "?"}/
                  {filteredCreations.length}
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
              </>
            )}
            renderRow={(creation, index, isSelected) => (
              <CreationSummary
                creation={{
                  id: creation.id,
                  ...creation.data,
                }}
                view={view}
                isSelected={isSelected}
              />
            )}
            rowKey={(creation) => creation.id}
            onNavigate={(creation) => {
              window.location.href = `/creation/${creation.id}`;
            }}
          />
        );
      case ViewType.GRID:
        return (
          <div className="creationsMasonry">
            <ResponsiveMasonry
              columnsCountBreakPoints={columnsCountBreakPoints}
            >
              <Masonry gutter="2em">
                {filteredCreations.map((creation) => (
                  <CreationSummary
                    key={creation.id}
                    creation={{
                      id: creation.id,
                      ...creation.data,
                    }}
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
          View as{" "}
          <select
            value={view}
            onChange={(e) => {
              setView(e.target.value);
            }}
          >
            {Object.values(ViewType).map((viewType) => (
              <option key={viewType} value={viewType}>
                {viewType}
              </option>
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
            NOW & UPCOMING
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
