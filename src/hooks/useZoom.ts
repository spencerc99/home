// ABOUTME: Attaches image elements to the nearest shared zoom session.
// ABOUTME: Falls back to a local zoom session when no provider is present.
import mediumZoom, { type ZoomOptions, type Zoom } from "medium-zoom";
import { useCallback, useRef, type RefCallback } from "react";
import { useContext } from "react";
import { ZoomContext } from "../context/ZoomContext";

// TODO: this is so much weird overhead + needs the context which is super annoying. should be easier to do this without needing the context to understand all the zoom images on the same page.
// Also it should work with videos..
// maybe https://www.lightgalleryjs.com/docs/react-image-video-gallery/?
export function useZoom({ options }: { options?: ZoomOptions }) {
  const { getZoom: getZoomInit } = useContext(ZoomContext);
  const localZoomRef = useRef<Zoom | null>(null);
  const attachedNodeRef = useRef<HTMLImageElement | null>(null);

  const getZoom = useCallback(() => {
    const zoominit = getZoomInit();
    if (zoominit) return zoominit;

    if (localZoomRef.current === null) {
      localZoomRef.current = mediumZoom(options);
    }

    return localZoomRef.current;
  }, [getZoomInit, options]);

  const attachZoom: RefCallback<HTMLImageElement> = useCallback(
    (node) => {
      const zoom = getZoom();

      if (attachedNodeRef.current && attachedNodeRef.current !== node) {
        zoom.detach(attachedNodeRef.current);
      }

      if (node) {
        zoom.attach(node);
        attachedNodeRef.current = node;
      } else if (attachedNodeRef.current) {
        zoom.detach(attachedNodeRef.current);
        attachedNodeRef.current = null;
      }
    },
    [getZoom]
  );

  return {
    getZoom,
    attachZoom,
  };
}
