import React from "react";
import { MasonryLayout } from "./MasonryLayout";
// import { ImageZoom } from "./ImageZoom";

export function CreationDetailImages({ images }: { images: string[] }) {
  return (
    <div className="images">
      <MasonryLayout columnsCount={2} gutter="1em">
        {images.map((imgUrl) => (
          // TODO: i hate astro lmao its as bad as hugo
          // this literally doesn't render at all because of Zoom and ZoomOptions
          // <ImageZoom className="medium" src={imgUrl} />
          <img className="lazyload medium" data-src={imgUrl} />
        ))}
      </MasonryLayout>
    </div>
  );
}
