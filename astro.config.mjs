import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
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
    mdx(),
    sitemap(),
    react({
      experimentalReactChildren: true,
    }),
  ],
});
