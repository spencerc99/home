import React, { useEffect, useMemo, useState } from "react";
import { CursorPopoverContent } from "./CursorPopover";
import { Popover } from "../Popover";
import { trackVisit } from "../../utils/roles";

// Define types for the cursor system
interface CursorSystem {
  allColors: string[];
  count: number;
  name: string;
  color: string;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback: (data: any) => void) => void;
}

// Extend the Window interface
declare global {
  interface Window {
    cursors?: CursorSystem;
  }
}

export function Stats() {
  const [visitors, setVisitors] = useState<Array<string>>([]);
  // counts up every millisecond
  const startTime = new Date().getTime();
  //  in seconds rounded to 1 place
  const [time, setTime] = useState(0);
  const [deviceBattery, setDeviceBattery] = useState(100);

  useEffect(() => {
    // Track visit on component mount
    trackVisit();

    let checkInterval: number | null = null;
    let isSubscribed = false;

    // Function to set up cursor listeners
    const setupCursorListeners = (cursors: CursorSystem) => {
      if (isSubscribed) return; // Prevent double subscription
      isSubscribed = true;

      // Set initial values
      setVisitors(cursors.allColors);

      // Handle cursor updates
      const handleCursorUpdate = (colors: string[]) => {
        setVisitors(colors);
      };

      // Subscribe to events
      cursors.on("allColors", handleCursorUpdate);

      // Return cleanup function
      return () => {
        cursors.off("allColors", handleCursorUpdate);
        isSubscribed = false;
      };
    };

    // Check for cursors initialization
    const checkForCursors = () => {
      const cursors = window?.cursors;
      if (cursors) {
        if (checkInterval) {
          window.clearInterval(checkInterval);
          checkInterval = null;
        }
        cleanup = setupCursorListeners(cursors);
      }
    };

    // Start polling for cursors
    checkInterval = window.setInterval(checkForCursors, 100);
    let cleanup: (() => void) | undefined;

    // Initial check
    checkForCursors();

    const timeInterval = setInterval(() => {
      setTime((new Date().getTime() - startTime) / 1000 / 60);
    }, 66);

    if (navigator.getBattery) {
      navigator.getBattery().then((battery) => {
        setDeviceBattery(battery.level * 100);
        battery.addEventListener("levelchange", () => {
          navigator.getBattery().then((battery) => {
            setDeviceBattery(battery.level * 100);
          });
        });
      });
    }

    // Cleanup function
    return () => {
      if (checkInterval) {
        window.clearInterval(checkInterval);
      }
      if (cleanup) {
        cleanup();
      }
      if (timeInterval) {
        window.clearInterval(timeInterval);
      }
    };
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
          style={{
            letterSpacing: "-0.05em",
          }}
        >
          ({visitors.length})
        </span>
        :{" "}
        <div className="flex gap-[2px] inline-flex">
          {visitors.map((color, index) => {
            const hasDuplicate = visitors.filter((c) => c === color).length > 1;
            const key = hasDuplicate ? `${color}-${index}` : color;
            return (
              <CursorColor key={key} color={color} isFirst={index === 0} />
            );
          })}
        </div>
      </span>
      <span>
        time: <span>{time.toFixed(1)}m</span>
      </span>
      <span>
        energy: <span>{batteryDisplay}%</span>
      </span>
      {/* movement: # of pixels moved */}
      {/* # of clicks */}
      {/* # of typed */}
      {/* 
      - location & weather emoji & time for "currently"?
      */}
      {/* show device type */}
      {/* device screen size */}
    </div>
  );
}

const CursorColor = ({
  color,
  isFirst = false,
}: {
  color: string;
  isFirst?: boolean;
}) => {
  const normalizeColorToHex = (colorStr: string): string => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return colorStr;

    ctx.fillStyle = colorStr;
    return ctx.fillStyle;
  };

  const [internalColor, setInternalColor] = useState(() =>
    normalizeColorToHex(color)
  );
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const dotRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInternalColor(normalizeColorToHex(color));
  }, [color]);

  useEffect(() => {
    if (!showPopover) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dotRef.current && !dotRef.current.contains(event.target as Node)) {
        const popoverElement = document.querySelector(".popover-content");
        if (popoverElement && !popoverElement.contains(event.target as Node)) {
          setShowPopover(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPopover]);

  const handleClick = (e: React.MouseEvent) => {
    if (!isFirst) return;

    e.stopPropagation();
    const rect = dotRef.current?.getBoundingClientRect();
    if (rect) {
      setPopoverPosition({
        x: rect.left,
        y: rect.top - 4,
      });
      setShowPopover(!showPopover);
    }
  };

  if (!isFirst) {
    return (
      <div className="relative inline-block">
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            display: "inline-block",
            backgroundColor: color,
          }}
        />
      </div>
    );
  }

  return (
    <Popover
      trigger="manual"
      isOpen={showPopover}
      onOpenChange={setShowPopover}
      position="fixed"
      fixedPosition={popoverPosition}
      showCloseButton={true}
    >
      <div className="relative inline-block" ref={dotRef}>
        <span className="absolute -top-[2px] left-1/2 -translate-x-1/2 text-[8px] leading-none">
          you
        </span>
        <div
          onClick={handleClick}
          className="cursor-pointer"
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            display: "inline-block",
            backgroundColor: color,
          }}
        />
      </div>
      <CursorPopoverContent color={color} />
    </Popover>
  );
};
