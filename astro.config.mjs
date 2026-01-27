import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      external: ["node:child_process"],
    },
  },
  image: {
    domains: ["assets.spencerchang.me", "codahosted.io/"],
  },
  redirects: {
    "/creation/SIGIL-I": "/creation/sigil-i",
    "/creation/Touching-Computers-Creating-Data-Talismans":
      "/creation/touching-computers-creating-data-talismans",
    "/creation/Gather": "/creation/gather",
  },
  site: "https://spencer.place",
  integrations: [
    mdx({
      extendMarkdownConfig: true,
      markdownOptions: {
        mode: "mdx",
      },
      rehypeOptions: {
        fragment: true,
        space: "html",
        allowDangerousHtml: true,
      },
    }),
    sitemap(),
    react({
      experimentalReactChildren: true,
    }),
  ],
  output: "hybrid",
  adapter: cloudflare(),
});
