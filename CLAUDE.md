# CLAUDE.md

## Project Overview

Florence is a personal portfolio, blog, and second-brain workspace for chriscardoza.com. It is a Bun monorepo with a Next.js public site over a reusable content brain.

## Package Manager

Use **bun**.

- Install dependencies: `bun install`
- Dev server: `bun run dev`
- Build: `bun run build`
- Test: `bun run test`
- Typecheck: `bun run typecheck`
- Lint: `bun run lint`
- Format check: `bun run format`

## Architecture

```text
apps/site/             Next.js 16 App Router site
content/blog/          Canonical MDX blog posts
content/transcripts/   Canonical transcript documents
packages/brain-core/   Parser, frontmatter schema, graph extraction, date/feed helpers
packages/brain-db/     Generated SQLite index, FTS search, backlinks/unresolved queries
packages/brain-cli/    CLI commands for validate/reindex/search/read/backlinks
packages/brain-mcp/    MCP stdio server wrapping the same brain APIs
.brain/                Generated SQLite database, ignored by git
```

Markdown/MDX plus git is the source of truth. SQLite is disposable generated state and must be rebuildable with `bun run brain reindex`.

## Site Conventions

- Path alias: `@/*` maps to `apps/site/*`.
- Blog rendering stays in `apps/site`.
- Content parsing, sorting, draft filtering, feed data, and sitemap data belong in `packages/brain-core`.
- Do not reintroduce filesystem content reads inside route files or React components. Use `apps/site/lib/brain.ts`.
- The development edit API writes through `brain-core`, not direct `posts/` paths.

## Brain CLI

```bash
bun run brain validate
bun run brain reindex
bun run brain search "query"
bun run brain read <id-or-slug>
bun run brain backlinks <id-or-slug>
bun run brain orphans
```

Use the CLI first for deterministic content work in this repo: validate before edits, reindex after content changes, search/read before opening raw files, and use backlinks/orphans for graph checks.

## Brain MCP

```bash
bun packages/brain-mcp/src/index.ts
```

Claude Code uses the project `.mcp.json`; approve `cbrain` from `/mcp` if prompted. Codex uses `.codex/config.toml` when project config is trusted and loaded; check `/mcp` in the TUI when needed. Prefer MCP tools when the agent host exposes them, especially `search`, `read_document`, `read_raw`, `backlinks`, `unresolved_links`, `validate`, and `reindex`. If MCP is unavailable, fall back to the Brain CLI commands above. MCP clients should launch the direct package entrypoint, because package-manager script output can break stdio.

## Content Conventions

Blog posts live in `content/blog/*.mdx` and require frontmatter with `title`, `publishedAt`, and `summary`. `draft: true` hides posts from production routes. Notes and transcripts should prefer `.md` unless published UI components require MDX.

## Browser Automation

Browser testing is not part of normal automated checks here. Use browser automation only when explicitly requested for visual/frontend verification.
