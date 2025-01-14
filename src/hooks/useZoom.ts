import mediumZoom, { type ZoomOptions, type Zoom } from "medium-zoom";
import { useCallback, useRef, type RefCallback } from "react";
import { useContext } from "react";
import { ZoomContext } from "../context/ZoomContext";

// TODO: this is so much weird overhead + needs the context which is super annoying. should be easier to do this without needing the context to understand all the zoom images on the same page.
// Also it should work with videos..
// maybe https://www.lightgalleryjs.com/docs/react-image-video-gallery/?
export function useZoom({ options }: { options?: ZoomOptions }) {
  const { getZoom: getZoomInit } = useContext(ZoomContext);

  const getZoom = useCallback(() => {
    const zoom = mediumZoom(options);
    return zoom;
    // const zoominit = getZoomInit();
    // TODO: this is failing intermittently lol just forget it
    // return zoominit || zoom;
  }, [getZoomInit]);

  const attachZoom: RefCallback<HTMLImageElement | HTMLVideoElement> =
    useCallback(
      (node) => {
        const zoom = getZoom();
        zoom.on("open", attachKeyEvents);
        zoom.on("close", detachKeyEvents);

        if (node) {
          zoom.attach(node);
        } else {
          zoom.detach();
        }
      },
      [getZoom]
    );

  const attachKeyEvents = (e) => {
    document.addEventListener("keyup", handleKey, false);
  };
  const detachKeyEvents = (e) => {
    document.removeEventListener("keyup", handleKey, false);
  };
  const handleKey = (e) => {
    // console.log("handleKey", e);
    const zoom = getZoom();
    const images = zoom.getImages();
    const currentImageIndex = images.indexOf(zoom.getZoomedImage());
    let target;

    if (images.length <= 1) {
      return;
    }

    switch (e.code) {
      case "ArrowLeft":
        target =
          currentImageIndex - 1 < 0
            ? images[images.length - 1]
            : images[currentImageIndex - 1];
        zoom.close().then(() => {
          target.scrollIntoView();
          zoom.open({
            target: target,
          });
        });
        break;
      case "ArrowRight":
        target =
          currentImageIndex + 1 >= images.length
            ? images[0]
            : images[currentImageIndex + 1];
        zoom.close().then(() => {
          target.scrollIntoView();
          zoom.open({
            target: target,
          });
        });
        break;
      default:
        break;
    }
  };

  return {
    getZoom,
    attachZoom,
  };
}
