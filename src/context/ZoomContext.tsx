import { type Zoom } from "medium-zoom";
import mediumZoom, { type ZoomOptions } from "medium-zoom";
import { createContext, useRef } from "react";

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

  return (
    <ZoomContext.Provider value={{ getZoom }}>{children}</ZoomContext.Provider>
  );
}
