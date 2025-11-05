// ABOUTME: Popover content for editing cursor color and name (for regulars)
// ABOUTME: Displays on click of user's own cursor color in Stats trinket

import React, { useEffect, useState } from "react";
import { isRegular } from "../../utils/roles";

interface CursorPopoverContentProps {
  color: string;
}

declare global {
  interface Window {
    cursors?: {
      color: string;
      name?: string;
      allColors: string[];
      on: (event: string, callback: (data: any) => void) => void;
      off: (event: string, callback: (data: any) => void) => void;
    };
  }
}

export function CursorPopoverContent({ color }: CursorPopoverContentProps) {
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
  const [userIsRegular, setUserIsRegular] = useState(false);

  useEffect(() => {
    setUserIsRegular(isRegular());
  }, []);

  useEffect(() => {
    setInternalColor(normalizeColorToHex(color));
  }, [color]);

  const handleColorChange = (newColor: string) => {
    setInternalColor(newColor);
    if (window.cursors) {
      window.cursors.color = newColor;
    }
  };

  const handleNameChange = (newName: string) => {
    if (!userIsRegular) return;
    if (window.cursors) {
      window.cursors.name = newName;
    }
  };

  return (
    <div className="bg-[var(--color-background-teal)] mono text-sm p-3 pr-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <label htmlFor="color-picker" className="text-xs">
            cursor color:
          </label>
          <input
            id="color-picker"
            type="color"
            value={internalColor}
            onChange={(e) => handleColorChange(e.target.value)}
            className="cursor-pointer"
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "500px",
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              id="name-input"
              type="text"
              value={window.cursors?.name || ""}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="your name..."
              disabled={!userIsRegular}
              className={`px-1 py-0.5 text-xs border border-black dark:border-white ${
                userIsRegular
                  ? "bg-white dark:bg-gray-800"
                  : "bg-gray-200 dark:bg-gray-700 opacity-50 cursor-not-allowed"
              }`}
              style={{
                fontFamily: "inherit",
                maxWidth: "160px",
              }}
              maxLength={20}
            />
            {!userIsRegular && (
              <span
                className="absolute text-[9px] whitespace-nowrap pointer-events-none"
                style={{
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%) rotate(-2deg)",
                  color: "var(--color-text-color)",
                  opacity: 0.8,
                  textShadow:
                    "0 0 2px var(--color-background-teal), 0 0 4px var(--color-background-teal)",
                }}
              >
                for regulars only
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
