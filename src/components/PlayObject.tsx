import React from "react";

interface Props {
  src: string;
  //   Play attributes, eventually add custom functionality
  attributes: {};
  style?: React.CSSProperties;
}
export function PlayObject({ src, attributes, style }: Props) {
  return (
    <div className="object" {...attributes} style={style}>
      <img src={src} />
    </div>
  );
}
