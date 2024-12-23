import React from "react";
import { MasonryLayout } from "./MasonryLayout";
import { ImageZoom } from "./ImageZoom";

export function CreationDetailImages({
  images,
  descriptions,
}: {
  images: string[];
  descriptions: string[];
}) {
  return images.length > 1 ? (
    <div className="images">
      {/* TODO: turn into lightbox carousel with photoswipe */}
      <MasonryLayout columnsCount={2} gutter="1em">
        {images.map((imgUrl, idx) => (
          <div
            key={imgUrl}
            style={{ display: "flex", flexDirection: "column", gap: "0.2em" }}
          >
            <ImageZoom className="medium" src={imgUrl} key={imgUrl} />
            {Boolean(descriptions?.[idx]) && (
              <span className="descriptionText">{descriptions[idx]}</span>
            )}
          </div>
        ))}
      </MasonryLayout>
    </div>
  ) : null;
}
