import React from "react";
import { Carousel } from "../Carousel";
import { CreationSummary } from "../CreationSummary";
import { ViewType } from "./CreationsView";
import type { CollectionEntry } from "astro:content";

interface PostsCarouselProps {
  posts: CollectionEntry<"post">[];
}

export function PostsCarousel({ posts }: PostsCarouselProps) {
  return (
    <Carousel
      items={posts}
      renderItem={(post) => <PostSummary post={post} />}
      middleText="WRITING"
      transitionInterval={7000}
    />
  );
}

interface CreationsCarouselProps {
  creations: CollectionEntry<"creation">[];
}

export function CreationsCarousel({ creations }: CreationsCarouselProps) {
  console.log(creations);
  return (
    <Carousel
      items={creations}
      renderItem={(creation) => (
        <CreationSummary
          creation={{
            id: creation.id,
            ...creation.data,
          }}
          view={ViewType.GRID}
        />
      )}
      middleText="everything"
      transitionInterval={7000}
    />
  );
}
