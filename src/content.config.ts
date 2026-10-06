import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const analyses = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/analyses' }),
  schema: z.object({
    title: z.string(),
    description: z.string().nullable().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.union([z.boolean(), z.string()]).optional(),
    publish: z.union([z.boolean(), z.string()]).optional(),
    completed: z.union([z.boolean(), z.string()]).optional(),
  }),
});

export const collections = { analyses };
