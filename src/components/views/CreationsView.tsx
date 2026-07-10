import type { CollectionEntry } from "astro:content";
import React, { useMemo, useState } from "react";
import { CreationSummary } from "../CreationSummary";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import "./CreationsView.scss";
import { EventCreationsList } from "../EventCreationsList";
import { CreationListView } from "./CreationListView";
import { CreationShowcase } from "../CreationShowcase";
import {
  PINNED_CREATIONS,
  FEATURED_CATEGORY,
  isFeaturedCreation,
  type AllCreationCategories,
} from "../../utils/creations";
import { isEventForthcoming } from "../../utils";

export enum ViewType {
  // FREE = "free",
  GRID = "grid",
  LIST = "list",
  TABLE = "table",
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
  defaultCategory?: AllCreationCategories;
}

export function CreationsView({
  creations,
  description,
  columns,
  defaultView,
  defaultCategory = "all",
}: Props) {
  const [view, setView] = useState(defaultView || ViewType.GRID);
  const [category, setCategory] = useState(defaultCategory);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  // Category values come in as plain strings (select values, creation
  // parentCategory), so funnel them through one place that narrows the type.
  const handleCategoryChange = (value: string) =>
    setCategory(value as AllCreationCategories);
  const allCategories = new Set(
    creations.map((creation) => creation.data.parentCategory).filter(Boolean),
  );
  const columnsCountBreakPoints = useMemo(() => {
    return columns === 1
      ? OneColumnColumnCountBreakPoints
      : TwoColumnsColumnCountBreakPoints;
  }, [columns]);

  const sortedCreations = useMemo(() => {
    return [...creations].sort((a, b) => {
      const multiplier = sortDirection === "asc" ? 1 : -1;

      // Pinned creations always come first
      const aPinned = PINNED_CREATIONS.indexOf(a.id);
      const bPinned = PINNED_CREATIONS.indexOf(b.id);
      if (aPinned !== -1 || bPinned !== -1) {
        if (aPinned !== -1 && bPinned !== -1) return aPinned - bPinned;
        return aPinned !== -1 ? -1 : 1;
      }

      // Then handle forthcoming
      const aForthcoming = isEventForthcoming(
        a.data.date,
        a.data.endDate,
        a.data.forthcoming,
      );
      const bForthcoming = isEventForthcoming(
        b.data.date,
        b.data.endDate,
        b.data.forthcoming,
      );
      if (aForthcoming !== bForthcoming) {
        return (aForthcoming ? 1 : -1) * multiplier;
      }

      // For regular dates, prefer end date, fallback to start date
      const dateA = new Date(a.data.endDate || a.data.date || 0);
      const dateB = new Date(b.data.endDate || b.data.date || 0);

      return (dateA.getTime() - dateB.getTime()) * multiplier;
    });
  }, [creations, sortDirection]);

  const filteredCreations = useMemo(() => {
    return sortedCreations.filter((creation) => {
      if (category === "all") return true;
      if (category === FEATURED_CATEGORY)
        return isFeaturedCreation(creation.data);
      return creation.data.parentCategory === category;
    });
  }, [sortedCreations, category]);

  function renderCreations() {
    switch (view) {
      case ViewType.LIST:
        return (
          <CreationShowcase
            creations={filteredCreations}
            columns={columns}
            onCategoryClick={handleCategoryChange}
          />
        );
      case ViewType.TABLE:
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
                    setSortDirection((prev) =>
                      prev === "asc" ? "desc" : "asc",
                    )
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
                onCategoryClick={handleCategoryChange}
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
                    onCategoryClick={handleCategoryChange}
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
              handleCategoryChange(e.target.value);
            }}
          >
            <option value="all">All</option>
            <option value={FEATURED_CATEGORY}>{FEATURED_CATEGORY}</option>
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
          view={ViewType.TABLE}
        />
      ))}
    </div>
  );
}
