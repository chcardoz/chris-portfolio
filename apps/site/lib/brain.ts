import path from "node:path";
import { cache } from "react";
import {
  createBrainConfig,
  readBlogPosts,
  readDocumentRaw,
  writeDocumentRaw,
} from "@florence/brain-core";

export const repoRoot = path.resolve(
  /* turbopackIgnore: true */ process.cwd(),
  "..",
  "..",
);
export const brainConfig = createBrainConfig(repoRoot);

export const getBlogPosts = cache(() => readBlogPosts(brainConfig));

export function readRawBlogPost(slug: string): string {
  return readDocumentRaw(brainConfig, "blog", slug);
}

export function writeRawBlogPost(slug: string, content: string): void {
  writeDocumentRaw(brainConfig, "blog", slug, content);
}
