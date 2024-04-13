import { useState } from "react";
import dayjs from "dayjs";
import {
  copyLink,
  scrollUp,
  showLinkCopiedSnackbar,
} from "../../scripts/helpers";
import React from "react";
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
          const fitPermalink = `${fitsPagePermalink}#${fitIndex}`;
          // <!-- NOTE: we replace the extension to jpeg since apple photos preview is always jpeg, not -->
          // <!-- whatever the original extension was. -->
          const previewImgSrc = fit.imgSrc.replace(
            /\.([^\.]+)$/,
            "_preview.jpeg"
          );
          //                         <Image width={fit.width} height={fit.height} className="lazyload photoCardPhoto galleryImage" src={previewImgSrc} itemprop="thumbnail"  alt={`image of Spencer dressed on ${fit.date}`}/>

          return (
            <div
              id={fitIndex.toString()}
              className="photoCard"
              style={{
                display: onlyFavorites && !fit.favorite ? "none" : "block",
              }}
            >
              {fit.favorite && <i className="uis uis-star photoCardFave"></i>}
              <div className="photoCardMeta">
                <span
                  className="photoCardIdx"
                  onClick={() => copyLink(fitPermalink)}
                >
                  {fitIndex} <i className="uil uil-link-h"></i>
                </span>
                <span className="photoCardDate">
                  {dayjs(fit.date).format("MM.DD.YYYY")}
                </span>
              </div>

              <figure
                itemscope
                itemtype="http://schema.org/ImageObject"
                className="image gallery-item"
              >
                {/* <!-- TODO: calculate proper size based on item and store inside json, needed for animation --> */}
                <a
                  className="galleryLink"
                  href={fit.imgSrc}
                  itemprop="contentUrl"
                  data-size={`${fit.width}x${fit.height}`}
                >
                  {/* <!-- Manually setting a 1.5 aspect ratio here using width + height -->
                        <!-- because modern browsers will make sure to reserve space to prevent reflow -->
                        <!-- eventually should calculate it properly and set here and above -->
                        <!-- source: https://www.youtube.com/watch?v=4-d_SoCHeWE -->
                        <!-- and https://www.codecaptain.io/blog/web-development/responsive-images-and-preventing-page-reflow/474 --> */}
                  <img
                    width={fit.width}
                    height={fit.height}
                    className="lazyload photoCardPhoto galleryImage"
                    data-src={previewImgSrc}
                    itemprop="thumbnail"
                    alt={`image of Spencer dressed on ${fit.date}`}
                  />
                </a>
              </figure>
              <p>{fit.description}</p>
            </div>
          );
        })}
        <div className="scrollUp">
          <button onClick={() => scrollUp("filterFavorites")}>
            Back to top
          </button>
        </div>
      </div>
    </div>
  );
}
