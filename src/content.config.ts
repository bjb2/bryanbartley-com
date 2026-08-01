import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    year: z.number(),
    status: z.enum(['live', 'shipped', 'paused', 'building', 'archived', 'sunset']),
    stack: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    url: z.string().url().optional(),
    repo: z.string().url().optional(),
    featured: z.boolean().default(false),
    order: z.number().default(100),
    cover: z.string().optional(),
    gallery: z
      .array(z.object({ src: z.string(), caption: z.string() }))
      .default([]),
  }),
});

const writing = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    excerpt: z.string().optional(),
    tags: z.array(z.string()).default([]),
    category: z.enum(['essay', 'poem', 'song', 'note']).optional(),
    draft: z.boolean().default(false),
  }),
});

const play = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/play' }),
  schema: z.object({
    title: z.string(),
    caption: z.string(),
    image: z.string().optional(),
    url: z.string().url().optional(),
    year: z.number().optional(),
    order: z.number().default(100),
  }),
});

export const collections = { projects, writing, play };
