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
        - Creating a public art version of{" "}
        <a href="/creation/computing-shrines">computing shrines</a> for display
        in San Francisco 2026...
      </p>
      <p>
        - Making the{" "}
        <a href="/creation/computing-infused-objects">Phone Pillow</a> a real
        product.
      </p>
      <p>
        - Learning how to reach people and tell stories through social media.
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
