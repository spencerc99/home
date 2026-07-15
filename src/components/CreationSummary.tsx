// ABOUTME: Renders creation previews in list and grid layouts.
// ABOUTME: Handles links, metadata, and progressive media loading for summaries.
import type { CollectionEntry } from "astro:content";
import classNames from "classnames";
import React, { useMemo, useState } from "react";
import { ViewType } from "./views/CreationsView";
import { LazyContainer } from "./LazyContainer";
import { ImageOrVideo } from "./ImageOrVideo";
import dayjs from "dayjs";
import { stringToColor } from "../utils";
import { maybeTransformImgixUrl } from "../utils/images";
import { CreationPreviewMedia } from "./CreationPreviewMedia";
import { CategoryStamp } from "./CategoryStamp";

interface Props {
  creation: CollectionEntry<"creation">["data"] & {
    id: string;
  };
  view: ViewType;
  isFiltered?: boolean;
  isSelected?: boolean;
  /** When provided, the category stamp becomes a filter toggle instead of inert text. */
  onCategoryClick?: (category: string) => void;
}

export function CreationSummary({
  creation,
  view,
  isFiltered,
  isSelected,
  onCategoryClick,
}: Props) {
  const {
    title,
    subtext,
    descriptionMd,
    date,
    endDate,
    ongoing,
    id,
    movieUrl,
    link,
    forthcoming,
    media,
    assetPreviewIdx,
    parentCategory,
    mediaMetadata,
    location,
    institution,
  } = creation;
  const institutions = institution?.length ? institution.join(", ") : "";
  const hasVenue = Boolean(institutions || location);
  const internalLink = `/creation/${id}`;
  const externalLink = link;
  const style = {
    "--aura-color": stringToColor(title),
    "--aura-color-transparent": stringToColor(title, {
      alpha: 0.3,
    }),
  };
  const [hasLoadedMedia, setHasLoadedMedia] = useState(false);

  const shouldLinkInternal = Boolean(descriptionMd);

  const transformedHeroAsset = useMemo(() => {
    const heroAsset = media[assetPreviewIdx];
    if (!heroAsset) {
      return null;
    }
    return maybeTransformImgixUrl(heroAsset, {
      auto: "format,compress",
      fit: "max",
      w: "300",
    });
  }, [media, assetPreviewIdx]);

  switch (view) {
    // case ViewType.FREE:
    //   return (
    //     <div id={id} className="creationSummary" can-move="">
    //       {movieUrl ? (
    //         <video autoPlay muted loop>
    //           <source src={movieUrl} type="video/webm" />
    //         </video>
    //       ) : (
    //         <img src={heroImage} className="registryImage" loading="lazy" />
    //       )}
    //       {/* <!-- link to detail --> */}
    //       <a href={link}>
    //         <div className="creationSummaryTitle">
    //           <span>{title}</span>
    //         </div>
    //       </a>
    //     </div>
    //   );
    case ViewType.TABLE:
      return (
        <div
          className={classNames("listViewRow", {
            selected: isSelected,
            filtered: isFiltered,
          })}
          style={style}
        >
          <div
            className={classNames("thumbnail", {
              creationAura: !movieUrl && !transformedHeroAsset,
            })}
          >
            {transformedHeroAsset && (
              <LazyContainer>
                <ImageOrVideo
                  data-src={transformedHeroAsset}
                  className={classNames("lazyload thumbnailImage", {
                    loading: !hasLoadedMedia,
                  })}
                  loading="lazy"
                  onLoad={() => setHasLoadedMedia(true)}
                  style={{
                    aspectRatio: "1",
                    objectFit: "cover",
                    pointerEvents: "none",
                  }}
                  controls={false}
                  withZoom={false}
                  type={mediaMetadata?.[assetPreviewIdx]}
                />
              </LazyContainer>
            )}
          </div>
          <div className="title">
            {shouldLinkInternal || externalLink ? (
              <a
                href={shouldLinkInternal ? internalLink : externalLink}
                className={classNames({ external: !shouldLinkInternal })}
              >
                {title}
              </a>
            ) : (
              title
            )}
          </div>
          <div className="date">
            {date
              ? dayjs(date).format("MMM YYYY")
              : forthcoming
                ? "in progress..."
                : ""}
            {endDate
              ? `-${dayjs(endDate).format("MMM YYYY")}`
              : ongoing
                ? "-now"
                : ""}
          </div>
          <div className="subtext">{subtext}</div>
          <div className="kind">
            <CategoryStamp
              parentCategory={parentCategory}
              onCategoryClick={onCategoryClick}
            />
            {hasVenue && (
              <span className="venue">
                {institutions && (
                  <span className="venueInstitution">{institutions}</span>
                )}
                {institutions && location ? " " : null}
                {location ? `[${location}]` : null}
              </span>
            )}
          </div>
        </div>
      );
    case ViewType.GRID:
      const cover = (
        <div
          className={classNames("previewWrapper", {
            forthcoming,
            creationAura: !movieUrl && !transformedHeroAsset,
          })}
        >
          {subtext && (
            <div className="subtextOverlay">
              <p>{subtext}</p>
            </div>
          )}
          <CategoryStamp
            parentCategory={parentCategory}
            onCategoryClick={onCategoryClick}
          />
          <CreationPreviewMedia creation={creation} />
        </div>
      );
      const linkedCover =
        shouldLinkInternal || externalLink ? (
          <a
            className={classNames("noanchor", {
              external: !shouldLinkInternal,
            })}
            style={{
              borderRadius: "inherit",
            }}
            href={shouldLinkInternal ? internalLink : externalLink}
          >
            {cover}
          </a>
        ) : (
          cover
        );

      return (
        <div
          id={`creation-${id}`}
          style={style}
          className={classNames("creationSummary", "nomove", {
            filtered: isFiltered,
          })}
        >
          {/* <div
            className={classNames({
              creationAura: !movieUrl && !transformedHeroAsset,
            })}
          > */}
          {linkedCover}
          {/* </div> */}
          <div className="creationSummaryTitle">
            <span>{title}</span>
          </div>
        </div>
      );
  }
  // TODO: show preview on hover
}
