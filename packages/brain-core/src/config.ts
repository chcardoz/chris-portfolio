import path from "node:path";
import type { BrainConfig } from "./types";

export function createBrainConfig(rootDir: string): BrainConfig {
  const contentDir = path.join(rootDir, "content");

  return {
    rootDir,
    contentDir,
    collections: [
      {
        name: "blog",
        kind: "post",
        dir: path.join(contentDir, "blog"),
        extensions: [".mdx"],
      },
      {
        name: "notes",
        kind: "note",
        dir: path.join(contentDir, "notes"),
        extensions: [".md"],
      },
      {
        name: "transcripts",
        kind: "transcript",
        dir: path.join(contentDir, "transcripts"),
        extensions: [".md"],
      },
    ],
  };
}
