import React from "react";
import { ImageOrVideo } from "./ImageOrVideo";
import { ZoomContextProvider } from "../context/ZoomContext";

export function CreationDetailImages({
  images,
  descriptions,
  metadata,
}: {
  images: string[];
  descriptions: string[];
  metadata: ("image" | "video")[];
}) {
  return images.length > 1 ? (
    <ZoomContextProvider>
      <div className="images">
        {/* TODO: turn into lightbox carousel with photoswipe */}
        {images.map((imgUrl, idx) => (
          <div key={imgUrl}>
            <ImageOrVideo
              className="medium-masonry"
              src={imgUrl}
              key={imgUrl}
              withZoom
              type={metadata[idx]}
            />
            {Boolean(descriptions?.[idx]) && (
              <p className="descriptionText">{descriptions[idx]}</p>
            )}
          </div>
        ))}
      </div>
    </ZoomContextProvider>
  ) : null;
}
