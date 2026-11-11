// ABOUTME: Renders a gallery of images and videos for creation detail pages.
// ABOUTME: Images open a swipeable Ramka lightbox; videos render natively for proper preloading.
import React, { useState } from "react";
import * as Lightbox from "@ramka/react/lightbox";
import { ImageOrVideo } from "./ImageOrVideo";
import { GalleryViewer, type GalleryItem } from "./GalleryLightbox";
import "./CreationDetailImages.scss";

function GalleryThumb({
  src,
  imageRef,
}: {
  src: string;
  imageRef: (node: HTMLImageElement | null) => void;
}) {
  const [hasLoaded, setHasLoaded] = useState(false);
  return (
    <img
      ref={imageRef}
      className="medium-masonry"
      src={src}
      alt=""
      data-loading={hasLoaded ? undefined : ""}
      onLoad={() => setHasLoaded(true)}
      onError={() => setHasLoaded(true)}
    />
  );
}

export function CreationDetailImages({
  images,
  descriptions,
  metadata,
}: {
  images: string[];
  descriptions: string[];
  metadata: ("image" | "video")[];
}) {
  if (images.length <= 1) return null;

  // Only images go in the lightbox. Map each media index to its lightbox index.
  const lightboxItems: GalleryItem[] = [];
  const lightboxIndexFor = images.map((src, idx) => {
    if (metadata[idx] === "video") return -1;
    lightboxItems.push({ src, caption: descriptions?.[idx] || undefined });
    return lightboxItems.length - 1;
  });
  const total = lightboxItems.length;

  return (
    <Lightbox.Root
      count={total}
      scrollTriggerIntoView={[
        { type: "onChange", behavior: "instant" },
        { type: "onOpenComplete", behavior: "instant" },
      ]}
    >
      <div className="images">
        {images.map((imgUrl, idx) => (
          <div key={imgUrl}>
            {lightboxIndexFor[idx] === -1 ? (
              <ImageOrVideo
                className="medium-masonry"
                src={imgUrl}
                withLoadingState
                type="video"
              />
            ) : (
              <Lightbox.Trigger
                index={lightboxIndexFor[idx]}
                className="galleryTrigger"
                aria-label={`Open image ${lightboxIndexFor[idx] + 1} of ${total}`}
              >
                {({ imageRef }) => (
                  <GalleryThumb src={imgUrl} imageRef={imageRef} />
                )}
              </Lightbox.Trigger>
            )}
            {Boolean(descriptions?.[idx]) && (
              <p className="descriptionText">{descriptions[idx]}</p>
            )}
          </div>
        ))}
      </div>

      <GalleryViewer items={lightboxItems} />
    </Lightbox.Root>
  );
}
