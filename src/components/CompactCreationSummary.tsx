import type { CollectionEntry } from "astro:content";
import classNames from "classnames";
import React, { useMemo, useState } from "react";
import { LazyContainer } from "./LazyContainer";
import { stringToColor } from "../utils";
import { ImageOrVideo } from "./ImageOrVideo";
import { maybeTransformImgixUrl } from "../utils/images";
import "./CompactCreationSummary.scss";

interface Props {
  creation:
    | (CollectionEntry<"creation">["data"] & {
        id: string;
      })
    | (CollectionEntry<"posts">["data"] & {
        id: string;
      });
  className?: string;
}

export function CompactCreationSummary({
  creation: {
    title,
    subtext,
    date,
    movieUrl,
    assetPreviewIdx = 0,
    media,
    link,
    forthcoming,
    mediaMetadata,
    isEvent,
    descriptionMd,
    description,
    pubDate,
    heroImage,
    externalLink,
    slug,
    id,
  },
  className,
}: Props) {
  // Handle both creation and post data
  const displayDate = pubDate || date;
  const displayLink = externalLink || link;
  const style = {
    "--aura-color": stringToColor(title),
    "--aura-color-transparent": stringToColor(title, {
      alpha: 0.3,
    }),
  } as React.CSSProperties;

  const [hasLoadedMedia, setHasLoadedMedia] = useState(false);
  const transformedHeroAsset = useMemo(() => {
    // Handle both creation media array and post heroImage
    if (heroImage) {
      return typeof heroImage === "string"
        ? heroImage
        : maybeTransformImgixUrl(heroImage, {
            auto: "format,compress",
            fit: "max",
            w: "450",
          });
    }

    const heroAsset = media?.[assetPreviewIdx];
    if (!heroAsset) {
      return null;
    }
    return maybeTransformImgixUrl(heroAsset, {
      auto: "format,compress",
      fit: "max",
      w: "450",
    });
  }, [media, assetPreviewIdx, heroImage]);

  const cover = (
    <div
      style={style}
      className={classNames("previewWrapper", {
        creationAura: !movieUrl && !transformedHeroAsset,
      })}
    >
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
          style={{
            width: "fit-content",
            maxWidth: "250px",
          }}
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
          type={mediaMetadata?.[assetPreviewIdx]}
        />
      </LazyContainer>
    </div>
  );

  const linkedCover = displayLink ? (
    <a
      className={classNames("noanchor", {
        external: true,
      })}
      style={{
        borderRadius: "inherit",
      }}
      href={displayLink}
    >
      {cover}
    </a>
  ) : (
    cover
  );

  const internalLink = pubDate
    ? `/posts/${slug}`
    : descriptionMd
    ? `/creation/${id}`
    : displayLink;

  return (
    <div className={`${className} compact-creation-summary`}>
      <div
        className="creation-summary-content"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1em",
          justifyContent: "space-between",
        }}
      >
        <div
          className="creation-title"
          style={{
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: ".25em",
            maxWidth: "50%",
            lineHeight: "1.2",
          }}
        >
          {displayDate && (
            <h3>
              {displayDate.toLocaleDateString("en-us", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </h3>
          )}
          <em>{title}</em>
          <p className="descriptionText">{description || subtext}</p>
          {((isEvent && forthcoming) || (!isEvent && displayLink)) && (
            <a href={internalLink || displayLink} className="creation-link">
              {isEvent && forthcoming ? "Register" : "Learn"}
            </a>
          )}
        </div>
        {linkedCover}
      </div>
    </div>
  );
}
