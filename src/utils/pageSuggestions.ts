// ABOUTME: Ranks known site pages by how closely they match a missing URL.
// ABOUTME: Powers the "were you looking for" links on the 404 page.

export type SitePage = { href: string; title: string };

const SECTION_WORDS = new Set(["creation", "creations", "posts", "post"]);

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, "")
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 1);
}

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
}

// 0..1, where 1 means the two words are identical.
function wordSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.startsWith(b) || b.startsWith(a)) return 0.8;
  return 1 - editDistance(a, b) / Math.max(a.length, b.length);
}

function scorePage(missingWords: string[], page: SitePage): number {
  const pageWords = [...new Set([...words(page.href), ...words(page.title)])];
  if (pageWords.length === 0) return 0;
  let total = 0;
  for (const missing of missingWords) {
    const best = Math.max(...pageWords.map((w) => wordSimilarity(missing, w)));
    // Only count words that are clearly related, so typos match but
    // unrelated short words don't add noise.
    if (best >= 0.7) total += best;
  }
  return total / missingWords.length;
}

export function suggestPages(
  missingPath: string,
  pages: SitePage[],
  limit = 3,
): SitePage[] {
  // Section names like "creation" appear in every href in that section, so
  // they'd make every page look like a match.
  const allWords = words(decodeURIComponent(missingPath));
  const specificWords = allWords.filter((word) => !SECTION_WORDS.has(word));
  const missingWords = specificWords.length > 0 ? specificWords : allWords;
  if (missingWords.length === 0) return [];
  return pages
    .map((page) => ({ page, score: scorePage(missingWords, page) }))
    .filter(({ score }) => score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ page }) => page);
}
