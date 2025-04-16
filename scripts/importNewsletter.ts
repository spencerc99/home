import type { z } from "astro/zod";
import fs from "fs";
import { postSchema } from "../src/content/config";
import path from "path";
import { escapeTitleForFilename } from "./importCreations";
interface NewsletterItem {
  transformedFilename: string;
  title: string;
  published: string;
  description: string;
  image: string;
  link: string;
  hasRealPost: boolean;
}

function escapeSingleQuotes(str: string) {
  return str.replace(/'/g, "\\'");
}

async function importNewsletter() {
  const docId = "5hYjdHt-Rs";
  const gridId =
    "grid-sync-1054-Table-dynamic-da00091aa57ba00b53ab95245538ef44c330ebaec66c5f543495b7f18fa97126";
  const resp = await fetch(
    `https://opencoda.spencerc99.workers.dev/${docId}/${gridId}`
  );
  const data: NewsletterItem[] = await resp.json();

  // Exclude newsletter items that have a real post
  const filteredNewsletterItems = data.filter((item) => !item.hasRealPost);

  // zod type from creationSchema
  const transformedData: z.infer<typeof postSchema>[] =
    filteredNewsletterItems.map((item) => {
      const date = new Date(item.published);

      const finalItem: z.infer<typeof postSchema> = {
        title: item.title,
        description: item.description,
        pubDate: date,
        updatedDate: date,
        heroImage: item.image,
        categories: ["newsletter"],
        externalLink: item.link,
      };
      // remove empty fields
      Object.keys(finalItem).forEach((key) => {
        if (
          finalItem[key] === undefined ||
          finalItem[key] === null ||
          finalItem[key] === ""
        ) {
          delete finalItem[key];
        }
      });

      return finalItem;
    });

  const dir = path.join(__dirname, "../src/content/posts");

  transformedData.forEach((item) => {
    const filePath = path.join(dir, `${escapeTitleForFilename(item.title)}.md`);
    const filePathMdx = path.join(
      dir,
      `${escapeTitleForFilename(item.title)}.mdx`
    );
    // skip if file exists
    if (fs.existsSync(filePathMdx)) {
      return;
    }
    if (fs.existsSync(filePath)) {
      return;
    }

    const yamlContent = `---
title: >
    ${item.title}
description: >
  ${item.description}
pubDate: ${item.pubDate.toISOString()}
updatedDate: ${item.updatedDate.toISOString()}
heroImage: ${item.heroImage}
externalLink: ${item.externalLink}
categories: ${item.categories ? JSON.stringify(item.categories) : "[]"}
---
    `;
    fs.writeFileSync(filePath, yamlContent);
  });
}

await importNewsletter();
console.log("done importing newsletter");
