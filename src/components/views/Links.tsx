// ABOUTME: Links directory page component.
// ABOUTME: Renders a personal directory-style list of links with icons, social links, and now block.

import React from "react";
import SocialMediaLinks from "../SocialMediaLinks";
import { NowBlock, type NowEntry } from "../Now";
import "./Links.scss";

interface LinkType {
  url: string;
  title: string;
  detail: string;
  img?: string;
  preserveTitleCase?: boolean;
}

interface UpcomingEvent {
  title: string;
  url?: string;
  location?: string;
  dateRange?: string;
  parentCategory?: string;
}

interface LinksViewProps {
  nowEntry?: NowEntry;
  latestNewsletter?: { title: string; url: string };
  upcomingEvents?: UpcomingEvent[];
}

export function LinksView({
  nowEntry,
  latestNewsletter,
  upcomingEvents = [],
}: LinksViewProps) {
  const mainLinks: LinkType[] = [
    {
      url: "https://spencer.place",
      title: "Home",
      detail: "spencer.place",
      img: "/name-stamp.png",
    },
    {
      url: "https://internetsculptures.com",
      title: "Shop",
      detail: "internetsculptures.com",
      img: "/internet-sculptures-logo-transparent.png",
    },
    {
      url: "https://wewere.online",
      title: "we were online",
      detail: "Browse Together",
      img: "https://wewere.online/favicon.png",
      preserveTitleCase: true,
    },
    {
      url: latestNewsletter?.url || "https://news.spencer.place",
      title: "Newsletter",
      detail: latestNewsletter?.title || "Read the latest issue",
      img: "https://news.spencer.place/favicon.ico",
    },
    {
      url: "https://playhtml.fun",
      title: "playhtml",
      detail: "Make an internet 3rd space!",
      img: "https://playhtml.fun/icon.png",
    },
  ];

  return (
    <div className="linksDirectory">
      <div className="linksSection">
        {mainLinks.map((link) => (
          <LinkRow key={link.url} {...link} />
        ))}
      </div>
      <div className="linksSocial">
        <span className="linksSocial__email">💌 hi@spencer.place</span>
        <SocialMediaLinks />
      </div>
      {upcomingEvents.length > 0 && (
        <>
          <div className="linksDivider" />
          <div className="linksSection upcomingEvents">
            <div className="upcomingEvents__label">upcoming</div>
            {upcomingEvents.map((event, i) => (
              <UpcomingEventRow key={event.url || `${event.title}-${i}`} {...event} />
            ))}
          </div>
          <div className="linksDivider" />
        </>
      )}
      {nowEntry && <NowBlock entry={nowEntry} />}
    </div>
  );
}

function LinkRow({ url, title, detail, img, preserveTitleCase }: LinkType) {
  const isEmoji = img && !img.startsWith("/") && !img.startsWith("http");
  const isExternal = url.startsWith("http") || url.startsWith("mailto:");

  return (
    <a
      href={url}
      className="linkRow noanchor"
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener" : undefined}
    >
      {img && (
        <span className={`linkIcon ${isEmoji ? "linkIcon--emoji" : ""}`}>
          {isEmoji ? img : <img src={img} alt="" />}
        </span>
      )}
      <span className={`linkTitle ${preserveTitleCase ? "linkTitle--preserveCase" : ""}`}>
        {title}
      </span>
      <span className="linkDots" />
      <span className="linkDetail">{detail}</span>
    </a>
  );
}

function UpcomingEventRow({
  title,
  url,
  location,
  dateRange,
  parentCategory,
}: UpcomingEvent) {
  const isExternal = !!url && (url.startsWith("http") || url.startsWith("mailto:"));
  const meta = [parentCategory, location, dateRange].filter(Boolean).join(" · ");
  const content = (
    <>
      <span className="linkTitle">{title}</span>
      <span className="linkDots" />
      {meta && <span className="linkDetail">{meta}</span>}
    </>
  );

  if (!url) {
    return <div className="linkRow upcomingEvent">{content}</div>;
  }

  return (
    <a
      href={url}
      className="linkRow upcomingEvent noanchor"
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener" : undefined}
    >
      {content}
    </a>
  );
}
