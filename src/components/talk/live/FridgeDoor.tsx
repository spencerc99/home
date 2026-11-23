import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { FRIDGE_WORDS, startingSpot, tilt } from "./fridge";
import type { Fridge } from "./talkRoom";
import "./fridge.scss";

// The shared fridge door, drawn the same on the big screen and on a phone:
// sizes are fractions of the door's width, so a word sits in the same place
// on both. A word's underline is the colour of whoever moved it last.

type Spot = { x: number; y: number };

export function FridgeDoor({
  words,
  onMove,
  myColor,
}: {
  words: Fridge;
  // Given on a phone: called while a word is dragged and when it is let go.
  onMove?: (index: number, spot: Spot, done: boolean) => void;
  myColor?: string;
}) {
  const door = useRef<HTMLDivElement>(null);
  // The word under this finger, drawn where the finger is rather than where
  // the room last heard it was.
  const [held, setHeld] = useState<{ index: number; spot: Spot; grab: Spot } | null>(null);

  const spotOf = (event: ReactPointerEvent): Spot => {
    const r = door.current!.getBoundingClientRect();
    return { x: (event.clientX - r.left) / r.width, y: (event.clientY - r.top) / r.height };
  };
  const clampSpot = ({ x, y }: Spot): Spot => ({
    x: Math.min(0.98, Math.max(0, x)),
    y: Math.min(0.98, Math.max(0, y)),
  });

  return (
    <div className="talk-fridge" ref={door}>
      {FRIDGE_WORDS.map((word, index) => {
        const saved = words[String(index)];
        const spot = held?.index === index ? held.spot : saved ?? startingSpot(index);
        const color = held?.index === index ? myColor : saved?.color;
        return (
          <span
            key={index}
            className="talk-fridge__word"
            data-held={held?.index === index || undefined}
            style={{
              left: `${spot.x * 100}%`,
              top: `${spot.y * 100}%`,
              transform: `rotate(${tilt(index)}deg)`,
              ["--mover" as string]: color ?? "transparent",
            }}
            onPointerDown={
              onMove &&
              ((event) => {
                try {
                  event.currentTarget.setPointerCapture(event.pointerId);
                } catch (error) {
                  console.warn("[talk] pointer capture refused", error);
                }
                const at = spotOf(event);
                setHeld({ index, spot, grab: { x: at.x - spot.x, y: at.y - spot.y } });
              })
            }
            onPointerMove={
              onMove &&
              ((event) => {
                if (held?.index !== index) return;
                const at = spotOf(event);
                const next = clampSpot({ x: at.x - held.grab.x, y: at.y - held.grab.y });
                setHeld({ ...held, spot: next });
                onMove(index, next, false);
              })
            }
            onPointerUp={
              onMove &&
              (() => {
                if (held?.index !== index) return;
                onMove(index, held.spot, true);
                setHeld(null);
              })
            }
            onPointerCancel={
              onMove &&
              (() => {
                if (held?.index !== index) return;
                onMove(index, held.spot, true);
                setHeld(null);
              })
            }
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}
