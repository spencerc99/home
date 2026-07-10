// ABOUTME: Sidebar identity block showing the clock embed, Spencer's name, and live timezone/weather.
// ABOUTME: On mobile, tapping the name toggles the sidebar's expanded drawer revealing desktop-only content.

import React, { useEffect, useState } from "react";
import { ClockEmbed, CLOCK_CAPTION } from "../ClockEmbed";

interface StatusData {
  timezone?: string;
  timezoneShort?: string;
  location?: string;
}

export function StatusHeader() {
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [expanded, setExpanded] = useState(false);

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

  // The expanded drawer lives on #sidebar (Astro-owned), so sync via class.
  // Only has a visual effect on mobile — the CSS is scoped to the xsmall breakpoint.
  useEffect(() => {
    const sidebar = document.getElementById("sidebar");
    sidebar?.classList.toggle("expanded", expanded);
    return () => sidebar?.classList.remove("expanded");
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!(e.target as Element)?.closest?.("#sidebar")) {
        setExpanded(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  const toggleExpanded = () => setExpanded((prev) => !prev);

  const timezone = statusData?.timezone || "";
  const timezoneShort = statusData?.timezoneShort || "";
  const weatherEmoji = statusData?.location?.split(" ").slice(-1)[0] || "";

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
        className="sidebarClock"
        data-astro-transition-persist="clock-embed"
      >
        <ClockEmbed size={100} timezone={timezone} />
        <span className="sidebarClockCaption">{CLOCK_CAPTION}</span>
      </div>
      <div
        className="avatar"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls="sidebar"
        onClick={toggleExpanded}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleExpanded();
          }
        }}
      >
        <span className="avatarLink">spencer chang</span>{" "}
        <span className="avatarDescription">
          {timezoneShort} {weatherEmoji}
        </span>
        <span className="avatarExpandIcon" aria-hidden="true">
          ▾
        </span>
      </div>
    </>
  );
}
