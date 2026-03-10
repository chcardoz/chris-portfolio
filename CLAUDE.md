# CLAUDE.md

## Project Overview

Cairo is a personal portfolio and blog site built with Next.js 16, React 19, and TypeScript. It is deployed on Vercel.

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
- **Blog**: MDX via next-mdx-remote
- **3D**: React Three Fiber + Three.js + Drei
- **Analytics**: Vercel Analytics + Speed Insights
- **Database**: Vercel KV (Redis) / Upstash Redis for visitor tracking
- **Font**: Geist

## Project Structure

```
app/           → Next.js app directory (pages, layouts, API routes)
components/    → Reusable React components
posts/         → MDX blog posts
public/        → Static assets
```

## Key Conventions

- Path alias: `@/*` maps to project root
- Blog posts are `.mdx` files in the `posts/` directory
- Dynamic routes use `[slug]` pattern (e.g., `app/blog/[slug]/page.tsx`)
- Environment variables for Vercel KV are in `.env` (see `.env.example`)

## Common Tasks

- Add a blog post: Create a new `.mdx` file in `posts/`
- Run locally: `bun run dev` (requires `.env` for full functionality)
