import React, { ComponentProps, useState, useEffect } from "react";
import { ImageZoom } from "./ImageZoom";

type MediaZoomProps = Omit<
  ComponentProps<"img"> & ComponentProps<"video">,
  "ref"
> & {
  forceType?: "image" | "video";
  withZoom?: boolean;
};

export function ImageOrVideo({
  src: initSrc,
  forceType,
  withZoom = true,
  ...props
}: MediaZoomProps) {
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);

  const [hadError, setHadError] = useState(false);
  const src = initSrc || props["data-src"];

  useEffect(() => {
    if (!src || forceType) return;

    // Method 1: Check file extension
    const extensionMatch = src.match(/\.([^.]+)$/);
    if (extensionMatch) {
      const ext = extensionMatch[1].toLowerCase();
      if (["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(ext)) {
        setMediaType("image");
        return;
      }
      if (["mp4", "webm", "ogg", "mov"].includes(ext)) {
        setMediaType("video");
        return;
      }
    }

    // Method 2: Fetch headers to check Content-Type
    fetch(src, { method: "HEAD" })
      .then((response) => {
        const contentType = response.headers.get("Content-Type");
        if (contentType?.startsWith("image/")) {
          setMediaType("image");
        } else if (contentType?.startsWith("video/")) {
          setMediaType("video");
        }
      })
      .catch((error) => {
        props.onLoad?.();
        setHadError(true);
        console.error("Error detecting media type:", error);
      });
  }, [src, forceType]);

  const finalMediaType = forceType || mediaType;

  return finalMediaType === "video" ? (
    <video src={src} controls {...props} />
  ) : withZoom ? (
    <ImageZoom src={src} {...props} />
  ) : (
    <img src={src} {...props} />
  );
}
