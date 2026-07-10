// ABOUTME: Dev-only comparison page component rendering candidate showcase card
// ABOUTME: designs (variants A/B/C) side by side for design review.

import type { CollectionEntry } from "astro:content";
import classNames from "classnames";
import dayjs from "dayjs";
import React from "react";
import { stringToColor } from "../../utils";
import { CreationPreviewMedia } from "../CreationPreviewMedia";
import { CategoryStamp } from "../CategoryStamp";
import "./ShowcaseOptions.scss";

type Variant = "a" | "b" | "c";

const VARIANTS: { key: Variant; label: string }[] = [
  { key: "a", label: "OPTION A — quiet caption (grid-native)" },
  { key: "b", label: "OPTION B — title row + year" },
  { key: "c", label: "OPTION C — trinket card" },
];

interface Props {
  creations: (CollectionEntry<"creation"> & {
    data: CollectionEntry<"creation">["data"] & { forthcoming: boolean };
  })[];
}

export function ShowcaseOptions({ creations }: Props) {
  return (
    <>
      {VARIANTS.map(({ key, label }) => (
        <section className="showcaseOptionSection" key={key}>
          <h2 className="mono" style={{ fontSize: "16px", textTransform: "uppercase" }}>
            {label}
          </h2>
          <div className="showcaseCompact">
            {creations.map((c) => (
              <OptionCard
                key={c.id}
                creation={{ id: c.id, ...c.data }}
                variant={key}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

interface OptionCardProps {
  creation: CollectionEntry<"creation">["data"] & { id: string };
  variant: Variant;
}

function OptionCard({ creation, variant }: OptionCardProps) {
  const { title, subtext, descriptionMd, date, id, link, forthcoming, parentCategory } =
    creation;
  const internalLink = `/creation/${id}`;
  const shouldLinkInternal = Boolean(descriptionMd);
  const externalLink = link;
  const auraStyle = {
    "--aura-color": stringToColor(title),
    "--aura-color-transparent": stringToColor(title, { alpha: 0.3 }),
  } as React.CSSProperties;

  let caption: React.ReactNode;
  if (variant === "a") {
    caption = (
      <div className="scCaption">
        <div className="scTitle">{title}</div>
        {subtext && <p className="scSub">{subtext}</p>}
      </div>
    );
  } else if (variant === "b") {
    caption = (
      <div className="scCaption">
        <div className="scTitleRow">
          <span className="scTitle">{title}</span>
          {date && <span className="scYear">{dayjs(date).format("YYYY")}</span>}
        </div>
        {subtext && <p className="scSub">{subtext}</p>}
      </div>
    );
  } else {
    caption = (
      <div className="scCaption">
        <div className="scTitle">{title}</div>
        {subtext && <p className="scSub">{subtext}</p>}
        <div className="scMeta">
          {[
            date ? dayjs(date).format("MMM YYYY") : forthcoming ? "soon" : null,
            parentCategory,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
    );
  }

  const media = (
    <div className={classNames("scMedia", { forthcoming })}>
      <CategoryStamp parentCategory={parentCategory} />
      <CreationPreviewMedia creation={creation} imgixWidth={600} />
    </div>
  );

  const className = classNames("scCard", `scCard-${variant}`, {
    external: !shouldLinkInternal,
  });

  if (shouldLinkInternal || externalLink) {
    return (
      <a
        className={className}
        href={shouldLinkInternal ? internalLink : externalLink}
        style={auraStyle}
      >
        {media}
        {caption}
      </a>
    );
  }

  return (
    <div className={className} style={auraStyle}>
      {media}
      {caption}
    </div>
  );
}
