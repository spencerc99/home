import React from "react";

export function NowBlock() {
  return (
    <div className="now" style={{ position: "relative" }}>
      <span id="new">NOW</span>
      <p>
        - Making <a href="/creation/gather">Gather</a>, a local-first
        collections client.
      </p>
      <p>
        - Creating <a href="/creation/acknowledgenet">acknowledgeNET</a>, an
        installation honoring our labor creating the internet. Showing at{" "}
        <a href="https://grayarea.org/event/gray-area-artist-showcase-summer-2024/">
          Gray Area in July
        </a>
        .
      </p>
      <p>
        - Crafting{" "}
        <a href="/creation/touching-computers-creating-data-talismans">
          computing-infused
        </a>{" "}
        sculptures (and available for limited{" "}
        <a href="/collab#commission">custom commissions</a>)
      </p>
      <p>
        - Open to <a href="/collab">invitations</a> for speaking, writing, and
        consulting.
      </p>
      <p>
        - (in hibernation) Designing <a href="/creation/playhtml">playhtml</a>,
        open-source infrastructure for shared web experiences
      </p>
    </div>
  );
}
