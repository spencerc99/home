// ABOUTME: Showcase layout for a small number of creations in high detail:
// ABOUTME: large media, title, subtext, and date, laid out as trinket-style cards.

import type { CollectionEntry } from "astro:content";
import React from "react";
import classNames from "classnames";
import dayjs from "dayjs";
import { stringToColor } from "../utils";
import { CreationPreviewMedia } from "./CreationPreviewMedia";
import { CategoryStamp } from "./CategoryStamp";

interface ShowcaseProps {
  creations: Array<
    CollectionEntry<"creation"> & {
      data: CollectionEntry<"creation">["data"] & { forthcoming: boolean };
    }
  >;
  // Accounts for if it is in display with something else (matches CreationsView)
  columns?: 1 | 2;
  onCategoryClick?: (category: string) => void;
}

interface ShowcaseCardProps {
  creation: CollectionEntry<"creation">["data"] & {
    id: string;
    forthcoming: boolean;
  };
  onCategoryClick?: (category: string) => void;
}

function ShowcaseCard({ creation, onCategoryClick }: ShowcaseCardProps) {
  const {
    id,
    title,
    subtext,
    descriptionMd,
    date,
    endDate,
    ongoing,
    link,
    forthcoming,
    parentCategory,
  } = creation;
  const internalLink = `/creation/${id}`;
  const shouldLinkInternal = Boolean(descriptionMd);
  const externalLink = link;
  const style = {
    "--aura-color": stringToColor(title),
    "--aura-color-transparent": stringToColor(title, {
      alpha: 0.3,
    }),
  };
  const dateDisplay = [
    date
      ? dayjs(date).format("MMM YYYY")
      : forthcoming
        ? "in progress..."
        : "",
    endDate ? `-${dayjs(endDate).format("MMM YYYY")}` : ongoing ? "-now" : "",
  ].join("");

  const content = (
    <>
      <div className={classNames("showcaseMedia", { forthcoming })}>
        <CategoryStamp
          parentCategory={parentCategory}
          onCategoryClick={onCategoryClick}
        />
        <CreationPreviewMedia creation={creation} imgixWidth={600} />
      </div>
      <div className="showcaseCaption">
        <div className="showcaseTitle">{title}</div>
        {subtext && <p className="showcaseSubtext">{subtext}</p>}
        {dateDisplay && <div className="showcaseMeta">{dateDisplay}</div>}
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

export function CreationShowcase({
  creations,
  columns = 1,
  onCategoryClick,
}: ShowcaseProps) {
  return (
    <div
      className={classNames(
        "creationShowcase",
        columns === 2 ? "sharedWidth" : "fullWidth",
      )}
    >
      {creations.map((creation) => (
        <ShowcaseCard
          key={creation.id}
          creation={{ id: creation.id, ...creation.data }}
          onCategoryClick={onCategoryClick}
        />
      ))}
    </div>
  );
}
