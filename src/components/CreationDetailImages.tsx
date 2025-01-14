import React from "react";
import { MasonryLayout } from "./MasonryLayout";
import { ImageOrVideo } from "./ImageOrVideo";
import { ZoomContextProvider } from "../context/ZoomContext";

export function CreationDetailImages({
  images,
  descriptions,
}: {
  images: string[];
  descriptions: string[];
}) {
  return images.length > 1 ? (
    <ZoomContextProvider>
      <div className="images">
        {/* TODO: turn into lightbox carousel with photoswipe */}
        <MasonryLayout columnsCount={2} gutter="1em">
          {images.map((imgUrl, idx) => (
            <div
              key={imgUrl}
              style={{ display: "flex", flexDirection: "column", gap: "0.2em" }}
            >
              <ImageOrVideo
                className="medium"
                src={imgUrl}
                key={imgUrl}
                withZoom
              />
              {Boolean(descriptions?.[idx]) && (
                <span className="descriptionText">{descriptions[idx]}</span>
              )}
            </div>
          ))}
        </MasonryLayout>
      </div>
    </ZoomContextProvider>
  ) : null;
}
