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
          Updated 01-29-25
        </span>
      </div>
      <p>
        - Creating <a href="/creation/computing-shrines">computing shrines</a>{" "}
        in my neighborhood
      </p>
      <p>
        - Released <a href="https://gather.directory/">Gather</a>, the
        local-first app for archiving & curating multimedia collections and
        client for Are.na, officially on the{" "}
        <a href="https://apps.apple.com/us/app/gather-handheld-curiosity/id6468843059">
          App Store
        </a>{" "}
        &{" "}
        <a href="https://play.google.com/store/apps/details?id=net.tiny_inter.gather&hl=en_US">
          Play Store
        </a>
        .
      </p>
      <p>Custom commissions for ████████ ███ ██████ (coming soon...)</p>
      <p>- Reading Isamu Noguchi's Autobiography</p>
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
