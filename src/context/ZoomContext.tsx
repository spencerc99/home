// ABOUTME: Provides a shared image zoom session for gallery components.
// ABOUTME: Handles keyboard navigation between images attached to the session.
import { type Zoom } from "medium-zoom";
import mediumZoom, { type ZoomOptions } from "medium-zoom";
import { createContext, useEffect, useRef } from "react";

export const ZoomContext = createContext<{
  getZoom: () => Zoom | null;
}>({
  getZoom: () => null,
});

export function ZoomContextProvider({
  children,
  options,
}: {
  children: React.ReactNode;
  options?: ZoomOptions;
}) {
  const zoomRef = useRef<Zoom | null>(null);

  function getZoom() {
    if (zoomRef.current === null) {
      zoomRef.current = mediumZoom(options);
    }

    return zoomRef.current;
  }

  function handleKey(e: KeyboardEvent) {
    const zoom = zoomRef.current;
    if (!zoom) return;

    const images = zoom.getImages();
    const currentImageIndex = images.indexOf(zoom.getZoomedImage());
    const key = e.code || e.key;
    let target;

    if (images.length <= 1 || currentImageIndex === -1) {
      return;
    }

    switch (key) {
      case "ArrowLeft":
        e.preventDefault();
        target =
          currentImageIndex - 1 < 0
            ? images[images.length - 1]
            : images[currentImageIndex - 1];
        zoom.close().then(() => {
          target.scrollIntoView();
          zoom.open({
            target: target,
          });
        });
        break;
      case "ArrowRight":
        e.preventDefault();
        target =
          currentImageIndex + 1 >= images.length
            ? images[0]
            : images[currentImageIndex + 1];
        zoom.close().then(() => {
          target.scrollIntoView();
          zoom.open({
            target: target,
          });
        });
        break;
      default:
        break;
    }
  }

  useEffect(() => {
    document.addEventListener("keydown", handleKey, false);

    return () => {
      document.removeEventListener("keydown", handleKey, false);
      zoomRef.current?.detach();
    };
  }, []);

  return (
    <ZoomContext.Provider value={{ getZoom }}>{children}</ZoomContext.Provider>
  );
}
