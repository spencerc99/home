// ABOUTME: A force-laid constellation of every creation, linked by its `related` column.
// ABOUTME: Big ongoing work are the bright hubs; everything else is the field around them.

import React, { useEffect, useMemo, useState } from "react";
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from "d3-force";
import { stringToColor } from "../../utils";
import "./Constellation.scss";

export interface ConstellationNode {
  id: string;
  title: string;
  category: string;
  tier: "big" | "selected" | "other";
  related: string[];
  href?: string;
}

interface SimNode extends ConstellationNode {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  r: number;
  degree: number;
}

const WIDTH = 720;
const HEIGHT = 560;

// Deterministic pseudo-random so the layout is the same on every visit.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function layout(nodes: ConstellationNode[]) {
  const rand = seeded(42);
  const byId = new Map<string, SimNode>();
  const sim: SimNode[] = nodes.map((n) => {
    const node: SimNode = {
      ...n,
      x: WIDTH / 2 + (rand() - 0.5) * WIDTH * 0.8,
      y: HEIGHT / 2 + (rand() - 0.5) * HEIGHT * 0.8,
      vx: 0,
      vy: 0,
      r: 3,
      degree: 0,
    };
    byId.set(n.id, node);
    return node;
  });

  const edgeKeys = new Set<string>();
  const edges: [SimNode, SimNode][] = [];
  for (const node of sim) {
    for (const other of node.related) {
      const target = byId.get(other);
      if (!target || target === node) continue;
      const key = [node.id, target.id].sort().join("|");
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      edges.push([node, target]);
      node.degree++;
      target.degree++;
    }
  }

  for (const node of sim) {
    node.r =
      node.tier === "big"
        ? 16
        : node.tier === "selected"
          ? 8
          : 2.5 + Math.min(node.degree, 6) * 0.6;
  }

  const simulation = forceSimulation<SimNode>(sim)
    .force(
      "link",
      forceLink<SimNode, { source: SimNode; target: SimNode }>(
        edges.map(([source, target]) => ({ source, target })),
      )
        .distance((l) => 22 + l.source.r + l.target.r)
        .strength(0.5),
    )
    .force(
      "charge",
      forceManyBody<SimNode>().strength((n) =>
        n.tier === "big" ? -260 : n.degree > 0 ? -60 : -18,
      ),
    )
    .force("collide", forceCollide<SimNode>((n) => n.r + 3))
    // Connected work gathers in the middle; loose ends drift to the rim.
    .force(
      "x",
      forceX<SimNode>(WIDTH / 2).strength((n) => (n.degree > 0 ? 0.06 : 0.015)),
    )
    .force(
      "y",
      forceY<SimNode>(HEIGHT / 2).strength((n) => (n.degree > 0 ? 0.08 : 0.02)),
    )
    .stop();
  for (let tick = 0; tick < 400; tick++) simulation.tick();
  for (const n of sim) {
    n.x = Math.max(n.r + 4, Math.min(WIDTH - n.r - 4, n.x));
    n.y = Math.max(n.r + 4, Math.min(HEIGHT - n.r - 4, n.y));
  }
  return { sim, edges, byId };
}

export function Constellation({ nodes }: { nodes: ConstellationNode[] }) {
  const { sim, edges, byId } = useMemo(() => layout(nodes), [nodes]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

  // Opening a project row elsewhere on the page lights up its corner here.
  useEffect(() => {
    const onFocus = (e: Event) =>
      setFocused((e as CustomEvent<string | null>).detail ?? null);
    window.addEventListener("homelab:focus", onFocus);
    return () => window.removeEventListener("homelab:focus", onFocus);
  }, []);

  const active = hovered ?? focused;
  const neighbors = useMemo(() => {
    if (!active) return null;
    const set = new Set([active]);
    for (const [a, b] of edges) {
      if (a.id === active) set.add(b.id);
      if (b.id === active) set.add(a.id);
    }
    return set;
  }, [active, edges]);

  const activeNode = active ? byId.get(active) : undefined;

  return (
    <div className="constellation">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${sim.length} works and the ${edges.length} threads between them`}
      >
        <g className="edges">
          {edges.map(([a, b]) => {
            const lit = neighbors && neighbors.has(a.id) && neighbors.has(b.id);
            return (
              <line
                key={`${a.id}|${b.id}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={lit ? "lit" : neighbors ? "dim" : ""}
              />
            );
          })}
        </g>
        <g className="nodes">
          {sim.map((n) => {
            const color = stringToColor(n.category, {
              saturation: 70,
              lightness: 55,
            });
            const dim = neighbors && !neighbors.has(n.id);
            const showLabel =
              n.tier === "big" ||
              (neighbors?.has(n.id) && n.id !== active) ||
              (!neighbors && n.tier === "selected");
            return (
              <a
                key={n.id}
                href={n.href}
                className={`node tier-${n.tier} ${dim ? "dim" : ""}`}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(n.id)}
                onBlur={() => setHovered(null)}
              >
                <circle cx={n.x} cy={n.y} r={n.r} fill={color} />
                {showLabel && (
                  <text
                    x={n.x}
                    y={n.y + n.r + 11}
                    textAnchor="middle"
                    className="label"
                  >
                    {n.title}
                  </text>
                )}
              </a>
            );
          })}
        </g>
      </svg>
      <p className="constellationCaption">
        {activeNode ? (
          <>
            <b>{activeNode.title}</b> · {activeNode.category.toLowerCase()}
            {neighbors && neighbors.size > 1 && (
              <> · tangled up with {neighbors.size - 1} other things</>
            )}
          </>
        ) : (
          <>
            {sim.length} things, {edges.length} threads between them. hover to
            follow a thread, click to visit.
          </>
        )}
      </p>
    </div>
  );
}
