import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    description: z.string().nullable().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.union([z.boolean(), z.string()]).optional(),
    publish: z.union([z.boolean(), z.string()]).optional(),
    completed: z.union([z.boolean(), z.string()]).optional(),
    kind: z.enum(['analysis', 'note', 'resource']),
    section: z.string(),
    sectionTitle: z.string(),
    order: z.number().default(0),
    url: z.string(),
    sourcePath: z.string(),
    image: z.string().optional(),
    original: z.string().optional(),
    format: z.string().optional(),
  }),
});

const sections = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/sections' }),
  schema: z.object({ title: z.string(), order: z.number(), type: z.enum(['analyses', 'notes']) }),
});

const home = defineCollection({
  loader: glob({ pattern: 'index.md', base: './content' }),
  schema: z.object({ title: z.string(), description: z.string() }),
});

export const collections = { notes, sections, home };
