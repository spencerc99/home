// ABOUTME: Building blocks for the home page layout prototypes under /home-lab.
// ABOUTME: Big "tending" cards, a works grid, and small-things tiles, built on existing creation components.

import type { CollectionEntry } from "astro:content";
import React from "react";
import classNames from "classnames";
import { CreationSummary } from "../CreationSummary";
import { CreationPreviewMedia } from "../CreationPreviewMedia";
import { CategoryStamp } from "../CategoryStamp";
import { ViewType } from "../views/CreationsView";
import { stringToColor } from "../../utils";
import "../views/CreationsView.scss";
import "./HomeLab.scss";

type Creation = CollectionEntry<"creation">["data"] & { id: string };

// Draft "what's happening now" lines for the tending projects.
const NOW_LINES: Record<string, string> = {
  "computing-shrines":
    "installed in Golden Gate Park, on view in Charlottetown and Melbourne",
  "we-were-online": "live on Chrome, Firefox, Edge, and the Mac App Store",
  playhtml: "the open-source engine under we were online and other shared web spaces",
};

function auraStyle(title: string) {
  return {
    "--aura-color": stringToColor(title),
    "--aura-color-transparent": stringToColor(title, { alpha: 0.3 }),
  } as React.CSSProperties;
}

function hrefFor(creation: Creation) {
  return creation.descriptionMd ? `/creation/${creation.id}` : creation.link;
}

export function TendingCards({
  creations,
  layout = "hero-pair",
}: {
  creations: Creation[];
  layout?: "hero-pair" | "row" | "tiles";
}) {
  return (
    <div className={classNames("tendingCards", layout)}>
      {creations.map((creation, idx) => (
        <a
          key={creation.id}
          className={classNames("tendingCard", { hero: idx === 0 && layout !== "row" })}
          href={hrefFor(creation)}
          style={auraStyle(creation.title)}
        >
          <div className="tendingMedia">
            <CategoryStamp parentCategory="ongoing" />
            <CreationPreviewMedia creation={creation} imgixWidth={900} />
          </div>
          <div className="tendingCaption">
            <div className="tendingTitle">{creation.title}</div>
            {creation.subtext && (
              <p className="tendingStatement serif">{creation.subtext}</p>
            )}
            {NOW_LINES[creation.id] && (
              <p className="tendingNow">
                <span className="nowDot" aria-hidden="true" />
                {NOW_LINES[creation.id]}
              </p>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}

export function WorksGrid({
  creations,
  className,
}: {
  creations: Creation[];
  className?: string;
}) {
  return (
    <div className={classNames("worksGrid", className)}>
      {creations.map((creation) => (
        <CreationSummary
          key={creation.id}
          creation={creation}
          view={ViewType.GRID}
        />
      ))}
    </div>
  );
}

export function SmallThings({
  creations,
  className,
}: {
  creations: Creation[];
  className?: string;
}) {
  return (
    <div className={classNames("smallThings", className)}>
      {creations.map((creation, idx) => (
        <a
          key={creation.id}
          className="smallThing"
          href={hrefFor(creation)}
          style={{
            ...auraStyle(creation.title),
            "--tilt": `${((idx * 37) % 7) - 3}deg`,
          } as React.CSSProperties}
          title={creation.subtext}
        >
          <div className="smallThingMedia">
            <CreationPreviewMedia creation={creation} imgixWidth={240} />
          </div>
          <span className="smallThingTitle">{creation.title}</span>
        </a>
      ))}
    </div>
  );
}
