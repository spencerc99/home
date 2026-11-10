// ABOUTME: Renders a gallery of images and videos for creation detail pages.
// ABOUTME: Images open a swipeable Ramka lightbox; videos render natively for proper preloading.
import React, { useState } from "react";
import * as Lightbox from "@ramka/react/lightbox";
import { ImageOrVideo } from "./ImageOrVideo";
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
  const lightboxItems: { src: string; caption?: string }[] = [];
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

      <Lightbox.Portal>
        <Lightbox.Backdrop className="ramkaBackdrop" />
        <Lightbox.Content className="ramkaContent" aria-label="Image viewer">
          <Lightbox.Slides
            className="ramkaSlides"
            aria-label="Images"
            aria-roledescription="carousel"
          >
            {lightboxItems.map((item, i) => (
              <Lightbox.Slide key={item.src} className="ramkaSlide">
                <Lightbox.Item
                  index={i}
                  caption={item.caption}
                  className="ramkaItem"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${total}`}
                >
                  <Lightbox.Zoom>
                    <Lightbox.Media>
                      <img src={item.src} alt={item.caption ?? ""} />
                    </Lightbox.Media>
                  </Lightbox.Zoom>
                </Lightbox.Item>
              </Lightbox.Slide>
            ))}
          </Lightbox.Slides>

          <div className="ramkaTopBar">
            <Lightbox.Counter className="ramkaCounter" />
            <Lightbox.Close className="ramkaButton" aria-label="Close">
              close
            </Lightbox.Close>
          </div>
          <Lightbox.Previous
            className="ramkaButton ramkaPrev"
            aria-label="Previous image"
          >
            ←
          </Lightbox.Previous>
          <Lightbox.Next className="ramkaButton ramkaNext" aria-label="Next image">
            →
          </Lightbox.Next>
          <Lightbox.Caption className="ramkaCaption" />
        </Lightbox.Content>
      </Lightbox.Portal>
    </Lightbox.Root>
  );
}
