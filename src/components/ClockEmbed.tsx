import React from "react";
import { Footnote } from "./Footnote";

export function ClockEmbed({ size = 200 }) {
  return (
    <div id="clockEmbed">
      <a href="https://clock.spencer.place" className="button">
        <Footnote
          caption="an embed of the clock that I made that changes colors with the time such that every minute has a unique color."
          asChild={true}
        >
          <iframe
            src="https://clock.spencer.place"
            style={{ maxWidth: size, maxHeight: size }}
            data-astro-transition-persist="clock-iframe"
          ></iframe>
        </Footnote>
      </a>
    </div>
  );
}
