// Build-time only (uses node:fs): computes 301s for posts that have an
// `externalLink` and no body, so search engines and visitors land on the real
// writing instead of an empty page. Runs from astro.config.mjs, where
// `astro:content` isn't available, so it reads the files directly and derives
// slugs the same way Astro does (github-slugger on each path segment).
import fs from "node:fs";
import path from "node:path";
import { slug as githubSlug } from "github-slugger";
import { normalizeExternalLink } from "./externalPosts.mjs";

const POSTS_DIR = new URL("../content/posts/", import.meta.url);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.mdx?$/.test(entry.name) ? [full] : [];
  });
}

export function getExternalPostRedirects() {
  const root = POSTS_DIR.pathname;
  const redirects = {};
  for (const file of walk(root)) {
    const raw = fs.readFileSync(file, "utf8");
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) continue;
    const [, frontmatter, body] = match;
    if (body.trim()) continue;
    const link = frontmatter.match(/^externalLink:\s*["']?([^"'\s]+)["']?\s*$/m);
    if (!link) continue;

    const slug = path
      .relative(root, file)
      .replace(/\.mdx?$/, "")
      .split(path.sep)
      .map((segment) => githubSlug(segment))
      .join("/")
      .replace(/\/index$/, "");
    redirects[`/posts/${slug}`] = normalizeExternalLink(link[1]);
  }
  return redirects;
}
