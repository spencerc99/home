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
          Updated 04-26-25
        </span>
      </div>
      <p>
        - Creating <a href="/creation/computing-shrines">computing shrines</a>{" "}
        in my neighborhood
      </p>
      <p>
        - Preparing for <a href="https://www.demofestival.org/">DEMO 2025</a> at
        NEW INC
      </p>
      <p>
        - Making <a href="https://tiktok.com/@spencer.place">30 videos</a> of
        myself talking to the camera
      </p>
      <p>
        - Migrating fully to <a href="/">this website</a> from my old{" "}
        <code>spencerchang.me</code> domain
      </p>
      {/* <p>
        - (coming out of hibernation) Designing{" "}
        <a href="/creation/playhtml">playhtml</a>, open-source infrastructure
        for tiny social networks
      </p> */}
      <p>
        - Open to <a href="/collab">invitations & collaborations</a> for
        teaching, crafting, and scheming.
      </p>
    </div>
  );
}
