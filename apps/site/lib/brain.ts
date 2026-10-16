import path from "node:path";
import { cache } from "react";
import { createBrainConfig, readBlogPosts } from "@cbrain/core";

const repoRoot = path.resolve(
  /* turbopackIgnore: true */ process.cwd(),
  "..",
  "..",
);
const brainConfig = createBrainConfig(repoRoot);

export const getBlogPosts = cache(() => readBlogPosts(brainConfig));
