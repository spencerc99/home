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
    // @playhtml/react lists react/react-dom as dependencies, which lets Vite
    // discover and pre-bundle a second React instance. When two copies exist,
    // hook dispatch reads from the wrong instance and every island crashes with
    // "Cannot read properties of null (reading 'useState')". Dedupe + force a
    // single optimized copy so all islands share one React.
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react/jsx-runtime"],
    },
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
    "/creation/internet-movement": "/creation/we-were-browsing",
    "/creation/self-portrait-(internet)": "/creation/we-were-browsing",
    "/creation/on-our-way": "/creation/on-our-way-(home)",
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
