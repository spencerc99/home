import fs from "fs";
import path from "path";
import { creationSchema } from "../src/content/config";
import { z } from "astro/zod";
import { transformImageUrl } from "../src/utils/images";
import crypto from "crypto";

// this is already defined sometimes?
// const __dirname = path.dirname(new URL(import.meta.url).pathname);

const VERBOSE = false;
// Check if MP4 video already exists locally by blob ID
function getLocalVideoPath(blobId: string): string | null {
  const videoDir = path.join(__dirname, "../public/creation-videos");
  const filePath = path.join(videoDir, `${blobId}.mp4`);

  if (fs.existsSync(filePath)) {
    // Verify file is not empty/corrupted
    const stats = fs.statSync(filePath);
    if (stats.size > 0) {
      return `/creation-videos/${blobId}.mp4`;
    } else {
      // Remove corrupted/empty file
      console.log(`Removing corrupted file: ${blobId}.mp4`);
      fs.unlinkSync(filePath);
    }
  }
  return null;
}

// Extract blob ID from Coda URL
function extractBlobId(url: string): string | null {
  const match = url.match(/blobs\/(bl-[^/]+)/);
  return match ? match[1] : null;
}

// Download video and convert to MP4 format
async function downloadVideo(url: string, blobId: string): Promise<string> {
  console.log(`Downloading video: ${url}`);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }

  // Always save as MP4 for web compatibility and speed
  const tempFilename = `${blobId}_temp`;
  const finalFilename = `${blobId}.mp4`;
  const tempPath = path.join(
    __dirname,
    "../public/creation-videos",
    tempFilename
  );
  const finalPath = path.join(
    __dirname,
    "../public/creation-videos",
    finalFilename
  );

  // Download to temporary file
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Verify the download completed successfully
  const expectedSize = response.headers.get("content-length");
  if (expectedSize && buffer.length !== parseInt(expectedSize)) {
    throw new Error(
      `Download incomplete: expected ${expectedSize} bytes, got ${buffer.length}`
    );
  }

  fs.writeFileSync(tempPath, buffer);
  console.log(`Downloaded video: ${tempFilename} (${buffer.length} bytes)`);

  // Convert to MP4 using ffmpeg with intelligent compression based on input size
  const inputSizeMB = buffer.length / (1024 * 1024);
  let crf = "23"; // Default quality
  let preset = "medium";
  let maxBitrate = null;

  if (inputSizeMB > 50) {
    // Very large files - moderate compression with higher bitrate
    crf = "26";
    preset = "medium";
    maxBitrate = "2M";
    console.log(
      `Large video detected (${inputSizeMB.toFixed(
        1
      )}MB), using moderate compression`
    );
  } else if (inputSizeMB > 20) {
    // Medium-large files - slightly higher compression
    crf = "25";
    preset = "medium";
    maxBitrate = "3M";
    console.log(
      `Medium-large video detected (${inputSizeMB.toFixed(
        1
      )}MB), using higher compression`
    );
  }

  const { spawn } = await import("child_process");
  const ffmpegArgs = [
    "-i",
    tempPath,
    "-c:v",
    "libx264", // H.264 video codec (fast)
    "-c:a",
    "aac", // AAC audio codec (fast)
    "-crf",
    crf, // Quality setting (adaptive)
    "-preset",
    preset, // Encoding preset (adaptive)
    "-movflags",
    "faststart", // Optimize for web streaming
    "-pix_fmt",
    "yuv420p", // Ensure compatibility
  ];

  // Add bitrate limit for large files
  if (maxBitrate) {
    ffmpegArgs.push("-maxrate", maxBitrate, "-bufsize", "2M");
  }

  ffmpegArgs.push("-f", "mp4", "-y", finalPath);

  const ffmpeg = spawn("ffmpeg", ffmpegArgs);

  return new Promise((resolve, reject) => {
    // Capture ffmpeg output for debugging
    let stderr = "";

    ffmpeg.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    ffmpeg.on("close", (code) => {
      // Clean up temporary file
      try {
        fs.unlinkSync(tempPath);
      } catch (e) {
        console.warn(`Could not delete temp file: ${tempPath}`);
      }

      if (code === 0) {
        // Verify the output file was created and has content
        if (fs.existsSync(finalPath) && fs.statSync(finalPath).size > 0) {
          const finalSizeMB = fs.statSync(finalPath).size / (1024 * 1024);
          const cloudflareLimit = 25; // MB

          if (finalSizeMB > cloudflareLimit) {
            console.warn(
              `⚠️  OVERSIZED FILE: ${finalFilename} is ${finalSizeMB.toFixed(
                1
              )}MB, exceeds Cloudflare Pages limit of ${cloudflareLimit}MB`
            );
            console.warn(`📁 File kept at: ${finalPath}`);
            console.warn(
              `🔗 Upload this file to R2 and update the JSON manually`
            );

            // Keep the file but mark as oversized - fall back to original URL
            reject(
              new Error(
                `Video ${finalFilename} exceeds ${cloudflareLimit}MB limit (${finalSizeMB.toFixed(
                  1
                )}MB) - file kept at ${finalPath}`
              )
            );
          } else {
            console.log(
              `Converted to MP4: ${finalFilename} (${finalSizeMB.toFixed(1)}MB)`
            );
            resolve(`/creation-videos/${finalFilename}`);
          }
        } else {
          console.error(
            `ffmpeg output file is empty or missing: ${finalFilename}`
          );
          console.error(`ffmpeg stderr: ${stderr}`);
          reject(
            new Error(`ffmpeg produced empty output file: ${finalFilename}`)
          );
        }
      } else {
        console.error(`ffmpeg conversion failed with code ${code}`);
        console.error(`ffmpeg stderr: ${stderr}`);
        reject(
          new Error(`ffmpeg conversion failed with code ${code}: ${stderr}`)
        );
      }
    });

    ffmpeg.on("error", (err) => {
      console.error(`ffmpeg process error: ${err.message}`);
      reject(new Error(`ffmpeg error: ${err.message}`));
    });
  });
}

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
  descriptionFooterMd?: string;
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
  ongoing: boolean;
  featured: boolean;
  isEvent: boolean;
  assetPreviewIdx?: number;
  institution?: string[];
  love?: "y" | "n" | "m";
  me?: "y" | "n" | "m";
  // TODO: handle related, they will be given as a list of creation titles, we have to map those to the actual creation that is somewhere else in the list to 'hydrate' them and then use that logic to separate them into ones that are "press" vs ones that are "project" and get their internal & external links
  related: string[];
}

