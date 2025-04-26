import React from "react";
import "./FeedCard.scss";
import classNames from "classnames";

interface FeedCardProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  allLink?: string;
}

export function FeedCard({ title, icon, children, allLink }: FeedCardProps) {
  const content = (
    <div className="window-header">
      <div className="window-controls">
        {/* {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="dot" />
            ))} */}
      </div>
      <div className="window-title">
        {icon && <span className="icon">{icon}</span>}
        {title}
      </div>
    </div>
  );
  return (
    <div className={classNames("feed-card")}>
      {allLink ? <a href={allLink}>{content}</a> : content}
      <div className="window-content">{children}</div>
    </div>
  );
}
