import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { SITE_TITLE, SITE_DESCRIPTION } from "../consts";
import {
  isExternalOnlyPost,
  normalizeExternalLink,
} from "../utils/externalPosts.mjs";

export async function GET(context) {
  const posts = (await getCollection("posts")) || [];
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: posts.map((post) => ({
      ...post.data,
      link: isExternalOnlyPost(post)
        ? normalizeExternalLink(post.data.externalLink)
        : `/posts/${post.slug}/`,
    })),
  });
}
