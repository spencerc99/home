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
      middleText="SPENCERS.FITS"
      transitionInterval={7000}
      allLink="/fits"
    />
  );
}
