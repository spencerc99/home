// Posts that are only a pointer to somewhere else (most are newsletter issues
// imported by scripts/importNewsletter.ts) have an `externalLink` and no body.
// They're 301'd to the external page (see src/utils/externalPostRedirects.mjs,
// used from astro.config.mjs) instead of rendering an empty page.

// The old substack.com address 301s to the custom domain anyway; skip the hop.
export function normalizeExternalLink(link) {
  return link.replace(
    /^https?:\/\/spencerchang\.substack\.com\//,
    "https://news.spencer.place/"
  );
}

export function isExternalOnlyPost(post) {
  return Boolean(post.data.externalLink) && !post.body?.trim();
}
