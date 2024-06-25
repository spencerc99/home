import type { CollectionEntry } from "astro:content";
import classNames from "classnames";
import React, { useMemo, useRef, useState } from "react";
import { ViewType } from "./views/CreationsView";
import { LazyContainer } from "./LazyContainer";
import { withQueryParams } from "../utils/url";

interface Props {
  creation: CollectionEntry<"creation">["data"] & {
    id: string;
  };
  view: ViewType;
  isFiltered?: boolean;
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
  creation: {
    title,
    descriptionMd,
    date,
    heroImage,
    ongoing,
    id,
    movieUrl,
    useImageForPreview,
    link,
  },
  view,
  isFiltered,
}: Props) {
  const internalLink = `/creation/${id}`;
  const externalLink = link;
  const style = {
    "--aura-color": stringToColor(title),
    "--aura-color-transparent": stringToColor(title, {
      alpha: 0.3,
    }),
  };
  const [hasLoadedMedia, setHasLoadedMedia] = useState(false);
  const transformedHeroImage = useMemo(() => {
    if (!heroImage) {
      return heroImage;
    }
    return withQueryParams(
      heroImage.replace("https://codahosted.io", "https://codaio.imgix.net"),
      {
        auto: "format,compress",
        fit: "max",
        w: "450",
      }
    );
  }, heroImage);
  const transformedMovieUrl = useMemo(() => {
    if (!movieUrl) {
      return movieUrl;
    }
    return withQueryParams(
      movieUrl.replace("https://codahosted.io", "https://codaio.imgix.net"),
      {
        auto: "format,compress",
        fit: "max",
        w: "450",
      }
    );
  }, movieUrl);

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
    case ViewType.GRID:
      const cover =
        !useImageForPreview && movieUrl ? (
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
              style={style}
              onLoadedData={() => {
                setHasLoadedMedia(true);
              }}
              className={classNames({
                loading: !hasLoadedMedia,
              })}
            >
              <source src={transformedMovieUrl} />
            </video>
          </LazyContainer>
        ) : heroImage ? (
          <img
            style={style}
            data-src={transformedHeroImage}
            className={classNames("lazyload registryImage", {
              loading: !hasLoadedMedia,
            })}
            loading="lazy"
            onLoad={() => {
              setHasLoadedMedia(true);
            }}
          />
        ) : (
          <div className="creationAura" style={style}></div>
        );
      const shouldLinkInternal = Boolean(descriptionMd);
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
          className={classNames("creationSummary", "nomove", {
            filtered: isFiltered,
          })}
        >
          {linkedCover}
          <div className="creationSummaryTitle">
            <span>{title}</span>
          </div>
        </div>
      );
  }
  // TODO: show preview on hover
}
