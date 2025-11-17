import type { CollectionEntry } from "astro:content";
import "./EventCreationsList.scss";
import React from "react";
import { formatCompactDateRange } from "../utils";

export function EventCreationsList({
  creations,
}: {
  creations: Array<CollectionEntry<"creations">["data"]>;
}) {
  return (
    <ul
      id="EventCreations"
      style={{
        fontSize: "16px",
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        width: "100%",
        gap: ".5rem",
      }}
    >
      {creations.map((creation) => (
        <li
          key={creation.id}
          style={{
            width: "100%",
            maxWidth: "400px",
            minWidth: "300px",
            flex: "1 1 0",
            margin: ".25rem .5rem",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {creation.date && (
            <span
              className="mono"
              style={{ whiteSpace: "nowrap", fontSize: "14px" }}
            >
              <b>{creation.location && `[${creation.location}] `}</b>
              {formatCompactDateRange(
                new Date(creation.date),
                creation.endDate ? new Date(creation.endDate) : null
              )}
              {/* {creation.institution && (
                <span
                  style={{
                    whiteSpace: "nowrap",
                    fontSize: "14px",
                    marginTop: "0.25rem",
                  }}
                >
                  {" "}
                  {creation.institution.join(", ")}
                </span>
              )} */}
            </span>
          )}
          <p>
            <a href={creation.link}>{creation.title}</a>
            {creation.subtext && (
              <span className="descriptionText"> {creation.subtext}</span>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
