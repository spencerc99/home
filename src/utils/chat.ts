// ABOUTME: Shared behavior helpers for the live chat component.
// ABOUTME: Keeps chat scroll decisions testable outside React.

export function isScrolledNearBottom(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  threshold = 24,
): boolean {
  return scrollHeight - scrollTop - clientHeight <= threshold;
}
