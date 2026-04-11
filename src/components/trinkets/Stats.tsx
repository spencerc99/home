// ABOUTME: Sidebar trinket showing active visitors, session time, and battery.
// ABOUTME: Uses playhtml presence API for cursor data with hover tooltips and click navigation.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playhtml, useCursorPresences } from "@playhtml/react";
import { CursorPopoverContent } from "./CursorPopover";
import { Popover } from "../Popover";
import { trackVisit } from "../../utils/roles";
import { isSpencer, SPENCER_COLOR } from "../../utils/presence";

interface PresenceEntry {
  stableId: string;
  color: string;
  name?: string;
  page?: string;
  active: boolean;
  isMe: boolean;
  isSpencer: boolean;
}

function usePresenceEntries(): PresenceEntry[] {
  const cursorPresences = useCursorPresences();
  const [presenceData, setPresenceData] = useState<
    Map<string, { page?: string; active?: boolean }>
  >(new Map());

  useEffect(() => {
    const unsub = playhtml.presence.onPresenceChange(
      "active",
      (presences) => {
        const data = new Map<string, { page?: string; active?: boolean }>();
        for (const [stableId, view] of presences) {
          data.set(stableId, {
            page: (view as any).page,
            active: (view as any).active,
          });
        }
        setPresenceData(data);
      },
    );
    return unsub;
  }, []);

  return useMemo(() => {
    const entries: PresenceEntry[] = [];
    for (const [stableId, presence] of cursorPresences) {
      const color =
        presence.playerIdentity?.playerStyle.colorPalette[0] ?? "#888";
      const data = presenceData.get(stableId);
      const myIdentity = playhtml.presence.getMyIdentity();
      const isMe = presence.playerIdentity?.publicKey === myIdentity?.publicKey;

      entries.push({
        stableId,
        color,
        name: presence.playerIdentity?.name,
        page: data?.page,
        active: data?.active ?? true,
        isMe,
        isSpencer: isSpencer(presence),
      });
    }

    // Sort: self first, then by page path
    entries.sort((a, b) => {
      if (a.isMe) return -1;
      if (b.isMe) return 1;
      return (a.page ?? "").localeCompare(b.page ?? "");
    });

    return entries;
  }, [cursorPresences, presenceData]);
}

export function Stats() {
  const entries = usePresenceEntries();
  const startTime = new Date().getTime();
  const [time, setTime] = useState(0);
  const [deviceBattery, setDeviceBattery] = useState(100);

  useEffect(() => {
    trackVisit();

    const timeInterval = setInterval(() => {
      setTime((new Date().getTime() - startTime) / 1000 / 60);
    }, 66);

    if (navigator.getBattery) {
      navigator.getBattery().then((battery) => {
        setDeviceBattery(battery.level * 100);
        battery.addEventListener("levelchange", () => {
          navigator.getBattery().then((b) => {
            setDeviceBattery(b.level * 100);
          });
        });
      });
    }

    return () => clearInterval(timeInterval);
  }, []);

  const batteryDisplay = useMemo(() => {
    return deviceBattery > 0 ? Math.round(deviceBattery) : "unknown";
  }, [deviceBattery]);

  return (
    <div
      className="trinket bg-[var(--color-background-teal)] mono text-sm p-2 overflow-hidden"
      style={{ border: "double", gap: 0 }}
    >
      <span>
        ppl
        <span
          className="text-xs"
          style={{ letterSpacing: "-0.05em" }}
        >
          ({entries.length})
        </span>
        :{" "}
        {entries.map((entry, index) => (
          <CursorDot key={entry.stableId} entry={entry} isFirst={index === 0} />
        ))}
      </span>
      <span>
        time: <span>{time.toFixed(1)}m</span>
      </span>
      <span>
        energy: <span>{batteryDisplay}%</span>
      </span>
    </div>
  );
}

function CursorDot({
  entry,
  isFirst,
}: {
  entry: PresenceEntry;
  isFirst: boolean;
}) {
  const dotStyle: React.CSSProperties = {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    display: "inline-block",
    backgroundColor: entry.color,
    opacity: entry.active ? 1 : 0.4,
    transition: "opacity 0.3s ease",
    cursor: "pointer",
    ...(entry.isSpencer
      ? { boxShadow: `0 0 4px ${SPENCER_COLOR}` }
      : {}),
  };

  const [showSelfPopover, setShowSelfPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const selfDotRef = useRef<HTMLSpanElement>(null);

  const handleSelfClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = selfDotRef.current?.getBoundingClientRect();
    if (rect) {
      setPopoverPosition({ x: rect.left, y: rect.top - 4 });
      setShowSelfPopover((prev) => !prev);
    }
  }, []);

  if (entry.isMe) {
    return (
      <Popover
        trigger="manual"
        isOpen={showSelfPopover}
        onOpenChange={setShowSelfPopover}
        position="fixed"
        fixedPosition={popoverPosition}
        showCloseButton
      >
        <span
          className="relative inline-block mr-[2px]"
          ref={selfDotRef}
          style={{ height: "8px" }}
        >
          <span className="absolute -top-[2px] left-1/2 -translate-x-1/2 text-[8px] leading-none">
            you
          </span>
          <span style={dotStyle} onClick={handleSelfClick} />
        </span>
        <CursorPopoverContent color={entry.color} />
      </Popover>
    );
  }

  return (
    <Popover trigger="hover" hoverDelay={200} position="top">
      <span
        style={dotStyle}
        onClick={() => {
          if (entry.page) {
            window.location.href = entry.page;
          }
        }}
      />
      <div className="bg-[var(--color-background-teal)] mono text-xs p-2">
        <div className="flex items-center gap-1">
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: entry.color,
              display: "inline-block",
              ...(entry.isSpencer
                ? { boxShadow: `0 0 3px ${SPENCER_COLOR}` }
                : {}),
            }}
          />
          {entry.name && <span>{entry.name}</span>}
        </div>
        {entry.page && (
          <div style={{ opacity: 0.6, marginTop: "2px" }}>{entry.page}</div>
        )}
      </div>
    </Popover>
  );
}
