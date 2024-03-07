import { defineCollection, z } from "astro:content";

const blog = defineCollection({
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
  description: z.string(),
  parentCategory: z.string(),
  categories: z.array(z.string()),
  createdDate: z.coerce.date(),
  heroImage: z.string().optional(),
  media: z.array(z.string()).optional(),
  link: z.string().optional(),
  materials: z.string().optional(),
  ongoing: z.boolean(),
  forthcoming: z.boolean(),
  featured: z.boolean(),
  featuredArt: z.boolean(),
  featuredWork: z.boolean(),
});

const creation = defineCollection({
  type: "data",
  schema: creationSchema,
});

export const collections = { blog, creation };
