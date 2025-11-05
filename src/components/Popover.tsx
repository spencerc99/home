// ABOUTME: Generic popover component with click and hover support
// ABOUTME: Provides flexible positioning and animation for popup content

import React, { useRef, useState, type PropsWithChildren } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./Popover.scss";

interface PopoverProps {
  trigger?: "click" | "hover" | "manual";
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  position?: "top" | "bottom" | "left" | "right" | "fixed";
  fixedPosition?: { x: number; y: number };
  hoverDelay?: number;
  className?: string;
  popoverClassName?: string;
  showCloseButton?: boolean;
}

export function Popover({
  trigger = "click",
  isOpen: controlledIsOpen,
  onOpenChange,
  position = "bottom",
  fixedPosition,
  hoverDelay = 300,
  className,
  popoverClassName,
  showCloseButton = false,
  children,
}: PropsWithChildren<PopoverProps>) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const setIsOpen = (open: boolean) => {
    if (controlledIsOpen === undefined) {
      setInternalIsOpen(open);
    }
    onOpenChange?.(open);
  };

  const handleMouseEnter = () => {
    if (trigger !== "hover") return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsHovering(true);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, hoverDelay);
  };

  const handleMouseLeave = () => {
    if (trigger !== "hover") return;

    setIsHovering(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, hoverDelay);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (trigger !== "click") return;
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const getPositionClass = () => {
    if (position === "fixed") return "popover-fixed";
    return `popover-${position}`;
  };

  const getFixedStyle = (): React.CSSProperties => {
    if (position === "fixed" && fixedPosition) {
      return {
        position: "fixed",
        left: `${fixedPosition.x}px`,
        bottom: `calc(100vh - ${fixedPosition.y}px)`,
      };
    }
    return {};
  };

  const childrenArray = React.Children.toArray(children);
  const triggerElement = childrenArray[0];
  const popoverContent = childrenArray[1];

  return (
    <>
      {triggerElement && (
        <div
          className={`popover-trigger ${className || ""}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        >
          {triggerElement}
        </div>
      )}
      <AnimatePresence>
        {isOpen && popoverContent && (
          <motion.div
            className={`popover-content ${getPositionClass()} ${
              popoverClassName || ""
            }`}
            style={getFixedStyle()}
            initial={{ opacity: 0, y: position === "fixed" ? 0 : -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: position === "fixed" ? 0 : -10 }}
            transition={{ duration: 0.2 }}
          >
            {showCloseButton && (
              <button
                className="popover-close"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                aria-label="Close"
              >
                &times;
              </button>
            )}
            {popoverContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
