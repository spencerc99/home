import {
  useRef,
  ComponentProps,
  RefCallback,
  useState,
  useEffect,
} from "react";
import React from "react";
import mediumZoom, { type ZoomOptions, type Zoom } from "medium-zoom";

type MediaZoomProps = Omit<
  ComponentProps<"img"> & ComponentProps<"video">,
  "ref"
> & {
  options?: ZoomOptions;
  forceType?: "image" | "video"; // Optional prop to explicitly set media type
};

export function ImageZoom({
  options,
  src,
  forceType,
  ...props
}: MediaZoomProps) {
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const zoomRef = useRef<Zoom | null>(null);

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
        console.error("Error detecting media type:", error);
      });
  }, [src, forceType]);

  function getZoom() {
    if (zoomRef.current === null) {
      zoomRef.current = mediumZoom(options);
    }

    return zoomRef.current;
  }

  const attachZoom: RefCallback<HTMLImageElement | HTMLVideoElement> = (
    node
  ) => {
    const zoom = getZoom();

    if (node) {
      zoom.attach(node);
    } else {
      zoom.detach();
    }
  };

  // Use forceType if provided, otherwise use detected mediaType
  const finalMediaType = forceType || mediaType;

  if (!finalMediaType) {
    // Optional: Show loading state or fallback
    // TODO: show loading state
    return <div>Loading...</div>;
  }

  return finalMediaType === "video" ? (
    <video
      src={src}
      {...props}
      ref={attachZoom as RefCallback<HTMLVideoElement>}
      controls
    />
  ) : (
    <img
      src={src}
      {...props}
      ref={attachZoom as RefCallback<HTMLImageElement>}
    />
  );
}
