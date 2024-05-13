import React from "react";
import { MasonryLayout } from "./MasonryLayout";
import { ImageZoom } from "./ImageZoom";

export function CreationDetailImages({ images }: { images: string[] }) {
  return (
    <div className="images">
      <MasonryLayout columnsCount={2} gutter="1em">
        {images.map((imgUrl) => (
          <ImageZoom className="medium" src={imgUrl} key={imgUrl} />
        ))}
      </MasonryLayout>
    </div>
  );
}
