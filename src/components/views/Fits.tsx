import { useState } from "react";
import { ImageZoom } from "../ImageZoom";
import dayjs from "dayjs";
import {
  copyLink,
  scrollUp,
  showLinkCopiedSnackbar,
} from "../../scripts/helpers";
import React from "react";
import { ZoomContextProvider } from "../../context/ZoomContext";
interface Fit {
  description: string;
  imgSrc: string;
  date: string;
  timestamp: number;
  width: number;
  height: number;
  favorite: boolean;
  place: string;
  city: string;
  country: string;
  peopleCount: number;
  labels: string[];
  season: string;
  activities: string;
  venue_types: string;
}

export function FitsView({
  allFits,
  fitsPagePermalink,
}: {
  allFits: Fit[];
  fitsPagePermalink: string;
}) {
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  function filterFits() {
    setOnlyFavorites(!onlyFavorites);
  }

  return (
    <ZoomContextProvider>
      <div style={{ gap: "1em", display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            gap: ".2em",
          }}
        >
          <input
            id="filterFavorites"
            className="filterCheckbox"
            type="checkbox"
            checked={onlyFavorites}
            onChange={filterFits}
          />
          <label className="form-check-label" for="filterFavorites">
            Only show favorites
          </label>
        </div>
        <div id="fitsContainer" className="gallery">
          {allFits.map((fit, index) => {
            const fitIndex = allFits.length - index;
            return (
              <FitCard
                key={fitIndex}
                fit={fit}
                fitIndex={fitIndex}
                fitsPagePermalink={fitsPagePermalink}
                onlyFavorites={onlyFavorites}
              />
            );
          })}
          <div className="scrollUp">
            <button onClick={() => scrollUp("filterFavorites")}>
              Back to top
            </button>
          </div>
        </div>
      </div>
    </ZoomContextProvider>
  );
}

interface FitCardProps {
  fit: Fit;
  fitIndex?: number;
  fitsPagePermalink?: string;
  onlyFavorites?: boolean;
}

export function FitCard({
  fit,
  fitIndex,
  fitsPagePermalink,
  onlyFavorites,
}: FitCardProps) {
  const fitPermalink = `${fitsPagePermalink}#${fitIndex}`;
  const previewImgSrc = fit.imgSrc.replace(/\.([^\.]+)$/, "_preview.jpeg");

  return (
    <div
      id={fitIndex ? fitIndex.toString() : undefined}
      className="photoCard"
      style={{
        display: onlyFavorites && !fit.favorite ? "none" : "block",
      }}
    >
      {fit.favorite && <i className="uis uis-star photoCardFave"></i>}
      <div className="photoCardMeta">
        <span
          className="photoCardIdx"
          onClick={() => {
            if (!fitIndex || !fitsPagePermalink) return;
            copyLink(fitPermalink);
          }}
        >
          {fitIndex} <i className="uil uil-link-h"></i>
        </span>
        <span className="photoCardDate">
          {dayjs(fit.date).format("MM.DD.YYYY")}
        </span>
      </div>

      <figure
        itemScope
        itemType="http://schema.org/ImageObject"
        className="image gallery-item"
      >
        <ImageZoom
          width={fit.width}
          height={fit.height}
          className="lazyload photoCardPhoto galleryImage"
          data-src={previewImgSrc}
          itemProp="thumbnail"
          alt={`image of Spencer dressed on ${fit.date}`}
        />
      </figure>
      <p>{fit.description}</p>
    </div>
  );
}
