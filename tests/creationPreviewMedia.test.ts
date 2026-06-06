// ABOUTME: Tests creation summary media choices for progressive video previews.
// ABOUTME: Keeps preview fallback behavior independent from React rendering.
import { describe, expect, test } from "bun:test";
import { getProgressivePreviewImage } from "../src/utils/creationPreviewMedia";

describe("getProgressivePreviewImage", () => {
  test("uses the selected image while a movie preview loads", () => {
    expect(
      getProgressivePreviewImage({
        media: ["https://example.com/cover.jpg"],
        mediaMetadata: ["image"],
        assetPreviewIdx: 0,
      }),
    ).toBe("https://example.com/cover.jpg");
  });

  test("uses the first image when the selected media preview is a video", () => {
    expect(
      getProgressivePreviewImage({
        media: [
          "/creation-videos/preview.mp4",
          "https://example.com/still.jpg",
        ],
        mediaMetadata: ["video", "image"],
        assetPreviewIdx: 0,
      }),
    ).toBe("https://example.com/still.jpg");
  });

  test("does not use a video URL as the selected image when metadata is missing", () => {
    expect(
      getProgressivePreviewImage({
        media: [
          "/creation-videos/preview.mp4",
          "https://example.com/still.jpg",
        ],
        mediaMetadata: [],
        assetPreviewIdx: 0,
      }),
    ).toBe("https://example.com/still.jpg");
  });

  test("returns null when there is no image available", () => {
    expect(
      getProgressivePreviewImage({
        media: ["/creation-videos/preview.mp4"],
        mediaMetadata: ["video"],
        assetPreviewIdx: 0,
      }),
    ).toBeNull();
  });
});
