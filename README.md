# Florence

Personal portfolio, blog, and second-brain workspace for chriscardoza.com.

The site is now a Bun monorepo. Markdown/MDX files in `content/` are the durable source of truth, `packages/brain-core` parses and validates them, `packages/brain-db` builds a disposable SQLite index, and `apps/site` renders the public Next.js site.

## Structure

```text
apps/site/             Next.js portfolio and publishing surface
content/blog/          Published and draft MDX posts
content/transcripts/   Transcript/source documents
packages/brain-core/   Content schema, parser, graph extraction, feed helpers
packages/brain-db/     Generated SQLite index and FTS queries
packages/brain-cli/    Human/agent command-line control plane
packages/brain-mcp/    MCP stdio server for agent tools
.brain/                Generated SQLite index, ignored by git
```

## Commands

```bash
bun install
bun run dev
bun run build
bun run test
bun run typecheck
bun run lint
bun run format
```

Brain commands:

```bash
bun run brain validate
bun run brain reindex
bun run brain search "fractal"
bun run brain read blog:100-ideas-to-get-you-started
bun run brain backlinks <id-or-slug>
bun run brain orphans
```

MCP server:

```bash
bun run mcp
```

## Content Rules

Blog posts live in `content/blog/*.mdx` and require:

```yaml
---
title: Example
publishedAt: "2026-01-01"
summary: Short summary
draft: false
tags: []
aliases: []
---
```

Notes and transcripts should prefer plain Markdown. SQLite is generated state; if it is stale, run `bun run brain reindex`.
