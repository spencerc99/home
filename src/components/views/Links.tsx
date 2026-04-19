// ABOUTME: Links directory page component.
// ABOUTME: Renders a personal directory-style list of links with icons, social links, and now block.

import React from "react";
import SocialMediaLinks from "../SocialMediaLinks";
import { NowBlock, type NowEntry } from "../Now";
import "./Links.scss";

interface LinkType {
  url: string;
  title: string;
  img: string;
}

interface LabeledLinkType {
  label: string;
  url: string;
  title: string;
  img?: string;
}

const MainLinks: LinkType[] = [
  {
    url: "https://spencer.place",
    title: "Home",
    img: "/name-stamp.png",
  },
  {
    url: "https://internetsculptures.com",
    title: "Shop",
    img: "/internet-sculptures-logo-transparent.png",
  },
  {
    url: "https://news.spencer.place",
    title: "Newsletter",
    img: "https://news.spencer.place/favicon.ico",
  },
  {
    url: "/support",
    title: "Support",
    img: "🫶",
  },
];

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
  latestProject?: { title: string; url: string; img?: string };
  upcomingEvents?: UpcomingEvent[];
}

export function LinksView({
  nowEntry,
  latestNewsletter,
  latestProject,
  upcomingEvents = [],
}: LinksViewProps) {
  const labeledLinks: LabeledLinkType[] = [
    {
      label: "latest newsletter",
      url: latestNewsletter?.url || "https://news.spencer.place",
      title: latestNewsletter?.title || "Newsletter",
    },
    {
      label: "latest project",
      url: latestProject?.url || "/creations",
      title: latestProject?.title || "Project",
      img: latestProject?.img,
    },
    {
      label: "make an internet 3rd space!",
      url: "https://playhtml.fun",
      title: "playhtml",
      img: "https://playhtml.fun/icon.png",
    },
    {
      label: "steward a shrine for local intimacy!",
      url: "https://shrine.computer",
      title: "computing shrines",
      img: "https://shrine.computer/icons/shrines.svg",
    },
  ];

  return (
    <div className="linksDirectory">
      <div className="linksSection">
        {MainLinks.map((link) => (
          <LinkRow key={link.url} {...link} />
        ))}
      </div>
      <div className="linksSocial">
        <span className="linksSocial__email">💌 hi@spencer.place</span>
        <SocialMediaLinks />
      </div>
      <div className="linksDivider" />
      <div className="linksSection linksSection--labeled">
        {labeledLinks.map((link) => (
          <LabeledLinkRow key={link.url} {...link} />
        ))}
      </div>
      {upcomingEvents.length > 0 && (
        <>
          <div className="linksSection linksSection--labeled upcomingEvents">
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

function LinkRow({ url, title, img }: LinkType) {
  const isEmoji = !img.startsWith("/") && !img.startsWith("http");
  const displayUrl = url.replace(/^(https?:\/\/|mailto:)/, "");
  const isExternal = url.startsWith("http") || url.startsWith("mailto:");

  return (
    <a
      href={url}
      className="linkRow noanchor"
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener" : undefined}
    >
      <span className={`linkIcon ${isEmoji ? "linkIcon--emoji" : ""}`}>
        {isEmoji ? img : <img src={img} alt="" />}
      </span>
      <span className="linkTitle">{title}</span>
      <span className="linkDots" />
      <span className="linkUrl">{displayUrl}</span>
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
      {meta && <span className="labeledLink__label">{meta}</span>}
      <span className="labeledLink__content">
        <span className="labeledLink__title">{title}</span>
      </span>
    </>
  );

  if (!url) {
    return <div className="labeledLink upcomingEvent">{content}</div>;
  }

  return (
    <a
      href={url}
      className="labeledLink upcomingEvent noanchor"
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener" : undefined}
    >
      {content}
    </a>
  );
}

function LabeledLinkRow({ label, url, title, img }: LabeledLinkType) {
  const isExternal = url.startsWith("http") || url.startsWith("mailto:");
  const hasImg = img && (img.startsWith("/") || img.startsWith("http"));

  return (
    <a
      href={url}
      className="labeledLink noanchor"
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener" : undefined}
    >
      <span className="labeledLink__label">{label}</span>
      <span className="labeledLink__content">
        {hasImg && (
          <span className="labeledLink__icon">
            <img src={img} alt="" />
          </span>
        )}
        <span className="labeledLink__title">{title}</span>
      </span>
    </a>
  );
}
