import { useRef, ComponentProps, RefCallback } from "react";
import React from "react";
import mediumZoom, { type ZoomOptions, type Zoom } from "medium-zoom";

type MediaZoomProps = Omit<ComponentProps<"img">, "ref"> & {
  options?: ZoomOptions;
};

export function ImageZoom({ options, src, ...props }: MediaZoomProps) {
  const zoomRef = useRef<Zoom | null>(null);

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

  return (
    <img
      src={src}
      {...props}
      ref={attachZoom as RefCallback<HTMLImageElement>}
    />
  );
}
