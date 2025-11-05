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
        - Creating a public art
        <a href="/creation/computing-shrines">computing shrines</a> for display
        in 2026...
      </p>
      <p>
        - Making the{" "}
        <a href="/creation/computing-infused-objects">Phone Pillow</a> a real
        product.
      </p>
      <p>
        - Shaping culture through{" "}
        <a href="https://www.instagram.com/spence.r.chang/">social</a>{" "}
        <a href="https://x.com/spencerc99">media</a>.
      </p>
      <p>
        - Creating infrastructure for{" "}
        <a href="/creation/playhtml">tiny social networks</a>
      </p>
      <p>
        - Open to <a href="/collab">invitations & collaborations</a> for
        teaching, crafting, and scheming.
      </p>
    </div>
  );
}
