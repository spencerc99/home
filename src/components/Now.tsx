import React from "react";

interface NowBlockProps {
  lastUpdated?: string;
}

export function NowBlock({ lastUpdated = "01-26-26" }: NowBlockProps) {
  return (
    <div className="now" style={{ position: "relative" }}>
      <div id="nowTitle">
        <span id="new">NOW</span>{" "}
        <span
          style={{
            float: "right",
            marginRight: "6px",
          }}
          className="descriptionText"
        >
          Updated {lastUpdated}
        </span>
      </div>
      <p>- Exploring making art with my <a href="https://x.com/spencerc99/status/2013758318016451065">internet debris</a></p>
      <p>
        - Making a game for the internet filled with{" "}
        <a href="/creation/playhtml">tiny social networks</a>
      </p>
      <p>
        - Making an app for your to customize your{" "}
        <a href="https://internetsculptures.com">
          Internet Sculptures
        </a>
      </p>
      <p>
        - Shaping culture through{" "}
        <a href="https://www.instagram.com/spence.r.chang/">social</a>{" "}
        <a href="https://x.com/spencerc99">media</a>.
      </p>
      <p>
        - Open to <a href="/collab">invitations & collaborations</a> for
        teaching, crafting, and scheming.
      </p>
    </div>
  );
}
