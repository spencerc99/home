import fs from "fs";
import path from "path";
import { creationSchema } from "../src/content/config";
import { z } from "astro/zod";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export interface CodaItem {
  Row: string;
  Synced: boolean;
  "Sync account": string;
  title: string;
  subtext: string;
  description: string;
  Image: string[];
  firstImage: string;
  link: string;
  date: string;
  specificCategory: string[];
  parentCategory: string;
  "Work Highlight": boolean;
  Unfilled: boolean;
  created: string;
  imageUrls: string[];
  metadata: string;
  websiteImage: string;
  movie: string;
  featuredArt: boolean;
  Materials: string;
  forthcoming: boolean;
  ongoing: boolean;
  featured: boolean;
}

function escapeTitleForFilename(title: string): string {
  // Replace spaces with underscores
  let escapedTitle = title.replace(/\s+/g, "_");
  // Remove characters that are not alphanumeric or underscores
  escapedTitle = escapedTitle.replace(/[\[<>\/:\*\?|\]]/g, "");
  return escapedTitle;
}

function withQueryParams(url: string, params: Record<string, any>) {
  const urlObj = new URL(url);
  Object.entries(params).forEach(([key, value]) =>
    urlObj.searchParams.set(key, value)
  );
  return urlObj.toString();
}

async function importCreations() {
  const docId = "5hYjdHt-Rs";
  const gridId =
    "grid-sync-1054-Table-dynamic-91a21264ba5189ae869bfd39fc74c2deec9488c8ffe5267f43ef07b20fdef4e8";
  const resp = await fetch(
    withQueryParams(
      `https://opencoda.spencerc99.workers.dev/${docId}/${gridId}`,
      {
        valueFormat: "rich",
      }
    )
  );
  const data: CodaItem[] = await resp.json();
  // put them into content/creations as single json files using the title as the name

  // zod type from creationSchema
  const transformedData: z.infer<typeof creationSchema>[] = data.map((item) => {
    const createdDate = new Date(item.created);

    const media = [item.movie, ...(item.imageUrls ?? [])].filter(Boolean);
    const heroImage = item.firstImage;
    // download the assets into local folder item.movie if present and item.firstImage
    // const mediaUrls = [item.movie, ...(item.imageUrls ?? [])].filter(Boolean);
    // const heroImageUrl = item.firstImage;
    // let media: string[] = [];
    // let heroImage;
    // if (mediaUrls.length > 0) {
    //   console.log(`downloading media for ${item.title}`);
    //   mediaUrls.forEach((url, index) => {
    //     const ext = path.extname(url);
    //     const filename = `${escapeTitleForFilename(item.title)}-${index}${ext}`;
    //     const filePath = path.join(__dirname, "../public/creations", filename);
    //     // ignore if already exists
    //     if (fs.existsSync(filePath)) {
    //       return;
    //     }
    //     console.log(`downloading ${url} to ${filePath}`);
    //     fetch(url).then((resp) => {
    //       const dest = fs.createWriteStream(filePath);
    //       if (resp.body) {
    //         resp.body
    //           .getReader()
    //           .read()
    //           .then(({ value, done }) => {
    //             if (!done) {
    //               dest.write(Buffer.from(value));
    //               dest.end();
    //             }
    //           });
    //       }
    //     });
    //     media.push(`creations/${filename}`);
    //   });
    // }
    // if (heroImageUrl) {
    //   const ext = path.extname(heroImageUrl);
    //   const filename = `${escapeTitleForFilename(item.title)}-hero${ext}`;
    //   const filePath = path.join(__dirname, "../public/creations", filename);
    //   // ignore if already exists
    //   if (fs.existsSync(filePath)) {
    //     return;
    //   }

    //   console.log(`downloading ${heroImageUrl} to ${filePath}`);
    //   fetch(heroImageUrl).then((resp) => {
    //     const dest = fs.createWriteStream(filePath);
    //     if (resp.body) {
    //       resp.body
    //         .getReader()
    //         .read()
    //         .then(({ value, done }) => {
    //           if (!done) {
    //             dest.write(Buffer.from(value));
    //             dest.end();
    //           }
    //         });
    //     }
    //   });
    //   heroImage = `creations/${filename}`;
    // }

    return {
      title: item.title,
      subtext: item.subtext,
      description: item.description,
      parentCategory: item.parentCategory,
      categories: item.specificCategory,
      createdDate,
      heroImage,
      media,
      link: item.link,
      materials: item.Materials,
      ongoing: item.ongoing,
      forthcoming: item.forthcoming || createdDate > new Date(),
      featured: item.featured,
      featuredArt: item.featuredArt,
      featuredWork: item["Work Highlight"],
    };
  });

  const dir = path.join(__dirname, "../src/content/creations");

  transformedData.forEach((item) => {
    const filePath = path.join(
      dir,
      `${escapeTitleForFilename(item.title)}.json`
    );
    fs.writeFileSync(filePath, JSON.stringify(item, null, 2));
  });
}

importCreations();
