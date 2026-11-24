import { useEffect, useRef, useState } from "react";
import { SLIDE_H, SLIDE_W } from "./Slide";

/**
 * How a slide sits in the window, like Figma's presenter: `fit` shows the whole
 * slide with bars around it, `fill` zooms until there are no bars and crops
 * whatever spills over.
 */
export type FitMode = "fit" | "fill";

/** Scale that places a 1920x1080 slide inside the element. */
export function useFitScale<T extends HTMLElement>(mode: FitMode = "fit") {
  const ref = useRef<T>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const across = el.clientWidth / SLIDE_W;
      const down = el.clientHeight / SLIDE_H;
      setScale(mode === "fill" ? Math.max(across, down) : Math.min(across, down));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [mode]);
  return { ref, scale };
}
