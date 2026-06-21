import matter from "gray-matter";
import { z } from "zod";
import type { BrainDocumentKind, BrainFrontmatter } from "./types";

const rawFrontmatterSchema = z.object({
  title: z.string().min(1),
  publishedAt: z.string().optional(),
  summary: z.string().optional(),
  image: z.string().optional(),
  draft: z.boolean().optional(),
  status: z.enum(["draft", "published", "private"]).optional(),
  tags: z.array(z.string()).default([]),
  aliases: z.array(z.string()).default([]),
});

export type ParsedFrontmatter = {
  frontmatter: BrainFrontmatter;
  content: string;
};

export function parseFrontmatter(
  rawContent: string,
  kind: BrainDocumentKind,
): ParsedFrontmatter {
  const parsed = matter(rawContent);
  const result = rawFrontmatterSchema.safeParse(parsed.data);

  if (!result.success) {
    throw new Error(z.prettifyError(result.error));
  }

  const status =
    result.data.status ??
    (result.data.draft ? "draft" : kind === "post" ? "published" : "private");

  return {
    frontmatter: {
      ...result.data,
      status,
      draft: result.data.draft ?? status === "draft",
    },
    content: parsed.content.trim(),
  };
}
