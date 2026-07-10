// ABOUTME: Category stamp/chip shown over creation previews and in list rows.
// ABOUTME: Optionally acts as a filter toggle when onCategoryClick is provided.

import React from "react";
import { stringToColor } from "../utils";

interface Props {
  parentCategory?: string;
  onCategoryClick?: (category: string) => void;
}

export function CategoryStamp({ parentCategory, onCategoryClick }: Props) {
  // Category stamp color is derived from the category name (not the title) so
  // every creation in the same category shares the same stamp color. Kept
  // low-saturation so categories stay distinguishable without shouting.
  const categoryStampStyle = parentCategory
    ? ({
        "--category-stamp-color": stringToColor(parentCategory, {
          saturation: 45,
          lightness: 55,
        }),
      } as React.CSSProperties)
    : undefined;

  if (!parentCategory) {
    return null;
  }

  if (onCategoryClick) {
    return (
      <span
        className="categoryStamp interactive"
        style={categoryStampStyle}
        role="button"
        tabIndex={0}
        title={`Filter by ${parentCategory}`}
        onClick={(e) => {
          // Stamp may live inside a cover link, so suppress navigation.
          e.preventDefault();
          e.stopPropagation();
          onCategoryClick(parentCategory);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            onCategoryClick(parentCategory);
          }
        }}
      >
        {parentCategory}
      </span>
    );
  }

  return (
    <span className="categoryStamp" style={categoryStampStyle}>
      {parentCategory}
    </span>
  );
}
