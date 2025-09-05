import useIntersectionObserver from "@react-hook/intersection-observer";
import { useRef, type PropsWithChildren } from "react";

export const LazyContainer = ({
  style,
  children,
}: PropsWithChildren<{ style?: React.CSSProperties }>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef(false);
  const { isIntersecting } = useIntersectionObserver(containerRef);
  if (isIntersecting) {
    lockRef.current = true;
  }
  return (
    <div style={style} ref={containerRef}>
      {lockRef.current && children}
    </div>
  );
};
