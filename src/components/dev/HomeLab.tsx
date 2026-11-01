// ABOUTME: Building blocks for the home page layout prototypes under /home-lab.
// ABOUTME: Big "tending" cards, a works grid, and small-things tiles, built on existing creation components.

import type { CollectionEntry } from "astro:content";
import React, { useState } from "react";
import { marked } from "marked";
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

function yearRange(creation: Creation) {
  const start = creation.date ? new Date(creation.date).getFullYear() : "";
  if (creation.ongoing) return `${start}–now`;
  const end = creation.endDate ? new Date(creation.endDate).getFullYear() : "";
  return end && end !== start ? `${start}–${end}` : `${start}`;
}

function firstParagraph(md?: string) {
  if (!md) return "";
  const para = md.split(/\n\s*\n|\n&nbsp;/)[0] ?? "";
  return marked.parseInline(para) as string;
}

// One project per row: a fixed-size photo beside the title and a one-line
// statement. Clicking a row grows it in place: a bigger photo, the opening
// paragraph, materials, where it lived, and links. Sizes never scale with
// the screen, so big monitors just get more breathing room.
export function ProjectRows({
  creations,
  size = "big",
}: {
  creations: Creation[];
  size?: "big" | "medium";
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div className={classNames("projectRows", size)}>
      {creations.map((creation) => {
        const places = creation.institution?.join(", ");
        const nowLine = size === "big" ? NOW_LINES[creation.id] : undefined;
        const isOpen = openId === creation.id;
        const intro = isOpen ? firstParagraph(creation.descriptionMd) : "";
        return (
          <div
            key={creation.id}
            className={classNames("projectRow", { open: isOpen })}
            style={auraStyle(creation.title)}
          >
            <button
              type="button"
              className="projectRowHeader"
              aria-expanded={isOpen}
              onClick={() => {
                const next = isOpen ? null : creation.id;
                setOpenId(next);
                window.dispatchEvent(
                  new CustomEvent("homelab:focus", { detail: next }),
                );
              }}
            >
              <div className="projectRowMedia">
                <CreationPreviewMedia
                  creation={creation}
                  imgixWidth={size === "big" ? 900 : 600}
                />
              </div>
              <div className="projectRowText">
                <div className="projectRowTitle">
                  {creation.title}
                  <span className="projectRowToggle" aria-hidden="true">
                    {isOpen ? "−" : "+"}
                  </span>
                </div>
                {creation.subtext && (
                  <p className="projectRowStatement serif">{creation.subtext}</p>
                )}
                <p className="projectRowMeta">
                  {yearRange(creation)}
                  {size === "big" && places && <> · {places}</>}
                </p>
                {nowLine && (
                  <p className="projectRowNow">
                    <span className="nowDot" aria-hidden="true" />
                    {nowLine}
                  </p>
                )}
              </div>
            </button>
            {isOpen && (
              <div className="projectRowDetail">
                {intro && (
                  <p dangerouslySetInnerHTML={{ __html: intro }} />
                )}
                {creation.materials && (
                  <p className="projectRowMeta">
                    <i>made with</i> {creation.materials}
                  </p>
                )}
                {size !== "big" && places && (
                  <p className="projectRowMeta">
                    <i>with</i> {places}
                  </p>
                )}
                <p className="projectRowLinks">
                  {creation.descriptionMd && (
                    <a href={`/creation/${creation.id}`}>the full story →</a>
                  )}
                  {creation.link && (
                    <a className="external" href={creation.link}>
                      visit it
                    </a>
                  )}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Smaller things stay folded behind one line until someone asks for them.
export function SmallThingsFold({ creations }: { creations: Creation[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="smallFold">
      <button
        type="button"
        className="smallFoldToggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? "fold these back up" : `and ${creations.length} smaller things…`}
      </button>
      {open && <SmallList creations={creations} />}
    </div>
  );
}

// Smaller things as a two-column text list with a tiny thumbnail each.
export function SmallList({ creations }: { creations: Creation[] }) {
  return (
    <ul className="smallList">
      {creations.map((creation) => (
        <li key={creation.id} style={auraStyle(creation.title)}>
          <a href={hrefFor(creation)}>
            <span className="smallListThumb">
              <CreationPreviewMedia creation={creation} imgixWidth={96} />
            </span>
            <span>
              <span className="smallListTitle">{creation.title}</span>
              {creation.subtext && (
                <span className="smallListSub"> {creation.subtext}</span>
              )}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
