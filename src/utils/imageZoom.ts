// ABOUTME: Provides page-level image zoom behavior across Astro React islands.
// ABOUTME: Keeps zoom navigation focused on images that have visible layout boxes.
import mediumZoom, { type Zoom, type ZoomOptions } from "medium-zoom";

type ZoomImageElement = {
  getBoundingClientRect(): Pick<DOMRect, "width" | "height">;
};

let pageZoom: Zoom | null = null;

export function getVisibleZoomImages<T extends ZoomImageElement>(
  images: T[]
): T[] {
  return images.filter((image) => {
    const rect = image.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

export function getPageZoom(options?: ZoomOptions): Zoom {
  if (pageZoom === null) {
    pageZoom = mediumZoom(options);
    document.addEventListener("keydown", handleZoomKey, false);
  } else if (options) {
    pageZoom.update(options);
  }

  return pageZoom;
}

function handleZoomKey(e: KeyboardEvent) {
  const zoom = pageZoom;
  if (!zoom) return;

  const images = getVisibleZoomImages(zoom.getImages());
  const currentImageIndex = images.indexOf(zoom.getZoomedImage());
  const key = e.code || e.key;
  let target: HTMLElement;

  if (images.length <= 1 || currentImageIndex === -1) {
    return;
  }

  switch (key) {
    case "ArrowLeft":
      e.preventDefault();
      target =
        currentImageIndex - 1 < 0
          ? images[images.length - 1]
          : images[currentImageIndex - 1];
      openZoomTarget(zoom, target);
      break;
    case "ArrowRight":
      e.preventDefault();
      target =
        currentImageIndex + 1 >= images.length
          ? images[0]
          : images[currentImageIndex + 1];
      openZoomTarget(zoom, target);
      break;
    default:
      break;
  }
}

function openZoomTarget(zoom: Zoom, target: HTMLElement) {
  zoom.close().then(() => {
    target.scrollIntoView({ block: "center", inline: "center" });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        zoom.open({
          target: target,
        });
      });
    });
  });
}
