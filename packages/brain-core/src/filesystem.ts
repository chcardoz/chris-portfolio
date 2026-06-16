import fs from "node:fs";
import path from "node:path";
import { analyzeMarkdown } from "./markdown";
import { parseFrontmatter } from "./frontmatter";
import type {
  BlogPost,
  BrainConfig,
  BrainDocument,
  ContentCollectionConfig,
} from "./types";

export function readBrainDocuments(config: BrainConfig): BrainDocument[] {
  return config.collections.flatMap((collection) =>
    readCollection(config, collection),
  );
}

export function readBlogPosts(config: BrainConfig): BlogPost[] {
  return readBrainDocuments(config)
    .filter((document): document is BlogPost => document.kind === "post")
    .map((document) => ({
      ...document,
      metadata: {
        title: document.frontmatter.title,
        publishedAt: document.frontmatter.publishedAt ?? "",
        summary: document.frontmatter.summary ?? "",
        image: document.frontmatter.image,
        draft: document.frontmatter.draft,
        tags: document.frontmatter.tags,
        aliases: document.frontmatter.aliases,
        status: document.frontmatter.status,
      },
    }));
}

export function readDocumentRaw(
  config: BrainConfig,
  collectionName: string,
  slug: string,
): string {
  const collection = config.collections.find(
    (item) => item.name === collectionName,
  );
  if (!collection) {
    throw new Error(`Unknown collection: ${collectionName}`);
  }

  const extensions = collection.extensions ?? [".md", ".mdx"];
  for (const extension of extensions) {
    const filePath = path.join(collection.dir, `${slug}${extension}`);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf-8");
    }
  }

  throw new Error(`Document not found: ${collectionName}/${slug}`);
}

export function writeDocumentRaw(
  config: BrainConfig,
  collectionName: string,
  slug: string,
  content: string,
): void {
  const collection = config.collections.find(
    (item) => item.name === collectionName,
  );
  if (!collection) {
    throw new Error(`Unknown collection: ${collectionName}`);
  }

  const extension = collection.extensions?.[0] ?? ".md";
  const filePath = path.join(collection.dir, `${slug}${extension}`);
  fs.writeFileSync(filePath, content, "utf-8");
}

function readCollection(
  config: BrainConfig,
  collection: ContentCollectionConfig,
): BrainDocument[] {
  if (!fs.existsSync(collection.dir)) {
    return [];
  }

  return listContentFiles(collection)
    .sort((a, b) => a.localeCompare(b))
    .map((filePath) => readDocumentFile(config, collection, filePath));
}

function listContentFiles(collection: ContentCollectionConfig): string[] {
  const allowedExtensions = new Set(collection.extensions ?? [".md", ".mdx"]);
  const entries = fs.readdirSync(collection.dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const filePath = path.join(collection.dir, entry.name);

    if (entry.isDirectory()) {
      return listContentFiles({
        ...collection,
        dir: filePath,
      });
    }

    if (!entry.isFile()) return [];
    return allowedExtensions.has(path.extname(entry.name) as ".md" | ".mdx")
      ? [filePath]
      : [];
  });
}

function readDocumentFile(
  config: BrainConfig,
  collection: ContentCollectionConfig,
  filePath: string,
): BrainDocument {
  const rawContent = fs.readFileSync(filePath, "utf-8");
  const extension = path.extname(filePath) as ".md" | ".mdx";
  const slug = slugFromFilePath(collection.dir, filePath);
  const { frontmatter, content } = parseFrontmatter(
    rawContent,
    collection.kind,
  );
  const analysis = analyzeMarkdown(content);
  const tags = [...new Set([...frontmatter.tags, ...analysis.tags])].sort();
  const aliases = [...new Set(frontmatter.aliases)].sort();

  return {
    id: `${collection.name}:${slug}`,
    kind: collection.kind,
    collection: collection.name,
    slug,
    filePath: path.relative(config.rootDir, filePath),
    extension,
    frontmatter: {
      ...frontmatter,
      tags,
      aliases,
    },
    content,
    rawContent,
    headings: analysis.headings,
    links: analysis.links,
    tags,
    aliases,
  };
}

function slugFromFilePath(collectionDir: string, filePath: string): string {
  const relativePath = path.relative(collectionDir, filePath);
  const parsedPath = path.parse(relativePath);
  return path.join(parsedPath.dir, parsedPath.name).split(path.sep).join("/");
}
