import React from "react";
import { Footnote } from "./Footnote";

export function ClockEmbed() {
  return (
    <div id="clockEmbed">
      <a href="https://clock.spencer.place" className="button">
        <Footnote
          caption="an embed of the clock that I made that changes colors with the time such that every minute has a unique color."
          asChild={true}
        >
          <iframe src="https://clock.spencer.place"></iframe>
        </Footnote>
      </a>
    </div>
  );
}
