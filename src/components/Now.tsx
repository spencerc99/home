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
        - Designing <a href="/creation/playhtml">playhtml</a>, open-source
        infrastructure for shared web experiences
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
    </div>
  );
}
