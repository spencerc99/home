// ABOUTME: Progressive image-to-video preview media for a creation.
// ABOUTME: Shared by grid cards and showcase cards for the hero preview.

import type { CollectionEntry } from "astro:content";
import classNames from "classnames";
import React, { useMemo, useState } from "react";
import { LazyContainer } from "./LazyContainer";
import { ImageOrVideo } from "./ImageOrVideo";
import { maybeTransformImgixUrl } from "../utils/images";
import { getProgressivePreviewImage } from "../utils/creationPreviewMedia";

interface Props {
  creation: CollectionEntry<"creation">["data"] & {
    id: string;
  };
  imgixWidth?: number;
}

export function CreationPreviewMedia({ creation, imgixWidth = 300 }: Props) {
  const { movieUrl, useImageForPreview, media, assetPreviewIdx, mediaMetadata } =
    creation;
  const [hasLoadedMedia, setHasLoadedMedia] = useState(false);

  const transformedMovieUrl = useMemo(() => {
    if (!movieUrl) {
      return null;
    }
    return maybeTransformImgixUrl(movieUrl, {
      auto: "format,compress",
      fit: "max",
      w: String(imgixWidth),
    });
  }, [movieUrl, imgixWidth]);

  const transformedHeroAsset = useMemo(() => {
    const heroAsset = media[assetPreviewIdx];
    if (!heroAsset) {
      return null;
    }
    return maybeTransformImgixUrl(heroAsset, {
      auto: "format,compress",
      fit: "max",
      w: String(imgixWidth),
    });
  }, [media, assetPreviewIdx, imgixWidth]);

  const transformedProgressivePreviewImage = useMemo(() => {
    const previewImage = getProgressivePreviewImage({
      media,
      mediaMetadata,
      assetPreviewIdx,
    });
    if (!previewImage) {
      return null;
    }
    return maybeTransformImgixUrl(previewImage, {
      auto: "format,compress",
      fit: "max",
      w: String(imgixWidth),
    });
  }, [media, mediaMetadata, assetPreviewIdx, imgixWidth]);

  const previewMediaType = mediaMetadata?.[assetPreviewIdx];
  const progressivePreviewImage =
    transformedProgressivePreviewImage && !hasLoadedMedia ? (
      <ImageOrVideo
        src={transformedProgressivePreviewImage}
        className="registryImage"
        loading="lazy"
        style={{
          gridArea: "1 / 1",
          objectFit: "cover",
          pointerEvents: "none",
        }}
        controls={false}
        withZoom={false}
        type="image"
      />
    ) : null;
  const hasProgressivePreviewImage = Boolean(progressivePreviewImage);
  const loadingVideoStyle = {
    gridArea: "1 / 1",
    opacity: hasProgressivePreviewImage ? 0 : undefined,
  };

  if (!useImageForPreview && movieUrl) {
    return (
      <LazyContainer
        style={{
          borderRadius: "inherit",
        }}
      >
        <div
          style={{
            display: "grid",
            borderRadius: "inherit",
          }}
        >
          {progressivePreviewImage}
          <video
            autoPlay
            muted
            loop
            playsInline
            className={classNames({
              loading: !hasLoadedMedia && !hasProgressivePreviewImage,
            })}
            style={loadingVideoStyle}
            onLoadedData={() => {
              setHasLoadedMedia(true);
            }}
          >
            {/* NOTE: this type is required for webm videos to work in safari. not all videos are webm but other ones work too with this so 🤷 */}
            <source src={transformedMovieUrl} type="video/webm" />
          </video>
        </div>
      </LazyContainer>
    );
  }

  if (transformedHeroAsset) {
    return (
      <LazyContainer
        style={{
          borderRadius: "inherit",
        }}
      >
        {previewMediaType === "video" && transformedProgressivePreviewImage ? (
          <div
            style={{
              display: "grid",
              borderRadius: "inherit",
            }}
          >
            {progressivePreviewImage}
            <ImageOrVideo
              data-src={transformedHeroAsset}
              className={classNames("lazyload registryImage", {
                loading: !hasLoadedMedia && !hasProgressivePreviewImage,
              })}
              loading="lazy"
              style={loadingVideoStyle}
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
              type={previewMediaType}
            />
          </div>
        ) : (
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
            type={previewMediaType}
          />
        )}
      </LazyContainer>
    );
  }

  return null;
}
