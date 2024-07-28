import fs from "fs";
import path from "path";
import { creationSchema } from "../src/content/config";
import { z } from "astro/zod";

// this is already defined sometimes?
// const __dirname = path.dirname(new URL(import.meta.url).pathname);

export interface CodaItem {
  title: string;
  subtext: string;
  descriptionMd: string;
  link: string;
  date: string;
  specificCategory: string[];
  parentCategory: string;
  "Work Highlight": boolean;
  created: string;
  imageUrls: string[];
  imageDescriptions: string[];
  metadata: string;
  websiteImage: string;
  movieUrl: string;
  featuredArt: boolean;
  Materials: string;
  forthcoming: boolean;
  ongoing: boolean;
  featured: boolean;
  useImageForPreview: boolean;
}

function escapeTitleForFilename(title: string): string {
  // Replace spaces with hyphen
  let escapedTitle = title.trim().replace(/\s+/g, "-").toLowerCase();
  // Remove characters that are not alphanumeric or hyphens
  escapedTitle = escapedTitle.replace(/[\[<>\/:\*\?|\]"'”“’\.]/g, "");
  return escapedTitle;
}

async function importCreations() {
  const docId = "5hYjdHt-Rs";
  const gridId =
    "grid-sync-1054-Table-dynamic-91a21264ba5189ae869bfd39fc74c2deec9488c8ffe5267f43ef07b20fdef4e8";
  const resp = await fetch(
    `https://opencoda.spencerc99.workers.dev/${docId}/${gridId}`
  );
  const data: CodaItem[] = await resp.json();
  // put them into content/creation as single json files using the title as the name

  // zod type from creationSchema
  const transformedData: z.infer<typeof creationSchema>[] = data.map((item) => {
    const date = new Date(item.date);

    const media = [...(item.imageUrls ?? [])].filter(Boolean);
    const heroImage = media[0];
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
    //     const filePath = path.join(__dirname, "../public/creation", filename);
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
    //     media.push(`creation/${filename}`);
    //   });
    // }
    // if (heroImageUrl) {
    //   const ext = path.extname(heroImageUrl);
    //   const filename = `${escapeTitleForFilename(item.title)}-hero${ext}`;
    //   const filePath = path.join(__dirname, "../public/creation", filename);
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
    //   heroImage = `creation/${filename}`;
    // }

    return {
      title: item.title,
      subtext: item.subtext,
      descriptionMd: item.descriptionMd,
      parentCategory: item.parentCategory,
      categories: item.specificCategory || [],
      date,
      heroImage,
      media,
      movieUrl: item.movieUrl,
      link: item.link,
      materials: item.Materials,
      ongoing: item.ongoing,
      forthcoming: item.forthcoming || date > new Date(),
      featured: item.featured,
      featuredArt: item.featuredArt,
      featuredWork: item["Work Highlight"],
      useImageForPreview: item.useImageForPreview,
      imageDescriptions: item.imageDescriptions || [],
    };
  });

  const dir = path.join(__dirname, "../src/content/creation");

  // delete all files in directory
  fs.readdirSync(dir).forEach((file) => {
    fs.unlinkSync(path.join(dir, file));
  });

  transformedData.forEach((item) => {
    const filePath = path.join(
      dir,
      `${escapeTitleForFilename(item.title)}.json`
    );
    fs.writeFileSync(filePath, JSON.stringify(item, null, 2));
  });
}

await importCreations();
console.log("done importing");
