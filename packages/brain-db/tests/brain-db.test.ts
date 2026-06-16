import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "bun:test";
import { createBrainConfig } from "@florence/brain-core";
import {
  getIndexedDocument,
  listBacklinks,
  listUnresolvedLinks,
  reindexBrainDatabase,
  searchIndexedDocuments,
} from "../src";

describe("brain-db", () => {
  test("rebuilds a queryable sqlite index from content", () => {
    const rootDir = makeFixture({
      "content/blog/source.mdx": `---
title: Source
publishedAt: "2026-01-01"
summary: Source summary
---
This references [[Target]] and [[Missing]].
`,
      "content/blog/target.mdx": `---
title: Target
publishedAt: "2026-01-02"
summary: Target summary
aliases:
  - Target
---
Searchable body.
`,
    });
    const dbPath = join(rootDir, ".brain", "brain.sqlite");

    const result = reindexBrainDatabase(createBrainConfig(rootDir), dbPath);

    expect(result).toMatchObject({
      documentCount: 2,
      linkCount: 2,
      unresolvedLinkCount: 1,
    });
    expect(getIndexedDocument(dbPath, "source")?.title).toBe("Source");
    expect(searchIndexedDocuments(dbPath, "Searchable")).toHaveLength(1);
    expect(listBacklinks(dbPath, "target")).toHaveLength(1);
    expect(listUnresolvedLinks(dbPath).map((link) => link.target)).toEqual([
      "Missing",
    ]);
  });
});

function makeFixture(files: Record<string, string>): string {
  const rootDir = join(
    tmpdir(),
    `florence-brain-db-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );

  for (const [filePath, content] of Object.entries(files)) {
    const absolutePath = join(rootDir, filePath);
    mkdirSync(join(absolutePath, ".."), { recursive: true });
    writeFileSync(absolutePath, content, "utf-8");
  }

  return rootDir;
}
