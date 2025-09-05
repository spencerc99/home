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
          Updated 06-09-25
        </span>
      </div>
      <p>
        - Creating a public art version of{" "}
        <a href="/creation/computing-shrines">computing shrines</a> for display
        in San Francisco 2026...
      </p>
      <p>
        - Designing <a href="/creation/playhtml">playhtml</a>, open-source
        infrastructure for tiny social networks
      </p>
      <p>
        - Open to <a href="/collab">invitations & collaborations</a> for
        teaching, crafting, and scheming.
      </p>
    </div>
  );
}
