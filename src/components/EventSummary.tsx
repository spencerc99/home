import type { CollectionEntry } from "astro:content";
import classNames from "classnames";
import React, { useMemo, useState } from "react";
import { LazyContainer } from "./LazyContainer";
import { withQueryParams } from "../utils/url";
import { stringToColor } from "./CreationSummary";

interface Props {
  event: CollectionEntry<"creation">["data"] & {
    id: string;
  };
}

export function EventSummary({
  event: {
    title,
    subtext,
    date,
    heroImage,
    movieUrl,
    useImageForPreview,
    link,
    forthcoming,
  },
}: Props) {
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
  }, [heroImage]);
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
  }, [movieUrl]);

  const cover = (
    <div
      style={style}
      className={classNames("previewWrapper", {
        forthcoming,
        creationAura: !movieUrl && !heroImage,
      })}
    >
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
            <source src={transformedMovieUrl} />
          </video>
        </LazyContainer>
      ) : heroImage ? (
        <img
          data-src={transformedHeroImage}
          className={classNames("lazyload registryImage", {
            loading: !hasLoadedMedia,
          })}
          loading="lazy"
          onLoad={() => {
            setHasLoadedMedia(true);
          }}
        />
      ) : null}
    </div>
  );
  const linkedCover = externalLink ? (
    <a
      className={classNames("noanchor", {
        external: true,
      })}
      style={{
        borderRadius: "inherit",
      }}
      href={externalLink}
    >
      {cover}
    </a>
  ) : (
    cover
  );

  return (
    <div className={classNames("eventSummary")}>
      <h3>
        {date.toLocaleDateString("en-us", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </h3>
      <div className="eventInfo">
        {linkedCover}
        <div className="creationSummaryTitle">
          <em>{title}</em>
          <span>{subtext}</span>
          {forthcoming && <a href={link}>Register</a>}
        </div>
      </div>
    </div>
  );
}
