import React, { useEffect, useMemo, useState } from "react";

// Define types for the cursor system
interface CursorSystem {
  allColors: string[];
  count: number;
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
  const [cursorColor, setCursorColor] = useState("#000000");
  // counts up every millisecond
  const startTime = new Date().getTime();
  //  in seconds rounded to 1 place
  const [time, setTime] = useState(0);
  const [deviceBattery, setDeviceBattery] = useState(100);

  useEffect(() => {
    let checkInterval: number | null = null;
    let isSubscribed = false;

    // Function to set up cursor listeners
    const setupCursorListeners = (cursors: CursorSystem) => {
      if (isSubscribed) return; // Prevent double subscription
      isSubscribed = true;

      // Set initial values
      setVisitors(cursors.allColors);
      setCursorColor(cursors.color);

      // Handle cursor updates
      const handleCursorUpdate = (colors: string[]) => {
        setVisitors(colors);
      };

      const handleColorUpdate = (color: string) => {
        setCursorColor(color);
      };

      // Subscribe to events
      cursors.on("allColors", handleCursorUpdate);
      cursors.on("color", handleColorUpdate);

      // Return cleanup function
      return () => {
        cursors.off("allColors", handleCursorUpdate);
        cursors.off("color", handleColorUpdate);
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
          {/* TODO: key isn't unique, with duplicate colors */}
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
  const [internalColor, setInternalColor] = useState(color);
  return (
    <div className="relative inline-block">
      {isFirst && (
        <span className="absolute -top-[2px] left-1/2 -translate-x-1/2 text-[8px] leading-none">
          you
        </span>
      )}
      {isFirst ? (
        <div
          className="relative"
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            display: "inline-block",
            backgroundColor: color,
          }}
        >
          {/* // TODO: these aren't working for changing the color, something wrong with the on listeners */}
          <input
            type="color"
            value={color}
            // trigger when user closes the color picker
            onChange={(e) => {
              setInternalColor(e.target.value);
            }}
            onBlur={() => {
              if (window.cursors) {
                if (internalColor !== color) {
                  window.cursors.color = internalColor;
                }
              }
            }}
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              display: "inline-block",
              opacity: 0,
              backgroundColor: color,
              position: "absolute",
              top: 0,
              left: 0,
            }}
          />
        </div>
      ) : (
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            display: "inline-block",
            backgroundColor: color,
          }}
        />
      )}
    </div>
  );
};
