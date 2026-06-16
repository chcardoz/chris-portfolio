import Slugger from "github-slugger";
import type { Heading, Link, Root, Text } from "mdast";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import type { BrainHeading, BrainLink } from "./types";

type MdxJsxNode = {
  type: "mdxJsxFlowElement" | "mdxJsxTextElement";
  name?: string;
  attributes?: Array<{ type: string; name?: string; value?: unknown }>;
};

const wikiLinkPattern = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;
const tagPattern = /(^|\s)#([a-zA-Z][\w/-]*)/g;

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMdx);

export type MarkdownAnalysis = {
  headings: BrainHeading[];
  links: BrainLink[];
  tags: string[];
};

export function analyzeMarkdown(source: string): MarkdownAnalysis {
  const tree = processor.parse(source) as Root;
  const slugger = new Slugger();
  const headings: BrainHeading[] = [];
  const links: BrainLink[] = [];
  const tagSet = new Set<string>();

  visit(tree, "heading", (node: Heading) => {
    const text = toPlainText(node);
    headings.push({
      id: slugger.slug(text),
      depth: node.depth,
      text,
    });
  });

  visit(tree, "link", (node: Link) => {
    links.push({
      kind: "markdown",
      target: node.url,
      label: toPlainText(node),
      external: isExternalTarget(node.url),
    });
  });

  visit(tree, "image", (node) => {
    links.push({
      kind: "image",
      target: node.url,
      label: node.alt ?? undefined,
      external: isExternalTarget(node.url),
    });
  });

  visit(tree, "definition", (node) => {
    links.push({
      kind: "definition",
      target: node.url,
      label: node.identifier,
      external: isExternalTarget(node.url),
    });
  });

  visit(tree, (node) => {
    if (isText(node)) {
      extractWikiLinks(node.value, links);
      extractInlineTags(node.value, tagSet);
    }

    if (isMdxJsxNode(node) && node.name === "Citation") {
      const href = getMdxAttribute(node, "href");
      if (href) {
        links.push({
          kind: "citation",
          target: href,
          external: isExternalTarget(href),
        });
      }
    }
  });

  return {
    headings,
    links,
    tags: [...tagSet].sort(),
  };
}

export function isExternalTarget(target: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(target);
}

function extractWikiLinks(source: string, links: BrainLink[]) {
  for (const match of source.matchAll(wikiLinkPattern)) {
    const target = match[1]?.trim();
    if (!target) continue;

    links.push({
      kind: "wikilink",
      target,
      label: match[2]?.trim(),
      external: false,
    });
  }
}

function extractInlineTags(source: string, tags: Set<string>) {
  for (const match of source.matchAll(tagPattern)) {
    const tag = match[2]?.trim();
    if (tag) tags.add(tag);
  }
}

function toPlainText(node: unknown): string {
  if (
    typeof node === "object" &&
    node !== null &&
    "value" in node &&
    typeof node.value === "string"
  ) {
    return node.value;
  }

  if (
    typeof node === "object" &&
    node !== null &&
    "children" in node &&
    Array.isArray(node.children)
  ) {
    return node.children.map((child) => toPlainText(child)).join("");
  }

  return "";
}

function isText(node: unknown): node is Text {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    node.type === "text" &&
    "value" in node &&
    typeof node.value === "string"
  );
}

function isMdxJsxNode(node: unknown): node is MdxJsxNode {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement")
  );
}

function getMdxAttribute(node: MdxJsxNode, name: string): string | undefined {
  const attribute = node.attributes?.find((item) => item.name === name);
  return typeof attribute?.value === "string" ? attribute.value : undefined;
}
