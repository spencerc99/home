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
          Updated 08-12-24
        </span>
      </div>
      <p>
        - Releasing <a href="/creation/gather">Gather</a>, an app companion to
        your curiosity.
      </p>
      <p>
        - Making a batch of{" "}
        <a href="https://x.com/spencerc99/status/1818721711858368890">
          computing-infused
        </a>{" "}
        <a href="https://x.com/spencerc99/status/1820919721639997849">
          objects
        </a>{" "}
        (sign up{" "}
        <a href="https://forms.gle/AFyjWi7BEEEu92wA8">for preorder info</a>)
      </p>
      <p>
        - Creating <a href="/creation/computing-shrines">computing shrines</a>{" "}
        in my neighborhood
      </p>
      <p>
        - Hosting workshops for <a href="/creation/playhtml">playhtml</a> and{" "}
        <a href="/creation/touching-computers-creating-data-talismans">
          webstones
        </a>
        .
      </p>

      <p>
        - (coming out of hibernation) Designing{" "}
        <a href="/creation/playhtml">playhtml</a>, open-source infrastructure
        for tiny social networks
      </p>
      <p>
        - Open to <a href="/collab">invitations & collborations</a> for
        teaching, crafting, and scheming.
      </p>
    </div>
  );
}
