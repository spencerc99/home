// ABOUTME: Inline text that glows in each hoverer's playhtml cursor color.
// ABOUTME: Multiple simultaneous hovers merge into a shared gradient glow.

import { CanHoverElement, useCursorPresences } from "@playhtml/react";
import React, { type CSSProperties, type PropsWithChildren } from "react";
import { PlayhtmlProvider } from "./interactive/PlayhtmlProvider";

type HoverGlowProps = PropsWithChildren<{
  id: string;
  className?: string;
}>;

function uniqueHoverColors(
  awarenessByStableId: Map<string, { hover?: boolean }>,
  cursorPresences: ReturnType<typeof useCursorPresences>,
): string[] {
  const seen = new Set<string>();
  const colors: string[] = [];
  for (const [stableId, entry] of awarenessByStableId) {
    if (!entry?.hover) continue;
    const color =
      cursorPresences.get(stableId)?.playerIdentity?.playerStyle
        .colorPalette[0];
    if (!color || seen.has(color)) continue;
    seen.add(color);
    colors.push(color);
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

function HoverGlowInner({ id, className, children }: HoverGlowProps) {
  const cursorPresences = useCursorPresences();

  return (
    <CanHoverElement>
      {({ awarenessByStableId }) => {
        const colors = uniqueHoverColors(awarenessByStableId, cursorPresences);
        const style =
          colors.length > 0
            ? ({
                "--playhtml-hover-gradient": buildGradient(colors),
                "--playhtml-hover-shadow": buildShadow(colors),
              } as CSSProperties)
            : undefined;

        return (
          <span id={id} className={className} style={style}>
            {children}
          </span>
        );
      }}
    </CanHoverElement>
  );
}

// Separate Astro island from the layout PlayhtmlProvider, so it needs its own
// provider in-tree (same pattern as ConnectedStats / Guestbook).
export function HoverGlow(props: HoverGlowProps) {
  return (
    <PlayhtmlProvider>
      <HoverGlowInner {...props} />
    </PlayhtmlProvider>
  );
}
