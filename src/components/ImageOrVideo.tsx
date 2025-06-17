import React, { ComponentProps } from "react";
import { ImageZoom } from "./ImageZoom";

type MediaZoomProps = Omit<
  ComponentProps<"img"> & ComponentProps<"video">,
  "ref"
> & {
  forceType?: "image" | "video";
  withZoom?: boolean;
  type: "image" | "video";
};

export function ImageOrVideo({
  src: initSrc,
  forceType,
  withZoom = true,
  type,
  ...props
}: MediaZoomProps) {
  const src = initSrc || props["data-src"];

  // Use pre-computed type from metadata if available
  const mediaType = forceType || (type ?? null);

  return mediaType === "video" ? (
    <video controls crossOrigin="anonymous" {...props}>
      <source src={src} type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  ) : withZoom ? (
    <ImageZoom src={src} {...props} />
  ) : (
    <img src={src} {...props} />
  );
}
