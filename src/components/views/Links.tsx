import React from "react";
import "./Links.scss";

interface LinkType {
  url: string;
  title: string;
  description?: string;
  img: string;
}

const Links: LinkType[] = [
  {
    url: "https://spencer.place",
    title: "Homepage",
    description: "all my work and creations",
    img: "/name-stamp.png",
  },
  {
    url: "https://objects.spencer.place",
    title: "Internet Sculptures Shop",
    img: "/internet-sculptures-wip-logo.png",
  },
  {
    url: "https://spencerchang.substack.com",
    title: "Newsletter",
    img: "https://spencerchang.substack.com/favicon.ico",
  },
];

// TODO: style this after domains and add the domains
export function LinksView() {
  return (
    <div className="linksView">
      {Links.map((link) => (
        <Link {...link} />
      ))}
    </div>
  );
}

export function Link({
  url,
  title,
  description,
  img,
}: {
  url: string;
  title: string;
  description?: string;
  img: string;
}) {
  return (
    <a href={url} className="noanchor">
      <div className="link">
        {/* {img && <img src={img} />} */}
        <div className="title">{title}</div>
        {description && <div className="description">{description}</div>}
        <div
          className="linkIcon"
          style={{
            backgroundImage: `url(${img})`,
          }}
        ></div>
      </div>
    </a>
  );
}
