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
          Updated 12-03-24
        </span>
      </div>
      <p>
        - Embedded{" "}
        <a href="https://sc.metalabel.com/field-companions">
          everyday objects with memory
        </a>
      </p>
      <p>
        - Fighting the App Store to release{" "}
        <a href="/creation/gather">Gather</a>, an app companion to your
        curiosity.
      </p>
      <p>
        - Creating <a href="/creation/computing-shrines">computing shrines</a>{" "}
        in my neighborhood
      </p>
      <p>- Reading Isamu Noguchi's Autobiography</p>
      {/* <p>
        - (coming out of hibernation) Designing{" "}
        <a href="/creation/playhtml">playhtml</a>, open-source infrastructure
        for tiny social networks
      </p> */}
      <p>
        - Open to <a href="/collab">invitations & collborations</a> for
        teaching, crafting, and scheming.
      </p>
    </div>
  );
}
