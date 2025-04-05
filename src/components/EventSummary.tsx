import type { CollectionEntry } from "astro:content";
import classNames from "classnames";
import React, { useMemo, useState } from "react";
import { LazyContainer } from "./LazyContainer";
import { withQueryParams } from "../utils/url";
import { stringToColor } from "../utils";
import { ImageOrVideo } from "./ImageOrVideo";

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
    movieUrl,
    assetPreviewIdx,
    media,
    link,
    forthcoming,
    mediaMetadata,
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

  const cover = (
    <div
      style={style}
      className={classNames("previewWrapper", {
        forthcoming,
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
