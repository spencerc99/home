import React, { useEffect, useState } from "react";
import { ClockEmbed } from "../ClockEmbed";

interface StatusData {
  timezone?: string;
  timezoneShort?: string;
  location?: string;
}

export function StatusHeader() {
  const [statusData, setStatusData] = useState<StatusData | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch("https://status.spencer.place/metadata");
        const data = await response.json();
        setStatusData(data);
      } catch (err) {
        console.error("Failed to fetch status:", err);
      }
    }

    fetchStatus();
  }, []);

  const timezone = statusData?.timezone || "";
  const timezoneShort = statusData?.timezoneShort || "";
  const weatherEmoji = statusData?.location?.split(" ").slice(-1)[0] || "";

  return (
    <>
      <div
        style={{ display: "flex", justifyContent: "center" }}
        className="hide-mobile"
        data-astro-transition-persist="clock-embed"
      >
        <ClockEmbed size={100} timezone={timezone} />
      </div>
      <div className="avatar">
        <span className="avatarLink">spencer chang</span>{" "}
        <span className="avatarDescription">
          {timezoneShort} {weatherEmoji}
        </span>
      </div>
    </>
  );
}
