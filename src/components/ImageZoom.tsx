// ABOUTME: Renders an image element with medium-zoom behavior attached.
// ABOUTME: Preserves normal image props while wiring the zoom ref callback.
import { ComponentProps, RefCallback } from "react";
import React from "react";
import { useZoom } from "../hooks/useZoom";
import { type ZoomOptions } from "medium-zoom";

type MediaZoomProps = Omit<ComponentProps<"img">, "ref"> & {
  options?: ZoomOptions;
};

export function ImageZoom({ options, src, ...props }: MediaZoomProps) {
  const { attachZoom } = useZoom({ options });

  return (
    <img
      src={src}
      {...props}
      ref={attachZoom as RefCallback<HTMLImageElement>}
    />
  );
}
