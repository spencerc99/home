// ABOUTME: Provides access to the page-level image zoom session.
// ABOUTME: Lets grouped gallery components share the same zoom instance.
import { type Zoom } from "medium-zoom";
import { type ZoomOptions } from "medium-zoom";
import { createContext } from "react";
import { getPageZoom } from "../utils/imageZoom";

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
  function getZoom() {
    return getPageZoom(options);
  }

  return (
    <ZoomContext.Provider value={{ getZoom }}>{children}</ZoomContext.Provider>
  );
}
