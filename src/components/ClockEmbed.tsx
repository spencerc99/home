import React from "react";

export function ClockEmbed() {
  return (
    <div id="clockEmbed">
      <a href="https://clock.spencer.place" className="button">
        <iframe
          src="https://clock.spencer.place"
          title="an embed of the clock that spencer made that changes colors with the time such that every minute has a unique color."
        ></iframe>
      </a>
    </div>
  );
}
