import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "bun:test";
import {
  analyzeMarkdown,
  buildBrainGraph,
  createBrainConfig,
  getVisibleBlogPosts,
  readBlogPosts,
} from "../src";

describe("brain-core", () => {
  test("reads blog posts with validated metadata and extracted markdown data", () => {
    const rootDir = makeFixture({
      "content/blog/hello.mdx": `---
title: Hello
publishedAt: "2026-01-01"
summary: First post
tags:
  - writing
aliases:
  - Start Here
---

## A Heading

Read [[Second Note]] and [external](https://example.com).
`,
    });

    const posts = readBlogPosts(createBrainConfig(rootDir));

    expect(posts).toHaveLength(1);
    expect(posts[0]?.id).toBe("blog:hello");
    expect(posts[0]?.metadata.status).toBe("published");
    expect(posts[0]?.headings[0]).toEqual({
      id: "a-heading",
      depth: 2,
      text: "A Heading",
    });
    expect(posts[0]?.links.map((link) => link.kind)).toEqual([
      "markdown",
      "wikilink",
    ]);
  });

  test("keeps draft posts out of visible blog results", () => {
    const rootDir = makeFixture({
      "content/blog/published.mdx": `---
title: Published
publishedAt: "2026-01-01"
summary: Published post
draft: false
---
Content
`,
      "content/blog/draft.mdx": `---
title: Draft
publishedAt: "2026-02-01"
summary: Draft post
draft: true
---
Content
`,
    });

    const posts = readBlogPosts(createBrainConfig(rootDir));
    expect(getVisibleBlogPosts(posts).map((post) => post.slug)).toEqual([
      "published",
    ]);
    expect(getVisibleBlogPosts(posts, true).map((post) => post.slug)).toEqual([
      "draft",
      "published",
    ]);
  });

  test("extracts citations, wikilinks, tags, and headings from mdx", () => {
    const analysis = analyzeMarkdown(`
## Demo

See [[Target Note|target]] #research <Citation href="https://example.com" />
`);

    expect(analysis.headings).toEqual([{ id: "demo", depth: 2, text: "Demo" }]);
    expect(analysis.tags).toEqual(["research"]);
    expect(analysis.links).toEqual([
      {
        kind: "wikilink",
        target: "Target Note",
        label: "target",
        external: false,
      },
      {
        kind: "citation",
        target: "https://example.com",
        external: true,
      },
    ]);
  });

  test("builds backlinks and reports unresolved local links", () => {
    const rootDir = makeFixture({
      "content/blog/source.mdx": `---
title: Source
publishedAt: "2026-01-01"
summary: Source
---
[[Target]]
[[Missing]]
`,
      "content/blog/target.mdx": `---
title: Target
publishedAt: "2026-01-02"
summary: Target
aliases:
  - Target
---
Content
`,
    });

    const posts = readBlogPosts(createBrainConfig(rootDir));
    const graph = buildBrainGraph(posts);

    expect(graph.backlinksByDocumentId.get("blog:target")).toHaveLength(1);
    expect(graph.unresolvedLinks.map((link) => link.target)).toEqual([
      "Missing",
    ]);
  });
});

function makeFixture(files: Record<string, string>): string {
  const rootDir = join(
    tmpdir(),
    `cbrain-core-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );

  for (const [filePath, content] of Object.entries(files)) {
    const absolutePath = join(rootDir, filePath);
    mkdirSync(join(absolutePath, ".."), { recursive: true });
    writeFileSync(absolutePath, content, "utf-8");
  }

  return rootDir;
}
