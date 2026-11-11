// ABOUTME: Shared Ramka lightbox viewer (portal, slides, chrome) used by image galleries.
// ABOUTME: `variant` picks one of the site-styled looks; see /design for all of them.
import React, { useState } from "react";
import * as Lightbox from "@ramka/react/lightbox";
import "./GalleryLightbox.scss";

export type GalleryItem = {
  src: string;
  caption?: string;
  width?: number;
  height?: number;
};

// Ramka's Media needs intrinsic dimensions to fit the image to the screen. Creation
// media has no stored dimensions, so read them off the image once it loads.
function FitImage({ item }: { item: GalleryItem }) {
  const [dims, setDims] = useState(
    item.width && item.height ? { w: item.width, h: item.height } : null,
  );
  return (
    <Lightbox.Media className="glb-media" width={dims?.w} height={dims?.h}>
      <img
        src={item.src}
        alt={item.caption ?? ""}
        width={dims?.w}
        height={dims?.h}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (!dims && img.naturalWidth) {
            setDims({ w: img.naturalWidth, h: img.naturalHeight });
          }
        }}
      />
    </Lightbox.Media>
  );
}
export type GalleryVariant = "paper" | "mat" | "darkroom" | "aura";

export const GALLERY_VARIANTS: {
  id: GalleryVariant;
  name: string;
  blurb: string;
}[] = [
  {
    id: "paper",
    name: "paper",
    blurb:
      "The current PR. Near-opaque page color, Sono controls in the corners, italic caption underneath.",
  },
  {
    id: "mat",
    name: "gallery wall",
    blurb:
      "The image is hung on a mat with the site drop shadow, and the caption becomes a wall label with a numbered entry.",
  },
  {
    id: "darkroom",
    name: "darkroom",
    blurb:
      "Always dark so the work glows. A filmstrip of thumbnails runs along the bottom for long galleries.",
  },
  {
    id: "aura",
    name: "aura",
    blurb:
      "The page blurs behind frosted glass, the image gets the orange loading aura, and all controls live in one floating pill.",
  },
];

function Caption({ variant }: { variant: GalleryVariant }) {
  if (variant === "mat") {
    return (
      <div className="glb-label">
        <Lightbox.Counter className="glb-labelNo">
          {({ current, total }) => (
            <>
              no. {current} <span aria-hidden>of</span> {total}
            </>
          )}
        </Lightbox.Counter>
        <Lightbox.Caption className="glb-caption" />
      </div>
    );
  }
  return <Lightbox.Caption className="glb-caption" />;
}

export function GalleryViewer({
  items,
  variant = "paper",
}: {
  items: GalleryItem[];
  variant?: GalleryVariant;
}) {
  const total = items.length;
  const pill = variant === "aura";

  return (
    <Lightbox.Portal className={`glb glb--${variant}`}>
      <Lightbox.Backdrop className="glb-backdrop" />
      <Lightbox.Content className="glb-content" aria-label="Image viewer">
        <Lightbox.Slides
          className="glb-slides"
          aria-label="Images"
          aria-roledescription="carousel"
        >
          {items.map((item, i) => (
            <Lightbox.Slide key={`${item.src}-${i}`} className="glb-slide">
              <Lightbox.Item
                index={i}
                caption={item.caption}
                className="glb-item"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${total}`}
              >
                <Lightbox.Zoom>
                  <FitImage item={item} />
                </Lightbox.Zoom>
              </Lightbox.Item>
            </Lightbox.Slide>
          ))}
        </Lightbox.Slides>

        {pill ? (
          <div className="glb-pill">
            <Lightbox.Previous className="glb-button" aria-label="Previous image">
              ←
            </Lightbox.Previous>
            <Lightbox.Counter className="glb-counter" />
            <Lightbox.Next className="glb-button" aria-label="Next image">
              →
            </Lightbox.Next>
            <span className="glb-pillDivider" aria-hidden />
            <Lightbox.Close className="glb-button" aria-label="Close">
              close
            </Lightbox.Close>
          </div>
        ) : (
          <>
            <div className="glb-topBar">
              {variant === "mat" ? <span /> : <Lightbox.Counter className="glb-counter" />}
              <Lightbox.Close className="glb-button" aria-label="Close">
                close
              </Lightbox.Close>
            </div>
            <Lightbox.Previous
              className="glb-button glb-prev"
              aria-label="Previous image"
            >
              ←
            </Lightbox.Previous>
            <Lightbox.Next className="glb-button glb-next" aria-label="Next image">
              →
            </Lightbox.Next>
          </>
        )}

        {variant === "darkroom" && (
          <Lightbox.ThumbnailGroup className="glb-filmstrip" aria-label="Thumbnails">
            {items.map((item, i) => (
              <Lightbox.Thumbnail
                key={`${item.src}-${i}`}
                index={i}
                className="glb-thumb"
                aria-label={`Image ${i + 1}`}
              >
                <img src={item.src} alt="" />
              </Lightbox.Thumbnail>
            ))}
          </Lightbox.ThumbnailGroup>
        )}

        <Caption variant={variant} />
      </Lightbox.Content>
    </Lightbox.Portal>
  );
}
