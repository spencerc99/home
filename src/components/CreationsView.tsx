import type { CollectionEntry } from "astro:content";
import React, { useMemo, useState } from "react";
import { CreationSummary } from "./CreationSummary";

export enum ViewType {
  GRID = "grid",
  LIST = "list",
}

interface Props {
  creations: Array<
    CollectionEntry<"creations">["data"] & {
      id: string;
    }
  >;
}

export function CreationsView({ creations }: Props) {
  const [view, setView] = useState(ViewType.GRID);
  const [category, setCategory] = useState("all");
  const allCategories = new Set(
    creations.map((creation) => creation.data.parentCategory)
  );

  const sortedCreations = useMemo(
    () =>
      [...creations].sort(
        (a, b) =>
          new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
      ),
    [creations]
  );
  return (
    <div className="creationsView">
      <div className="actions">
        {/* view select */}
        <select
          value={view}
          onChange={(e) => {
            setView(e.target.value);
          }}
        >
          {/* dynamically derive it from ViewType */}
          {Object.values(ViewType).map((viewType) => (
            <option value={viewType}>{viewType}</option>
          ))}
        </select>
        {/* Category select */}
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
          }}
        >
          <option value="all">All</option>
          {Array.from(allCategories).map((category) => (
            <option value={category}>{category}</option>
          ))}
        </select>
        {/* TODO: sort */}
        {/* reverse chronological, random */}
      </div>
      <div className="creations">
        {sortedCreations.map((creation) => (
          <CreationSummary
            key={creation.id}
            creation={{
              id: creation.id,
              ...creation.data,
            }}
            view={view}
          />
        ))}
      </div>
    </div>
  );
}
