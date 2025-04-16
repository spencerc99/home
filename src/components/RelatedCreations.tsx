import type { CollectionEntry } from "astro:content";
import React from "react";
import { CreationSummary } from "./CreationSummary";
import { ViewType } from "./views/CreationsView";
import "./RelatedCreations.scss";

interface Props {
  creations: Array<
    CollectionEntry<"creation">["data"] & {
      id: string;
    }
  >;
}

export function RelatedCreations({ creations }: Props) {
  if (!creations.length) return null;

  return (
    <div className="relatedCreations">
      <h4>connected things...</h4>
      <div className="creations">
        {creations.map((creation) => (
          <CreationSummary
            key={creation.id}
            creation={creation}
            view={ViewType.GRID}
          />
        ))}
      </div>
    </div>
  );
}
