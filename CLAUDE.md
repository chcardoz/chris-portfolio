# CLAUDE.md

## Project Overview

Cairo is a personal portfolio and blog site for chriscardoza.com, built with Next.js 16, React 19, and TypeScript. It is deployed on Vercel.

## Package Manager

This project uses **bun** (not npm, yarn, or pnpm).

- Install dependencies: `bun install`
- Dev server: `bun run dev`
- Build: `bun run build`
- Start production: `bun run start`

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5.3
- **Styling**: Tailwind CSS v4 (alpha) with PostCSS
- **Blog**: MDX via next-mdx-remote, syntax highlighting via sugar-high
- **3D**: React Three Fiber + Three.js + Drei (interactive globe with day/night shader and flight arcs)
- **Analytics**: Vercel Analytics + Speed Insights
- **Fonts**: Space Grotesk (display) + JetBrains Mono (monospace) from Google Fonts

## Project Structure

```
app/                → Next.js app directory
├── page.tsx        → Homepage (globe + recent posts)
├── layout.tsx      → Root layout (fonts, analytics)
├── blog/           → Blog listing + [slug] dynamic routes
├── og/route.tsx    → Dynamic OG image generation
├── rss/route.ts    → RSS feed
├── sitemap.ts      → XML sitemap
├── robots.ts       → robots.txt
└── not-found.tsx   → 404 page
components/         → React components (globe, nav, footer, mdx, ambient noise)
posts/              → MDX blog posts
public/textures/    → Earth day/night map textures for globe
```

## Key Conventions

- Path alias: `@/*` maps to project root
- Blog posts are `.mdx` files in the `posts/` directory with YAML frontmatter (title, publishedAt, summary, image)
- Dynamic routes use `[slug]` pattern (e.g., `app/blog/[slug]/page.tsx`)
- No environment variables are required to run locally

## Browser Automation

`agent-browser` is installed globally for visual feedback during frontend work. Use it to screenshot and inspect the running dev server. See `.claude/skills/agent-browser/SKILL.md` for full command reference.

## Common Tasks

- Add a blog post: Create a new `.mdx` file in `posts/`
- Run locally: `bun run dev`
