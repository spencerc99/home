// borrow pattern from pluriverse https://github.com/verses-xyz/pluriverse/blob/20fd754b0be88b94fafe6ed20db9ee48f0423978/browser/src/components/Footnote.tsx#L6
// https://github.com/verses-xyz/pluriverse/blob/20fd754b0be88b94fafe6ed20db9ee48f0423978/browser/src/components/EssayBody.css#L2

import { PropsWithChildren, useRef, useState } from "react";
import "./Footnote.scss";
import { motion, AnimatePresence } from "framer-motion";
import React from "react";

// have a toggle somewhere that allows you to toggle all "annotations" on
interface FootnoteProps {
  imageSrc?: string;
  url?: string;
  hoverImg?: string;
  caption?: string; // Added caption attribute
  isHtmlCaption?: boolean;
}

export function Footnote({
  imageSrc,
  url,
  hoverImg: inputHoverImg,
  caption,
  isHtmlCaption,
  children,
}: PropsWithChildren<FootnoteProps>) {
  const [isHovered, setIsHovered] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hoverImg = inputHoverImg || imageSrc;

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsHovered(true);
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 300); // 300ms delay
  };

  const handleClick = () => setIsHovered(!isHovered);
  const showHoverInfo = hoverImg || caption;
  const captionNode = !caption ? null : isHtmlCaption ? (
    <p
      className="caption footnote-caption"
      dangerouslySetInnerHTML={{ __html: caption }}
    ></p>
  ) : (
    <p className="caption footnote-caption">{caption}</p>
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
          className="footnote"
          //   onMouseEnter={handleMouseEnter}
          //   onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        >
          {content}
        </a>
      ) : (
        <span
          className="footnote"
          //   onMouseEnter={handleMouseEnter}
          //   onMouseLeave={handleMouseLeave}
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
