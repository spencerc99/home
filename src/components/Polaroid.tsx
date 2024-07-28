import classNames from "classnames";
import React from "react";

export function Polaroid({
  imgSrc,
  alt,
  caption,
  aspectRatio,
  className,
  style,
}: {
  imgSrc: string;
  className?: string;
  alt?: string;
  caption?: string;
  aspectRatio?: string;
  style?: object;
}) {
  return (
    <div className={classNames("polaroid", className)} style={style || {}}>
      <div className="shine-wrap">
        <img
          src={imgSrc}
          alt={alt}
          style={{
            aspectRatio: aspectRatio,
          }}
        />
        <div className="shine"></div>
      </div>
      {caption && <div className="caption">{caption}</div>}
    </div>
  );
}
