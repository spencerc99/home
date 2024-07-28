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
          Updated 07-28-24
        </span>
      </div>
      <p>
        - Releasing <a href="/creation/gather">Gather</a>, an app companion to
        your curiosity.
      </p>
      <p>
        - Hosting workshops for <a href="/creation/playhtml">playhtml</a> and{" "}
        <a href="/creation/touching-computers-creating-data-talismans">
          webstones
        </a>
        .
      </p>
      <p>
        - Open to <a href="/collab">invitations & collborations</a> for
        teaching, crafting, and scheming.
      </p>
      <p>
        - (coming out of hibernation) Designing{" "}
        <a href="/creation/playhtml">playhtml</a>, open-source infrastructure
        for tiny social networks
      </p>
    </div>
  );
}
