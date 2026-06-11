// ABOUTME: Verifies image zoom helpers keep navigation on visible media.
// ABOUTME: Covers detail pages where duplicated hero media is hidden in flow galleries.
import { expect, test } from "bun:test";
import { getVisibleZoomImages } from "../src/utils/imageZoom";

function imageWithSize(width: number, height: number) {
  return {
    getBoundingClientRect() {
      return { width, height };
    },
  };
}

test("getVisibleZoomImages excludes images without layout boxes", () => {
  const hiddenImage = imageWithSize(0, 0);
  const visibleImage = imageWithSize(320, 240);

  expect(getVisibleZoomImages([hiddenImage, visibleImage])).toEqual([
    visibleImage,
  ]);
});
