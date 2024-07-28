import { defineCollection, z } from "astro:content";

const posts = defineCollection({
  type: "content",
  // Type-check frontmatter using a schema
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // Transform string to Date object
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
  }),
});

export const creationSchema = z.object({
  title: z.string(),
  subtext: z.string().optional(),
  descriptionMd: z.string().optional(),
  parentCategory: z.string(),
  categories: z.array(z.string()),
  date: z.coerce.date(),
  heroImage: z.string().optional(),
  media: z.array(z.string()).optional(),
  imageDescriptions: z.array(z.string()).optional(),
  link: z.string().optional(),
  materials: z.string().optional(),
  movieUrl: z.string().optional(),
  ongoing: z.boolean(),
  forthcoming: z.boolean(),
  featured: z.boolean(),
  featuredArt: z.boolean(),
  featuredWork: z.boolean(),
  useImageForPreview: z.boolean().optional(),
});

const creation = defineCollection({
  type: "data",
  schema: creationSchema,
});

export const collections = { posts, creation };
