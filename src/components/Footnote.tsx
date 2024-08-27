// borrow pattern from pluriverse https://github.com/verses-xyz/pluriverse/blob/20fd754b0be88b94fafe6ed20db9ee48f0423978/browser/src/components/Footnote.tsx#L6
// https://github.com/verses-xyz/pluriverse/blob/20fd754b0be88b94fafe6ed20db9ee48f0423978/browser/src/components/EssayBody.css#L2

import { PropsWithChildren, useRef, useState } from "react";
import classNames from "classnames";
import "./Footnote.scss";
import { motion, AnimatePresence } from "framer-motion";
import React from "react";
import Markdown from "react-markdown";

// have a toggle somewhere that allows you to toggle all "annotations" on
interface FootnoteProps {
  imageSrc?: string;
  url?: string;
  hoverImg?: string;
  caption?: string; // Added caption attribute
  isHtmlCaption?: boolean;
  asChild?: boolean; // ignores the default footnote styling
}

// TODO: for mobile needs to calculate where it is on screen so it doesn't overflow
export function Footnote({
  imageSrc,
  url,
  hoverImg: inputHoverImg,
  caption,
  isHtmlCaption,
  children,
  asChild = false,
}: PropsWithChildren<FootnoteProps>) {
  const [isHovered, setIsHovered] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hoverImg = inputHoverImg || imageSrc;

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsHovering(true);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 300); // 300ms delay before showing hover content
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 300); // 300ms delay before hiding hover content
  };

  const handleClick = () => setIsHovered(!isHovered);
  const showHoverInfo = hoverImg || caption;
  const captionNode = !caption ? null : isHtmlCaption ? (
    <p
      className="caption footnote-caption"
      dangerouslySetInnerHTML={{ __html: caption }}
    ></p>
  ) : (
    <Markdown className="footnote-md">{caption}</Markdown>
  );

  const content = imageSrc ? (
    <img src={imageSrc} className="footnote-image" />
  ) : (
    children || "*"
  );

  return (
    <div
      className="footnote-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {url ? (
        <a
          href={url}
          className={classNames({
            footnote: !asChild,
            hasHover: !asChild && showHoverInfo,
          })}
          onClick={handleClick}
        >
          {content}
        </a>
      ) : (
        <span
          className={classNames({
            footnote: !asChild,
            hasHover: !asChild && showHoverInfo,
          })}
          onClick={handleClick}
        >
          {content}
        </span>
      )}
      <AnimatePresence>
        {isHovered && showHoverInfo && (
          <motion.div
            className="hover-node"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {hoverImg && (
              <img
                src={hoverImg}
                alt={caption}
                className="footnote-hover-image"
              />
            )}
            {captionNode}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
