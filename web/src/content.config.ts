import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const chapters = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/chapters" }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    number: z.string().nullable(),
    kind: z.enum(["front", "chapter", "appendix"]),
    label: z.string().optional(),
  }),
});

export const collections = { chapters };
