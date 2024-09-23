import type { CollectionEntry } from "astro:content";
import "./EventCreationsList.scss";
import React from "react";

export function EventCreationsList({
  creations,
}: {
  creations: Array<CollectionEntry<"creations">["data"]>;
}) {
  return (
    <ul id="EventCreations">
      {creations.map((creation) => (
        <li key={creation.id}>
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
          <a href={creation.link}>{creation.title}</a>, {creation.subtext}
        </li>
      ))}
    </ul>
  );
}
