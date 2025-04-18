import React from "react";
import "./FeedCard.scss";
import classNames from "classnames";

interface FeedCardProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  variant?: "default" | "borderless";
}

export function FeedCard({
  title,
  icon,
  children,
  variant = "default",
}: FeedCardProps) {
  return (
    <div className={classNames("feed-card", `variant-${variant}`)}>
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
      <div className="window-content">{children}</div>
    </div>
  );
}
