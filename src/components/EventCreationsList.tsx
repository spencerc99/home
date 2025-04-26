import type { CollectionEntry } from "astro:content";
import "./EventCreationsList.scss";
import React from "react";

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
            width: "400px",
            minWidth: "250px",
            flex: "1 1 400px",
            margin: "0 .5rem",
          }}
        >
          {creation.date && (
            <>
              <b>
                {creation.date.toLocaleDateString("en-us", {
                  year: "numeric",
                  month: "short",
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
