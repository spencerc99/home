import { defineCollection, z } from "astro:content";

export const postSchema = z.object({
  title: z.string(),
  description: z.string(),
  // Transform string to Date object
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  heroImage: z.string().optional(),
  categories: z.array(z.string()).optional(),
  externalLink: z.string().optional(),
});

const posts = defineCollection({
  type: "content",
  // Type-check frontmatter using a schema
  schema: postSchema,
});

export const creationSchema = z.object({
  title: z.string(),
  subtext: z.string().optional(),
  descriptionMd: z.string().optional(),
  parentCategory: z.string().optional(),
  categories: z.array(z.string()),
  date: z.coerce.date().nullable(),
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
  featuredArt: z.boolean().default(false),
  featuredWork: z.boolean().default(false),
  useImageForPreview: z.boolean().default(false),
  isEvent: z.boolean().default(false),
});

const creation = defineCollection({
  type: "data",
  schema: creationSchema,
});

export const collections = { posts, creation };
