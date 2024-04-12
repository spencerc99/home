import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  image: {
    domains: ["assets.spencerchang.me", "codahosted.io/"],
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
