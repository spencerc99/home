// ABOUTME: User role and visit tracking utilities
// ABOUTME: Determines regular status based on visit count

const VISIT_COUNT_KEY = 'site_visit_count';
const SESSION_VISIT_KEY = 'session_visit_tracked';
const REGULAR_THRESHOLD = 10;

/**
 * Tracks a visit if not already tracked this session
 * @returns The updated visit count
 */
export function trackVisit(): number {
  if (typeof window === 'undefined') return 0;

  // Check if we've already tracked this session
  const sessionTracked = sessionStorage.getItem(SESSION_VISIT_KEY);

  if (!sessionTracked) {
    // Get current visit count
    const currentCount = getVisitCount();
    const newCount = currentCount + 1;

    // Store the new count
    localStorage.setItem(VISIT_COUNT_KEY, newCount.toString());
    sessionStorage.setItem(SESSION_VISIT_KEY, 'true');

    return newCount;
  }

  return getVisitCount();
}

/**
 * Gets the current visit count
 */
export function getVisitCount(): number {
  if (typeof window === 'undefined') return 0;

  const count = localStorage.getItem(VISIT_COUNT_KEY);
  return count ? parseInt(count, 10) : 0;
}

/**
 * Checks if the user is a regular (visited >= threshold times)
 */
export function isRegular(): boolean {
  return getVisitCount() >= REGULAR_THRESHOLD;
}

/**
 * Resets visit count (for testing purposes)
 */
export function resetVisitCount(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(VISIT_COUNT_KEY);
  sessionStorage.removeItem(SESSION_VISIT_KEY);
}
