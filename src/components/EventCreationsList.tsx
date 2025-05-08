import type { CollectionEntry } from "astro:content";
import "./EventCreationsList.scss";
import React from "react";
import { formatDateRange } from "../utils";

export function EventCreationsList({
  creations,
}: {
  creations: Array<CollectionEntry<"creations">["data"]>;
}) {
  return (
    <ul
      id="EventCreations"
      className="mono"
      style={{
        fontSize: "16px",
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        width: "100%",
        gap: ".25rem",
      }}
    >
      {creations.map((creation) => (
        <li
          key={creation.id}
          style={{
            maxWidth: "400px",
            minWidth: "250px",
            flex: "1 1 0",
            margin: "0 .5rem",
          }}
        >
          {creation.date && (
            <>
              <b>
                {creation.endDate
                  ? formatDateRange(
                      new Date(creation.date),
                      new Date(creation.endDate)
                    )
                  : creation.date.toLocaleDateString("en-us", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
              </b>
              :{" "}
            </>
          )}
          <a href={creation.link}>{creation.title}</a>
          {creation.subtext && (
            <span className="descriptionText"> {creation.subtext}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
