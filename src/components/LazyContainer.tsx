import useIntersectionObserver from "@react-hook/intersection-observer";
import React, { PropsWithChildren } from "react";
import { useRef } from "react";

export const LazyContainer = ({ children }: PropsWithChildren<{}>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef(false);
  const { isIntersecting } = useIntersectionObserver(containerRef);
  if (isIntersecting) {
    lockRef.current = true;
  }
  return <div ref={containerRef}>{lockRef.current && children}</div>;
};
