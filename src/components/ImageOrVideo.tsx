// ABOUTME: Renders either an image or video element based on the media type.
// ABOUTME: Supports optional zoom for images and poster images for videos.
import React, { ComponentProps, useState } from "react";
import { ImageZoom } from "./ImageZoom";

type MediaZoomProps = Omit<
  ComponentProps<"img"> & ComponentProps<"video">,
  "ref"
> & {
  forceType?: "image" | "video";
  withZoom?: boolean;
  type: "image" | "video";
  poster?: string;
  // Shows the pulsing aura placeholder (styled by the parent) until media loads.
  withLoadingState?: boolean;
};

// iOS Safari never preloads video frames, so a video shows as a blank box until
// played. A media fragment start time makes WebKit fetch and paint the first
// frame as the preview.
function withFirstFramePreview(src: string): string {
  return src.includes("#") ? src : `${src}#t=0.001`;
}

export function ImageOrVideo({
  src: initSrc,
  forceType,
  withZoom = true,
  type,
  poster,
  withLoadingState = false,
  ...props
}: MediaZoomProps) {
  const [hasLoaded, setHasLoaded] = useState(false);
  const src = initSrc || props["data-src"];

  // Use pre-computed type from metadata if available
  const mediaType = forceType || (type ?? null);

  // TODO: generate real poster images for videos instead of relying on the
  // first-frame media fragment.
  /**
   * LONG TERM SOLUTION:
   *   1. Add thumbnail generation function - Uses ffmpeg to extract first frame as .jpg for each video after it's downloaded/converted
   *   2. Call it after video processing - In the existing video download flow (line 344), after downloadVideo() succeeds, immediately generate thumbnail with same blob ID: ${blobId}.jpg
   *   3. Store poster paths in data - Add a posterUrls array to the schema/data model, parallel to media array. Store the thumbnail path when we know it's a video.
   *   4. Pass to component - Update CreationDetail.astro and CreationDetailImages.tsx to pass the poster URL from posterUrls[i] to ImageOrVideo component
   *   5. Cleanup - Update the cleanup logic (line 459) to also remove unreferenced .jpg thumbnails
   */
  // A data attribute rather than a class: React re-rendering className would
  // wipe the classes medium-zoom adds to the image and break closing the zoom.
  const loadingAttr = withLoadingState && !hasLoaded ? "" : undefined;
  const markLoaded = () => setHasLoaded(true);

  return mediaType === "video" ? (
    <video
      controls
      preload="metadata"
      playsInline
      poster={poster}
      {...props}
      data-loading={loadingAttr}
      onLoadedData={(e) => {
        markLoaded();
        props.onLoadedData?.(e);
      }}
      onError={(e) => {
        markLoaded();
        props.onError?.(e);
      }}
    >
      <source src={src && withFirstFramePreview(src)} type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  ) : withZoom ? (
    <ImageZoom
      src={src}
      {...props}
      data-loading={loadingAttr}
      onLoad={(e) => {
        markLoaded();
        props.onLoad?.(e);
      }}
      onError={(e) => {
        markLoaded();
        props.onError?.(e);
      }}
    />
  ) : (
    <img
      src={src}
      {...props}
      data-loading={loadingAttr}
      onLoad={(e) => {
        markLoaded();
        props.onLoad?.(e);
      }}
      onError={(e) => {
        markLoaded();
        props.onError?.(e);
      }}
    />
  );
}
