// ABOUTME: Restores scroll position on back/forward view-transition navigation.
// ABOUTME: Re-anchors to the link the visitor clicked while lazy islands settle.
import type { TransitionBeforePreparationEvent } from "astro:transitions/client";

// Astro restores a pixel offset right after swapping the page, but client:only
// islands (like the creations grid) haven't rendered yet and lazy media keeps
// resizing the page, so that offset lands somewhere else. Instead, remember the
// link that was clicked and where it sat in the viewport, then keep that link
// in place until the layout settles.
const SETTLE_MS = 2500;

type ScrollAnchor = { href: string; viewportTop: number };

// Keyed by Astro's history entry index. Module state persists across swaps.
const anchorsByHistoryIndex = new Map<number, ScrollAnchor>();

let pendingRestore: { anchor?: ScrollAnchor; scrollY: number } | null = null;
let stopRestore: (() => void) | null = null;

document.addEventListener("astro:before-preparation", (event) => {
  stopRestore?.();
  const { navigationType, sourceElement } =
    event as TransitionBeforePreparationEvent;
  const index: unknown = history.state?.index;

  if (navigationType === "traverse") {
    // history.state is already the destination entry here.
    pendingRestore =
      typeof index === "number" && typeof history.state?.scrollY === "number"
        ? {
            anchor: anchorsByHistoryIndex.get(index),
            scrollY: history.state.scrollY,
          }
        : null;
    return;
  }

  pendingRestore = null;
  const link = sourceElement?.closest("a[href]");
  // Links in persisted chrome (sidebar, footer) don't move with the page.
  const isInPageContent =
    link && !link.closest("[data-astro-transition-persist]");
  if (typeof index === "number" && link && isInPageContent) {
    anchorsByHistoryIndex.set(index, {
      href: link.getAttribute("href")!,
      viewportTop: link.getBoundingClientRect().top,
    });
  }
});

// The clicked link may wrap media that hasn't rendered yet (zero size), so fall
// back to its nearest ancestor that takes up space.
function findAnchorElement(href: string): Element | null {
  const link = document.querySelector(`a[href="${CSS.escape(href)}"]`);
  let element: Element | null = link;
  while (element && element.getBoundingClientRect().height === 0) {
    element = element.parentElement;
  }
  return element;
}

document.addEventListener("astro:page-load", () => {
  const restore = pendingRestore;
  pendingRestore = null;
  if (!restore || (!restore.anchor && restore.scrollY <= 0)) return;

  const deadline = performance.now() + SETTLE_MS;
  const userEvents = ["wheel", "touchstart", "keydown", "mousedown"];
  let frame = 0;

  const stop = () => {
    cancelAnimationFrame(frame);
    userEvents.forEach((name) => removeEventListener(name, stop));
    stopRestore = null;
  };

  const targetScrollY = () => {
    const element = restore.anchor && findAnchorElement(restore.anchor.href);
    if (element) {
      return (
        element.getBoundingClientRect().top +
        scrollY -
        restore.anchor!.viewportTop
      );
    }
    return restore.scrollY;
  };

  const step = () => {
    const maxScroll = document.documentElement.scrollHeight - innerHeight;
    const target = Math.max(0, Math.min(targetScrollY(), maxScroll));
    if (Math.abs(scrollY - target) > 1) {
      scrollTo({ top: target, behavior: "instant" });
    }
    if (performance.now() > deadline) {
      stop();
      return;
    }
    frame = requestAnimationFrame(step);
  };

  // A visitor scrolling on their own wins over the restore.
  userEvents.forEach((name) =>
    addEventListener(name, stop, { once: true, passive: true }),
  );
  stopRestore = stop;
  step();
});