interface RelatedCreation {
  title: string;
  slug: string;
  link: string;
  parentCategory: string;
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

  // Track all referenced video blob IDs for cleanup
  const referencedBlobIds = new Set<string>();

  // Create lookup map for performance optimization
  const titleToItemMap = new Map<string, CodaItem>();
  data.forEach((item) => {
    titleToItemMap.set(item.title, item);
  });

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

      // Download videos locally and use local paths
      const finalMedia = await Promise.all(
        media.map(async (url, idx) => {
          if (mediaMetadata[idx] === "video") {
            // Use original URL from item.imageUrls for video download
            const originalUrl = item.imageUrls[idx];
            const blobId = extractBlobId(originalUrl);

            if (blobId) {
              // Track this blob ID as referenced
              referencedBlobIds.add(blobId);

              // Check if video already exists locally
              const existingPath = getLocalVideoPath(blobId);
              if (existingPath) {
                if (VERBOSE)
                  console.log(
                    `Using existing video for blob ${blobId}: ${existingPath}`
                  );
                return existingPath;
              } else {
                // Download video
                try {
                  const localPath = await downloadVideo(originalUrl, blobId);
                  return localPath;
                } catch (error) {
                  console.warn(
                    `Failed to convert video ${blobId}: ${error.message}`
                  );
                  console.warn(`Falling back to original URL: ${originalUrl}`);
                  // Fall back to original URL if conversion fails (e.g., file too large)
                  return originalUrl;
                }
              }
            } else {
              console.error(`No blob ID found for video: ${originalUrl}`);
              throw new Error(`No blob ID found for video: ${originalUrl}`);
              1;
            }
          }
          return url;
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

      const related = item.related
        .map((title) => {
          if (title.trim() === "") {
            return null;
          }
          const relatedCreation = titleToItemMap.get(title);
          if (!relatedCreation) {
            console.warn(`Related creation not found: ${title}`);
            return null;
          }
          return {
            title: relatedCreation.title,
            slug: escapeTitleForFilename(relatedCreation.title),
            link: relatedCreation.link,
            parentCategory: relatedCreation.parentCategory,
          } as RelatedCreation;
        })
        .filter(Boolean);

      const finalItem = {
        title: item.title,
        subtext: item.subtext,
        descriptionMd: item.descriptionMd,
        descriptionFooterMd: item.descriptionFooterMd,
        parentCategory: item.parentCategory,
        categories: item.specificCategory || [],
        date,
        endDate: item.endDate ? new Date(item.endDate) : null,
        institution: item.institution,
        heroImage: finalMedia[0],
        media: finalMedia,
        movieUrl: transformedMovieUrl,
        movieEmbed: item.movieEmbed,
        link: item.link,
        materials: item.Materials,
        ongoing: item.ongoing,
        featured: item.featured,
        assetPreviewIdx: item.assetPreviewIdx,
        imageDescriptions: item.imageDescriptions || [],
        isEvent: item.isEvent,
        mediaMetadata,
        related,
        love: item.love,
        me: item.me,
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

  // Clean up unreferenced videos and temp files
  const videoDir = path.join(__dirname, "../public/creation-videos");
  if (fs.existsSync(videoDir)) {
    const existingVideoFiles = fs
      .readdirSync(videoDir)
      .filter(
        (file) =>
          file.endsWith(".mp4") ||
          file.endsWith(".webm") ||
          file.endsWith(".mov") ||
          file.endsWith(".avi") ||
          file.includes("_temp")
      );

    existingVideoFiles.forEach((file) => {
      // Always delete temp files
      if (file.includes("_temp")) {
        const filePath = path.join(videoDir, file);
        console.log(`Deleting temp file: ${file}`);
        fs.unlinkSync(filePath);
        return;
      }

      // For video files, only delete if not referenced
      const blobId = file.replace(/\.(mp4|webm|mov|avi)$/i, "");
      if (!referencedBlobIds.has(blobId) && blobId.startsWith("bl-")) {
        const filePath = path.join(videoDir, file);
        console.log(`Deleting unreferenced video: ${file}`);
        fs.unlinkSync(filePath);
      }
    });
  }

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
