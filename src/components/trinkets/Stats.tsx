import React, { useEffect, useState } from "react";

// Define types for the cursor system
interface CursorSystem {
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
  const [visitors, setVisitors] = useState(0);
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
      setVisitors(cursors.count);
      setCursorColor(cursors.color);

      // Handle cursor updates
      const handleCursorUpdate = (data: { count: number }) => {
        setVisitors(data.count);
      };

      const handleColorUpdate = (color: string) => {
        setCursorColor(color);
      };

      // Subscribe to events
      //   cursors.on("count", handleCursorUpdate);
      //   cursors.on("color", handleColorUpdate);

      // Return cleanup function
      return () => {
        // cursors.off("count", handleCursorUpdate);
        // cursors.off("color", handleColorUpdate);
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

  return (
    <div
      className="trinket bg-[var(--color-background-teal)] mono h-full text-sm p-2"
      style={{ border: "double", gap: 0 }}
    >
      <span>
        ppl: <span>{visitors}</span>
        {/* <div id="cursor-list"></div> */}
      </span>
      <span>
        you:{" "}
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            display: "inline-block",
            backgroundColor: cursorColor,
          }}
        />
      </span>
      <span>
        time: <span>{time.toFixed(1)}m</span>
      </span>
      <span>
        energy: <span>{deviceBattery}%</span>
      </span>
      {/* 
      - location & weather emoji?
      - phone battery percentage
      */}
    </div>
  );
}
