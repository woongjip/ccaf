import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const notices = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notices' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    pinned: z.boolean().default(false),
    deadline: z.coerce.date().optional(),
    image: z.string().optional(),
    attachments: z.array(z.object({ label: z.string(), file: z.string() })).default([]),
  }),
});

const faq = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/faq' }),
  schema: z.object({
    question: z.string(),
    category: z.string(),
    lang: z.enum(['ko', 'en']).default('ko'),
    order: z.number().default(100),
  }),
});

const performances = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/performances' }),
  schema: z.object({
    year: z.number(),
    title: z.string(),
    artist: z.string(),
    genre: z.enum(['dance', 'music', 'theater', 'kids', 'etc']),
    venue: z.string(),
    sessions: z.array(z.string()),
    image: z.string().optional(),
    ticketUrl: z.string().optional(),
    runtime: z.string().optional(),
    age: z.string().optional(),
    order: z.number().default(100),
  }),
});

const festivals = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/festivals' }),
  schema: z.object({
    year: z.number(),
    sort: z.number(),
    title: z.string(),
    period: z.string().default(''),
    poster: z.string().optional(),
    link: z.string().optional(),
    programBook: z.string().optional(),
    programBookEn: z.string().optional(),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    eyebrow: z.string().optional(),
    lead: z.string().optional(),
    hero: z.string().optional(),
    gallery: z.array(z.string()).default([]),
    buttons: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
    notice: z.string().optional(),
  }),
});

export const collections = { notices, faq, performances, festivals, pages };
