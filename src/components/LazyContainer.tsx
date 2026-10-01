import useIntersectionObserver from "@react-hook/intersection-observer";
import { useRef, type PropsWithChildren } from "react";

export const LazyContainer = ({
  style,
  placeholderSize,
  children,
}: PropsWithChildren<{
  style?: React.CSSProperties;
  // Square footprint to hold before children render, so the page doesn't
  // collapse and then jump as content scrolls into view.
  placeholderSize?: number;
}>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef(false);
  const { isIntersecting } = useIntersectionObserver(containerRef);
  if (isIntersecting) {
    lockRef.current = true;
  }
  const placeholderStyle =
    !lockRef.current && placeholderSize
      ? { minWidth: placeholderSize, minHeight: placeholderSize }
      : undefined;
  return (
    <div style={{ ...style, ...placeholderStyle }} ref={containerRef}>
      {lockRef.current && children}
    </div>
  );
};
