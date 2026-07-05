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
import { getProgressivePreviewImage } from "../utils/creationPreviewMedia";

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
    useImageForPreview,
    link,
    forthcoming,
    media,
    assetPreviewIdx,
    parentCategory,
    mediaMetadata,
  } = creation;
  const internalLink = `/creation/${id}`;
  const externalLink = link;
  const style = {
    "--aura-color": stringToColor(title),
    "--aura-color-transparent": stringToColor(title, {
      alpha: 0.3,
    }),
  };
  // Category stamp color is derived from the category name (not the title) so
  // every creation in the same category shares the same stamp color. Kept
  // low-saturation so categories stay distinguishable without shouting.
  const categoryStampStyle = parentCategory
    ? ({
        "--category-stamp-color": stringToColor(parentCategory, {
          saturation: 45,
          lightness: 55,
        }),
      } as React.CSSProperties)
    : undefined;
  // Shared category stamp/chip reused by both grid overlays and the list view's
  // "kind" column. When onCategoryClick is provided it becomes a filter toggle.
  const categoryStamp = parentCategory ? (
    onCategoryClick ? (
      <span
        className="categoryStamp interactive"
        style={categoryStampStyle}
        role="button"
        tabIndex={0}
        title={`Filter by ${parentCategory}`}
        onClick={(e) => {
          // Stamp may live inside a cover link, so suppress navigation.
          e.preventDefault();
          e.stopPropagation();
          onCategoryClick(parentCategory);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            onCategoryClick(parentCategory);
          }
        }}
      >
        {parentCategory}
      </span>
    ) : (
      <span className="categoryStamp" style={categoryStampStyle}>
        {parentCategory}
      </span>
    )
  ) : null;
  const [hasLoadedMedia, setHasLoadedMedia] = useState(false);

  const shouldLinkInternal = Boolean(descriptionMd);

  // TODO:remove
  const transformedMovieUrl = useMemo(() => {
    if (!movieUrl) {
      return null;
    }
    return maybeTransformImgixUrl(movieUrl, {
      auto: "format,compress",
      fit: "max",
      w: "300",
    });
  }, [movieUrl]);

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
      w: "300",
    });
  }, [media, mediaMetadata, assetPreviewIdx]);

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
          <div className="kind">{categoryStamp}</div>
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
          {categoryStamp}
          {!useImageForPreview && movieUrl ? (
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
          ) : transformedHeroAsset ? (
            <LazyContainer
              style={{
                borderRadius: "inherit",
              }}
            >
              {previewMediaType === "video" &&
              transformedProgressivePreviewImage ? (
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
