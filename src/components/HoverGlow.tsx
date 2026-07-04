// ABOUTME: Inline text that glows in each hoverer's playhtml cursor color.
// ABOUTME: Multiple simultaneous hovers merge into a shared gradient glow.

import { withSharedState } from "@playhtml/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PropsWithChildren,
} from "react";

type HoverAwareness = {
  hover: boolean;
  color: string;
};

type HoverGlowProps = PropsWithChildren<{
  id: string;
  className?: string;
}>;

function getCursorColor(): string {
  return window.cursors?.color ?? "#888";
}

function uniqueColors(awareness: HoverAwareness[] | undefined): string[] {
  const seen = new Set<string>();
  const colors: string[] = [];
  for (const entry of awareness ?? []) {
    if (!entry?.hover || !entry.color || seen.has(entry.color)) continue;
    seen.add(entry.color);
    colors.push(entry.color);
  }
  return colors;
}

function buildGradient(colors: string[]): string {
  if (colors.length === 0) return "transparent";
  if (colors.length === 1) return colors[0];
  return `linear-gradient(90deg, ${colors.join(", ")})`;
}

// Layered text-shadows so each cursor color contributes to the glow.
function buildShadow(colors: string[]): string {
  return colors.map((c) => `0 0 4px ${c}, 0 0 8px ${c}`).join(", ");
}

export const HoverGlow = withSharedState<
  Record<string, never>,
  HoverAwareness,
  HoverGlowProps
>(
  {
    defaultData: {},
    myDefaultAwareness: { hover: false, color: "#888" },
  },
  ({ awareness, setMyAwareness }, { id, className, children }) => {
    const hoveringRef = useRef(false);
    const [myColor, setMyColor] = useState(getCursorColor);

    const publish = useCallback(
      (hover: boolean, color: string) => {
        setMyAwareness({ hover, color });
      },
      [setMyAwareness],
    );

    // Keep awareness color in sync with the live cursor color (e.g. Stats popover).
    useEffect(() => {
      if (!window.cursors) return;
      setMyColor(window.cursors.color ?? "#888");
      const handleColor = (next?: string) => {
        const color = next ?? "#888";
        setMyColor(color);
        if (hoveringRef.current) {
          publish(true, color);
        }
      };
      window.cursors.on("color", handleColor);
      return () => window.cursors?.off("color", handleColor);
    }, [publish]);

    const colors = useMemo(() => uniqueColors(awareness), [awareness]);
    const isHovered = colors.length > 0;

    const style = useMemo(() => {
      if (!isHovered) return undefined;
      return {
        "--playhtml-hover-gradient": buildGradient(colors),
        "--playhtml-hover-shadow": buildShadow(colors),
      } as CSSProperties;
    }, [colors, isHovered]);

    return (
      <span
        id={id}
        className={className}
        style={style}
        data-playhtml-hover={isHovered ? "" : undefined}
        onMouseEnter={() => {
          hoveringRef.current = true;
          publish(true, myColor);
        }}
        onMouseLeave={() => {
          hoveringRef.current = false;
          publish(false, myColor);
        }}
      >
        {children}
      </span>
    );
  },
);
