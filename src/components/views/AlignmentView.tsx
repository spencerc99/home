// ABOUTME: Displays projects with alignment reflection columns
// ABOUTME: for checking in on whether projects feel personally aligned

import type { CollectionEntry } from "astro:content";
import React, { useState, useMemo } from "react";
import { CreationListView } from "./CreationListView";
import "./CreationsView.scss";
import dayjs from "dayjs";
import classNames from "classnames";
import { stringToColor } from "../../utils";
import { LazyContainer } from "../LazyContainer";
import { ImageOrVideo } from "../ImageOrVideo";
import { maybeTransformImgixUrl } from "../../utils/images";

type AlignmentValue = "y" | "n" | "m" | undefined;

function renderAlignmentValue(value: AlignmentValue): string {
  switch (value) {
    case "y":
      return "●";
    case "n":
      return "○";
    case "m":
      return "◐";
    default:
      return "—";
  }
}

interface Props {
  creations: Array<
    CollectionEntry<"creation"> & {
      data: CollectionEntry<"creation">["data"] & { forthcoming: boolean };
    }
  >;
}

export function AlignmentView({ creations }: Props) {
  return (
    <div className="creationsView">
      <CreationListView
        creations={creations}
        className="alignmentView"
        headerClassName="alignmentHeader"
        headerColumns={(selectedIndex) => (
          <>
            <div>
              {selectedIndex > -1 ? selectedIndex + 1 : "?"}/{creations.length}
            </div>
            <div>What</div>
            <div>When</div>
            <div>teaser</div>
            <div className="alignment-header-love">
              <span className="desktop-only">do I love this?</span>
              <span className="mobile-only">Love?</span>
            </div>
            <div className="alignment-header-me">
              <span className="desktop-only">does it feel like me?</span>
              <span className="mobile-only">Like me?</span>
            </div>
          </>
        )}
        renderRow={(creation, index, isSelected) => {
          const style = {
            "--aura-color": stringToColor(creation.data.title),
            "--aura-color-transparent": stringToColor(creation.data.title, {
              alpha: 0.3,
            }),
          };

          const heroAsset =
            creation.data.media?.[creation.data.assetPreviewIdx || 0];
          const transformedHeroAsset = heroAsset
            ? maybeTransformImgixUrl(heroAsset, {
                auto: "format,compress",
                fit: "max",
                w: "300",
              })
            : null;

          return (
            <div
              className={classNames("alignmentRow", {
                selected: isSelected,
              })}
              style={style}
            >
              <div
                className={classNames("thumbnail", {
                  creationAura: !transformedHeroAsset,
                })}
              >
                {transformedHeroAsset && (
                  <LazyContainer>
                    <ImageOrVideo
                      data-src={transformedHeroAsset}
                      className="lazyload thumbnailImage"
                      loading="lazy"
                      style={{
                        aspectRatio: "1",
                        objectFit: "cover",
                        pointerEvents: "none",
                      }}
                      controls={false}
                      withZoom={false}
                      type={
                        creation.data.mediaMetadata?.[
                          creation.data.assetPreviewIdx || 0
                        ]
                      }
                    />
                  </LazyContainer>
                )}
              </div>
              <div className="title">
                {creation.data.descriptionMd || creation.data.link ? (
                  <a
                    href={
                      creation.data.descriptionMd
                        ? `/creation/${creation.id}`
                        : creation.data.link
                    }
                    className={classNames({
                      external: !creation.data.descriptionMd,
                    })}
                  >
                    {creation.data.title}
                  </a>
                ) : (
                  creation.data.title
                )}
              </div>
              <div className="date">
                {creation.data.date
                  ? dayjs(creation.data.date).format("MMM YYYY")
                  : creation.data.forthcoming
                  ? "in progress..."
                  : ""}
                {creation.data.endDate
                  ? `-${dayjs(creation.data.endDate).format("MMM YYYY")}`
                  : creation.data.ongoing
                  ? "-now"
                  : ""}
              </div>
              <div className="subtext">{creation.data.subtext}</div>
              <div className="alignmentColumn loveIt">
                {renderAlignmentValue(creation.data.love)}
              </div>
              <div className="alignmentColumn feelsLikeMe">
                {renderAlignmentValue(creation.data.me)}
              </div>
            </div>
          );
        }}
        rowKey={(creation) => creation.id}
        onNavigate={(creation) => {
          window.location.href = `/creation/${creation.id}`;
        }}
      />
    </div>
  );
}
