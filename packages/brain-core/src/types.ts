export type BrainDocumentKind = "post" | "note" | "transcript";

export type BrainDocumentStatus = "draft" | "published" | "private";

export type BrainFrontmatter = {
  title: string;
  publishedAt?: string;
  summary?: string;
  image?: string;
  draft?: boolean;
  status: BrainDocumentStatus;
  tags: string[];
  aliases: string[];
};

export type BrainHeading = {
  id: string;
  depth: number;
  text: string;
};

export type BrainLinkKind =
  | "markdown"
  | "wikilink"
  | "citation"
  | "image"
  | "definition";

export type BrainLink = {
  kind: BrainLinkKind;
  target: string;
  label?: string;
  external: boolean;
};

export type BrainDocument = {
  id: string;
  kind: BrainDocumentKind;
  collection: string;
  slug: string;
  filePath: string;
  extension: ".md" | ".mdx";
  frontmatter: BrainFrontmatter;
  content: string;
  rawContent: string;
  headings: BrainHeading[];
  links: BrainLink[];
  tags: string[];
  aliases: string[];
};

export type BrainGraph = {
  documents: BrainDocument[];
  links: BrainLinkEdge[];
  backlinksByDocumentId: Map<string, BrainLinkEdge[]>;
  unresolvedLinks: BrainLinkEdge[];
};

export type BrainLinkEdge = {
  fromDocumentId: string;
  toDocumentId?: string;
  target: string;
  kind: BrainLinkKind;
  label?: string;
  external: boolean;
};

export type BlogPost = BrainDocument & {
  kind: "post";
  metadata: {
    title: string;
    publishedAt: string;
    summary: string;
    image?: string;
    draft?: boolean;
    tags: string[];
    aliases: string[];
    status: BrainDocumentStatus;
  };
};

export type ContentCollectionConfig = {
  name: string;
  kind: BrainDocumentKind;
  dir: string;
  extensions?: Array<".md" | ".mdx">;
};

export type BrainConfig = {
  rootDir: string;
  contentDir: string;
  collections: ContentCollectionConfig[];
};
