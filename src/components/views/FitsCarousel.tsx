import React from "react";
import { Carousel } from "../Carousel";
import { FitCard } from "./Fits";
import type { Fit } from "./Fits";

interface FitsCarouselProps {
  fits: Fit[];
}

export function FitsCarousel({ fits }: FitsCarouselProps) {
  return (
    <Carousel
      items={fits}
      renderItem={(fit) => <FitCard fit={fit} variant="horizontal" />}
      middleText="SPENCER.FIT.v1"
      transitionInterval={7000}
    />
  );
}
