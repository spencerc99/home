import React from "react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
const { PropsWithChildren } = React;

export function MasonryLayout({
  className,
  columnsCountBreakPoints,
  columnsCount,
  gutter,
  children,
}: typeof PropsWithChildren<{
  className?: string;
  columnsCountBreakPoints?: { [key: number]: number };
  columnsCount?: number;
  gutter?: string;
}>) {
  return columnsCountBreakPoints ? (
    <ResponsiveMasonry columnsCountBreakPoints={{}}>
      <Masonry
        gutter={gutter}
        columnsCount={columnsCount}
        className={className}
      >
        {children}
      </Masonry>
    </ResponsiveMasonry>
  ) : (
    <Masonry gutter={gutter} columnsCount={columnsCount} className={className}>
      {children}
    </Masonry>
  );
}
