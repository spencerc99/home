import type { CollectionEntry } from "astro:content";
import classNames from "classnames";
import React, { useMemo, useRef, useState } from "react";
import { ViewType } from "./views/CreationsView";
import { LazyContainer } from "./LazyContainer";
import { withQueryParams } from "../utils/url";
import { ImageOrVideo } from "./ImageOrVideo";
import dayjs from "dayjs";

interface Props {
  creation: CollectionEntry<"creation">["data"] & {
    id: string;
  };
  view: ViewType;
  isFiltered?: boolean;
  isSelected?: boolean;
}

export function stringToColor(
  str: string,
  {
    saturation = 100,
    lightness = 50,
    alpha = 1,
  }: { saturation?: number; lightness?: number; alpha?: number } = {}
) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  return `hsla(${hash % 360}, ${saturation}%, ${lightness}%, ${alpha})`;
}

export function CreationSummary({
  creation,
  view,
  isFiltered,
  isSelected,
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
    useImageForPreview,
    link,
    forthcoming,
    media,
    assetPreviewIdx,
    parentCategory,
    categories,
  } = creation;
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

  // TODO:remove
  const transformedMovieUrl = useMemo(() => {
    if (!movieUrl) {
      return null;
    }
    return withQueryParams(
      movieUrl.replace("https://codahosted.io", "https://codaio.imgix.net"),
      {
        auto: "format,compress",
        fit: "max",
        w: "450",
      }
    );
  }, [movieUrl]);

  const transformedHeroAsset = useMemo(() => {
    const heroAsset = media[assetPreviewIdx];
    if (!heroAsset) {
      return null;
    }
    return withQueryParams(
      heroAsset.replace("https://codahosted.io", "https://codaio.imgix.net"),
      {
        auto: "format,compress",
        fit: "max",
        w: "450",
      }
    );
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
    case ViewType.LIST:
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
            <b>{parentCategory}</b>
            {categories.filter((c) => c !== parentCategory).length > 0 &&
              `: ${categories.filter((c) => c !== parentCategory).join(", ")}`}
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
          {!useImageForPreview && movieUrl ? (
            <LazyContainer
              style={{
                borderRadius: "inherit",
              }}
            >
              <video
                autoPlay
                muted
                loop
                playsInline
                className={classNames({
                  loading: !hasLoadedMedia,
                })}
                onLoadedData={() => {
                  setHasLoadedMedia(true);
                }}
              >
                {/* NOTE: this type is required for webm videos to work in safari. not all videos are webm but other ones work too with this so 🤷 */}
                <source src={transformedMovieUrl} type="video/webm" />
              </video>
            </LazyContainer>
          ) : transformedHeroAsset ? (
            <LazyContainer
              style={{
                borderRadius: "inherit",
              }}
            >
              <ImageOrVideo
                data-src={transformedHeroAsset}
                className={classNames("lazyload registryImage", {
                  loading: !hasLoadedMedia,
                })}
                loading="lazy"
                onLoad={() => {
                  setHasLoadedMedia(true);
                }}
                // video props
                autoPlay
                muted
                loop
                playsInline
                controls={false}
                onLoadedData={() => {
                  setHasLoadedMedia(true);
                }}
                withZoom={false}
              />
            </LazyContainer>
          ) : null}
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
          id={id}
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
