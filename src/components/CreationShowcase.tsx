// ABOUTME: Showcase layout for a small number of creations in high detail:
// ABOUTME: large media, title, subtext, and a postmark date, in a masonry flow.

import type { CollectionEntry } from "astro:content";
import React from "react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import classNames from "classnames";
import dayjs from "dayjs";
import { stringToColor } from "../utils";
import { CreationPreviewMedia } from "./CreationPreviewMedia";

interface ShowcaseProps {
  creations: Array<
    CollectionEntry<"creation"> & {
      data: CollectionEntry<"creation">["data"] & { forthcoming: boolean };
    }
  >;
  // Accounts for if it is in display with something else (matches CreationsView)
  columns?: 1 | 2;
}

const TwoColumnsColumnCountBreakPoints = { 350: 1, 1280: 2 };
const OneColumnColumnCountBreakPoints = { 350: 1, 800: 2 };

interface ShowcaseCardProps {
  creation: CollectionEntry<"creation">["data"] & {
    id: string;
    forthcoming: boolean;
  };
}

function ShowcaseCard({ creation }: ShowcaseCardProps) {
  const { id, title, subtext, descriptionMd, date, link, forthcoming } =
    creation;
  const internalLink = `/creation/${id}`;
  const shouldLinkInternal = Boolean(descriptionMd);
  const externalLink = link;
  const style = {
    "--aura-color": stringToColor(title),
    "--aura-color-transparent": stringToColor(title, {
      alpha: 0.3,
    }),
  };
  const postmark = date
    ? dayjs(date).format("MMM YYYY")
    : forthcoming
    ? "soon"
    : "";

  const content = (
    <>
      <div className={classNames("showcaseMedia", { forthcoming })}>
        <CreationPreviewMedia creation={creation} imgixWidth={800} />
      </div>
      <div className="showcaseCaption">
        <div className="showcaseTitleRow">
          <span className="showcaseTitle">{title}</span>
          {postmark && <span className="showcasePostmark">{postmark}</span>}
        </div>
        {subtext && <p className="showcaseSubtext">{subtext}</p>}
      </div>
    </>
  );

  if (shouldLinkInternal || externalLink) {
    return (
      <a
        className={classNames("showcaseCard", {
          external: !shouldLinkInternal,
        })}
        href={shouldLinkInternal ? internalLink : externalLink}
        style={style}
      >
        {content}
      </a>
    );
  }

  return (
    <div className="showcaseCard" style={style}>
      {content}
    </div>
  );
}

export function CreationShowcase({ creations, columns = 1 }: ShowcaseProps) {
  const columnsCountBreakPoints =
    columns === 2
      ? TwoColumnsColumnCountBreakPoints
      : OneColumnColumnCountBreakPoints;

  return (
    <div className="creationShowcase">
      <ResponsiveMasonry columnsCountBreakPoints={columnsCountBreakPoints}>
        <Masonry gutter="2.5em">
          {creations.map((creation) => (
            <ShowcaseCard
              key={creation.id}
              creation={{ id: creation.id, ...creation.data }}
            />
          ))}
        </Masonry>
      </ResponsiveMasonry>
    </div>
  );
}
