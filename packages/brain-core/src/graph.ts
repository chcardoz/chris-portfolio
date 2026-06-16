import type { BrainDocument, BrainGraph, BrainLinkEdge } from "./types";

export function buildBrainGraph(documents: BrainDocument[]): BrainGraph {
  const documentsBySlug = new Map<string, BrainDocument>();
  const documentsByAlias = new Map<string, BrainDocument>();

  for (const document of documents) {
    documentsBySlug.set(normalizeTarget(document.slug), document);
    documentsBySlug.set(
      normalizeTarget(`/${document.collection}/${document.slug}`),
      document,
    );
    documentsBySlug.set(normalizeTarget(document.id), document);

    for (const alias of document.aliases) {
      documentsByAlias.set(normalizeTarget(alias), document);
    }
  }

  const links = documents.flatMap((document) =>
    document.links.map((link): BrainLinkEdge => {
      const targetDocument = link.external
        ? undefined
        : resolveTarget(link.target, documentsBySlug, documentsByAlias);

      return {
        fromDocumentId: document.id,
        toDocumentId: targetDocument?.id,
        target: link.target,
        kind: link.kind,
        label: link.label,
        external: link.external,
      };
    }),
  );

  const backlinksByDocumentId = new Map<string, BrainLinkEdge[]>();
  for (const link of links) {
    if (!link.toDocumentId) continue;
    backlinksByDocumentId.set(link.toDocumentId, [
      ...(backlinksByDocumentId.get(link.toDocumentId) ?? []),
      link,
    ]);
  }

  return {
    documents,
    links,
    backlinksByDocumentId,
    unresolvedLinks: links.filter(
      (link) => !link.external && !link.toDocumentId,
    ),
  };
}

function resolveTarget(
  target: string,
  documentsBySlug: Map<string, BrainDocument>,
  documentsByAlias: Map<string, BrainDocument>,
): BrainDocument | undefined {
  const normalized = normalizeTarget(target);
  return documentsBySlug.get(normalized) ?? documentsByAlias.get(normalized);
}

function normalizeTarget(target: string): string {
  return target
    .replace(/^\/blog\//, "/blog/")
    .replace(/^\/notes\//, "/notes/")
    .replace(/^\/transcripts\//, "/transcripts/")
    .replace(/^\.\//, "")
    .replace(/\.(md|mdx)$/i, "")
    .split("#")[0]
    .trim()
    .toLowerCase();
}
