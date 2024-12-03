import type { CollectionEntry } from "astro:content";
import React, { useEffect, useMemo, useState } from "react";
import { CreationSummary } from "../CreationSummary";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { EventCreationsList } from "../EventCreationsList";

export enum ViewType {
  FREE = "free",
  GRID = "grid",
  LIST = "list",
}

export enum DescriptionType {
  Selected = "selected",
}

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
}

export function CreationsView({ creations, description }: Props) {
  const [view, setView] = useState(ViewType.GRID);
  const [category, setCategory] = useState("all");
  const allCategories = new Set(
    creations.map((creation) => creation.data.parentCategory).filter(Boolean)
  );

  const eventCreations = creations.filter(
    (creation) => creation.data.isEvent && creation.data.forthcoming
  );
  const nonEventCreations = creations.filter(
    (creation) => !creation.data.isEvent || !creation.data.forthcoming
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

        {getDescriptionForDescriptionType(description)}
      </div>
      {/* EVENTS */}
      {eventCreations.length > 0 && (
        <div className="events">
          <i
            style={{
              fontSize: "1.2em",
            }}
          >
            upcoming
          </i>
          <EventCreationsList
            creations={eventCreations.map((c) => ({
              ...c.data,
              id: c.id,
            }))}
          />
        </div>
      )}
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
