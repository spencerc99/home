import { defineCollection, z } from "astro:content";

const posts = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().optional(),
      // Transform string to Date object
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: z.union([image(), z.string()]).optional(),
      categories: z.array(z.string()).optional(),
      externalLink: z.string().optional(),
      //   image: z.string().optional(),
      storyType: z.enum(["serif", "mono"]).optional(),
      icon: z.string().optional(),
      emojis: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      draft: z.boolean().optional(),
      external_link_syndication: z.string().optional(),
      hidden: z.boolean().optional(),
      related: z.array(z.string()).optional(),
    }),
});

export const creationSchema = z.object({
  title: z.string(),
  subtext: z.string().optional(),
  descriptionMd: z.string().optional(),
  parentCategory: z.string().optional(),
  categories: z.array(z.string()),
  date: z.coerce.date().nullable(),
  endDate: z.coerce.date().nullable().optional(),
  heroImage: z.string().optional(),
  media: z.array(z.string()).optional(),
  imageDescriptions: z.array(z.string()).optional(),
  link: z.string().optional(),
  materials: z.string().optional(),
  movieUrl: z.string().optional(),
  movieEmbed: z.string().optional(),
  ongoing: z.boolean().default(false),
  forthcoming: z.boolean().default(false),
  featured: z.boolean().default(false),
  assetPreviewIdx: z.number().default(0),
  isEvent: z.boolean().default(false),
  mediaMetadata: z.array(z.enum(["image", "video"])),
  related: z.array(z.string()).optional(),
});

const creation = defineCollection({
  type: "data",
  schema: creationSchema,
});

export const collections = { posts, creation };
