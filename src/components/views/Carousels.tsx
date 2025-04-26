import React from "react";
import { Carousel } from "../Carousel";
import type { CollectionEntry } from "astro:content";
import { CompactCreationSummary } from "../CompactCreationSummary";

interface CreationsCarouselProps {
  creations: (CollectionEntry<"creation"> | CollectionEntry<"posts">)[];
}

export function CreationsCarousel({ creations }: CreationsCarouselProps) {
  return (
    <Carousel
      items={creations}
      renderItem={(creation) => (
        <CompactCreationSummary
          creation={{
            id: creation.id,
            slug: creation.slug,
            ...creation.data,
          }}
          key={creation.id}
          className="mono"
        />
      )}
      middleText={(creation) =>
        creation.data.pubDate ? "WRITING" : creation.data.parentCategory
      }
      allLink={(creation) => (creation.data.pubDate ? "/posts" : "/creation")}
      transitionInterval={7000}
    />
  );
}
