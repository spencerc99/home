import type { CollectionEntry } from "astro:content";
import React from "react";
import { ViewType } from "./CreationsView";
import { LazyContainer } from "./LazyContainer";

interface Props {
  creation: CollectionEntry<"creation">["data"] & {
    id: string;
  };
  view: ViewType;
}

export function CreationSummary({
  creation: { title, descriptionMd, date, heroImage, ongoing, id, movieUrl },
  view,
}: Props) {
  const link = `/creation/${id}`;

  console.log(view);

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
      return (
        <div id={id} className="creationSummary nomove">
          {movieUrl ? (
            <LazyContainer>
              <video autoPlay muted loop playsInline>
                <source src={movieUrl} type="video/webm" />
              </video>
            </LazyContainer>
          ) : (
            <img src={heroImage} className="registryImage" loading="lazy" />
          )}
          {/* <!-- link to detail --> */}
          {descriptionMd ? (
            <a href={link}>
              <div className="creationSummaryTitle">
                <span>{title}</span>
              </div>
            </a>
          ) : (
            // TODO: else link out maybe with external link treatment
            <div className="creationSummaryTitle">
              <span>{title}</span>
            </div>
          )}
        </div>
      );
  }
  // TODO: show preview on hover
}
