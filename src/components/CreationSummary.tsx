import type { CollectionEntry } from "astro:content";
import classNames from "classnames";
import React from "react";
import { ViewType } from "./CreationsView";
import { LazyContainer } from "./LazyContainer";

interface Props {
  creation: CollectionEntry<"creation">["data"] & {
    id: string;
  };
  view: ViewType;
  isFiltered?: boolean;
}

export function CreationSummary({
  creation: { title, descriptionMd, date, heroImage, ongoing, id, movieUrl },
  view,
  isFiltered,
}: Props) {
  const link = `/creation/${id}`;

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
      const cover = movieUrl ? (
        <LazyContainer
          style={{
            borderRadius: "inherit",
          }}
        >
          <video autoPlay muted loop playsInline>
            <source src={movieUrl} type="video/webm" />
          </video>
        </LazyContainer>
      ) : (
        <img
          src={heroImage}
          className="registryImage"
          loading="lazy"
          alt={`an image that shows a demo of ${title}`}
        />
      );
      const shouldLink = Boolean(descriptionMd);
      const linkedCover = shouldLink ? (
        <a
          style={{
            borderRadius: "inherit",
          }}
          href={link}
        >
          {cover}
        </a>
      ) : (
        cover
      );
      // TODO: else link out maybe with external link treatment
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
