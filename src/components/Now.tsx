import React from "react";

export function NowBlock() {
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
          Updated 09-06-25
        </span>
      </div>

      <p>
        - Releasing the{" "}
        <a href="https://internetsculptures.com/object/phone-pillow">
          Phone Pillow
        </a>
        , a pillow for your phone to rest and for you to take a break from your
        phone.
      </p>
      <p>
        - Watching the front page of Hacker News discuss{" "}
        <a href="/creation/alive-internet-theory">alive internet theory</a>
      </p>
      <p>
        - Shaping culture through{" "}
        <a href="https://www.instagram.com/spence.r.chang/">social</a>{" "}
        <a href="https://x.com/spencerc99">media</a>.
      </p>
      <p>
        - Making a game for the internet filled with{" "}
        <a href="/creation/playhtml">tiny social networks</a>
      </p>
      <p>
        - Open to <a href="/collab">invitations & collaborations</a> for
        teaching, crafting, and scheming.
      </p>
    </div>
  );
}
