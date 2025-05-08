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
import "../../styles/fits.scss";

export interface Fit {
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
  activities: string | string[];
  venue_types: string | string[];
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
          <label className="form-check-label" htmlFor="filterFavorites">
            Only show favorites
          </label>
        </div>
        <div id="fitsContainer" className="gallery">
          {allFits.map((fit, index) => {
            const fitIndex = allFits.length - index;
            return (
              <FitCard
                key={fit.timestamp}
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
  variant?: "default" | "horizontal";
}

export function FitCard({
  fit,
  fitIndex,
  fitsPagePermalink,
  onlyFavorites,
  variant = "default",
}: FitCardProps) {
  const fitPermalink = `${fitsPagePermalink}#${fitIndex}`;
  const previewImgSrc = fit.imgSrc.replace(/\.([^\.]+)$/, "_preview.jpeg");

  if (variant === "horizontal") {
    return (
      <div className="photoCard horizontal mono">
        <div className="photoCard-image">
          <figure
            itemScope
            itemType="http://schema.org/ImageObject"
            className="image gallery-item"
          >
            <ImageZoom
              width={fit.width}
              height={fit.height}
              className="photoCardPhoto galleryImage"
              src={previewImgSrc}
              itemProp="thumbnail"
              alt={`image of Spencer dressed on ${fit.date}`}
            />
          </figure>
        </div>
        <div className="photoCard-content">
          <div className="photoCard-header">
            <div className="photoCard-meta-line">
              <span className="timestamp">
                {dayjs(fit.date).format("MM.DD.YY")}
              </span>
              <span className="location">{fit.city}</span>
              {fit.favorite && <i className="uis uis-star"></i>}
            </div>
          </div>
          <p className="photoCard-description">{fit.description}</p>
          <div className="photoCard-labels">
            <span className="tag season">{fit.season}</span>
            {typeof fit.activities !== "string" &&
              fit.activities.map((activity) => (
                <span className="tag activity">{activity}</span>
              ))}
            {fit.labels?.map((label, i) => (
              <span key={i} className="tag">
                {label}
              </span>
            ))}
            {typeof fit.venue_types !== "string" &&
              fit.venue_types.map((venue) => (
                <span className="tag venue">{venue}</span>
              ))}
          </div>
        </div>
      </div>
    );
  }

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
