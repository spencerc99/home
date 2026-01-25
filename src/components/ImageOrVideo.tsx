// ABOUTME: Renders either an image or video element based on the media type.
// ABOUTME: Supports optional zoom for images and poster images for videos.
import React, { ComponentProps, useMemo } from "react";
import { ImageZoom } from "./ImageZoom";

type MediaZoomProps = Omit<
  ComponentProps<"img"> & ComponentProps<"video">,
  "ref"
> & {
  forceType?: "image" | "video";
  withZoom?: boolean;
  type: "image" | "video";
  poster?: string;
};

function needsVideoPosterWorkaround(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // All iOS browsers use WebKit and have the same video preview issue
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  // Desktop Safari (not Chrome/Chromium)
  const isDesktopSafari = ua.includes("Safari") && !ua.includes("Chrome") && !ua.includes("Chromium");
  return isIOS || isDesktopSafari;
}

export function ImageOrVideo({
  src: initSrc,
  forceType,
  withZoom = true,
  type,
  poster,
  ...props
}: MediaZoomProps) {
  const src = initSrc || props["data-src"];

  // Use pre-computed type from metadata if available
  const mediaType = forceType || (type ?? null);

  // WebKit browsers (Safari, iOS browsers) don't reliably show video thumbnails.
  // Using the video URL itself as poster works as a workaround for local videos.
  // TODO: this still is kind of precarious / i don't think `poster` should allow a video tag

  /**
   * LONG TERM SOLUTION:
   *   1. Add thumbnail generation function - Uses ffmpeg to extract first frame as .jpg for each video after it's downloaded/converted
   *   2. Call it after video processing - In the existing video download flow (line 344), after downloadVideo() succeeds, immediately generate thumbnail with same blob ID: ${blobId}.jpg
   *   3. Store poster paths in data - Add a posterUrls array to the schema/data model, parallel to media array. Store the thumbnail path when we know it's a video.
   *   4. Pass to component - Update CreationDetail.astro and CreationDetailImages.tsx to pass the poster URL from posterUrls[i] to ImageOrVideo component
   *   5. Cleanup - Update the cleanup logic (line 459) to also remove unreferenced .jpg thumbnails
   */
  const videoPoster = useMemo(() => {
    if (poster) return poster;
    if (needsVideoPosterWorkaround() && src) return src;
    return undefined;
  }, [poster, src]);

  return mediaType === "video" ? (
    <video
      controls
      preload="metadata"
      playsInline
      poster={videoPoster}
      {...props}
    >
      <source src={src} type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  ) : withZoom ? (
    <ImageZoom src={src} {...props} />
  ) : (
    <img src={src} {...props} />
  );
}
