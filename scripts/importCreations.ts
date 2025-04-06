import fs from "fs";
import path from "path";
import { creationSchema } from "../src/content/config";
import { z } from "astro/zod";
import { transformImageUrl } from "../src/utils/images";

// this is already defined sometimes?
// const __dirname = path.dirname(new URL(import.meta.url).pathname);

// Helper function to detect media type from URL
async function getMediaType(url: string): Promise<"image" | "video" | null> {
  // Method 1: Check file extension
  const extensionMatch = url.match(/\.([^.]+)$/);
  if (extensionMatch) {
    const ext = extensionMatch[1].toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(ext)) {
      return "image";
    }
    if (["mp4", "webm", "ogg", "mov"].includes(ext)) {
      return "video";
    }
  }

  try {
    // Method 2: Fetch headers to check Content-Type
    const response = await fetch(url, { method: "HEAD" });
    const contentType = response.headers.get("Content-Type");
    if (contentType?.startsWith("image/")) {
      return "image";
    }
    if (contentType?.startsWith("video/")) {
      return "video";
    }
  } catch (error) {
    console.error("Error detecting media type:", error);
  }

  return "image";
}

export interface CodaItem {
  title: string;
  subtext: string;
  descriptionMd: string;
  link: string;
  date: string;
  endDate: string;
  specificCategory: string[];
  parentCategory: string;
  "Work Highlight": boolean;
  created: string;
  imageUrls: string[];
  imageDescriptions: string[];
  metadata: string;
  websiteImage: string;
  movieUrl: string;
  movieEmbed: string;
  featuredArt: boolean;
  Materials: string;
  forthcoming: boolean;
  ongoing: boolean;
  featured: boolean;
  isEvent: boolean;
  assetPreviewIdx?: number;
}

export function escapeTitleForFilename(title: string): string {
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
    `https://opencoda.spencerc99.workers.dev/${docId}/${gridId}`,
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  const data: CodaItem[] = await resp.json();
  // put them into content/creation as single json files using the title as the name

  // Transform the data with media metadata
  const transformedData: z.infer<typeof creationSchema>[] = await Promise.all(
    data.map(async (item) => {
      const date = new Date(item.date);
      const media = [...(item.imageUrls ?? [])]
        .filter(Boolean)
        .map(transformImageUrl);

      const transformedMovieUrl = transformImageUrl(item.movieUrl);

      // Get type for all media items
      const mediaMetadata = await Promise.all(
        media.map(async (url) => {
          const type = await getMediaType(url);
          return type;
        })
      );

      //   console.log(`downloading ${heroImageUrl} to $
      // {filePath}`);
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

      const finalItem = {
        title: item.title,
        subtext: item.subtext,
        descriptionMd: item.descriptionMd,
        parentCategory: item.parentCategory,
        categories: item.specificCategory || [],
        date,
        endDate: item.endDate ? new Date(item.endDate) : null,
        heroImage: media[0],
        media,
        movieUrl: transformedMovieUrl,
        movieEmbed: item.movieEmbed,
        link: item.link,
        materials: item.Materials,
        ongoing: item.ongoing,
        forthcoming: item.forthcoming || date > new Date(),
        featured: item.featured,
        assetPreviewIdx: item.assetPreviewIdx,
        imageDescriptions: item.imageDescriptions || [],
        isEvent: item.isEvent,
        mediaMetadata,
      };

      // Remove empty fields
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
    })
  );

  const dir = path.join(__dirname, "../src/content/creation");

  // Delete all files in directory
  fs.readdirSync(dir).forEach((file) => {
    fs.unlinkSync(path.join(dir, file));
  });

  // Write transformed data
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
