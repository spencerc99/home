import type { CollectionEntry } from "astro:content";
import React, { useEffect, useMemo, useState } from "react";
import { CreationSummary } from "../CreationSummary";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";

export enum ViewType {
  FREE = "free",
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
    creations.map((creation) => creation.data.parentCategory).filter(Boolean)
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
        {/* <select
          value={view}
          onChange={(e) => {
            setView(e.target.value);
          }}
        >
          {Object.values(ViewType).map((viewType) => (
            <option value={viewType}>{viewType}</option>
          ))}
        </select> */}
        {/* Category select */}
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
        {/* TODO: sort */}
        {/* reverse chronological, random */}
        <i>that which ive given life energy to</i>
      </div>
      <div className="creationsMasonry">
        <ResponsiveMasonry
          columnsCountBreakPoints={{
            350: 1,
            600: 2,
            900: 3,
            1024: 1,
            1250: 2,
            1500: 3,
            1900: 4,
            2400: 5,
          }}
        >
          <Masonry gutter="2em">
            {sortedCreations.map((creation) => (
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
      {/* <div className="creations">
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
      </div> */}
    </div>
  );
}