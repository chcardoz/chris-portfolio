import { openBrainDatabase } from "./schema";

export type IndexedDocument = {
  id: string;
  kind: string;
  collection: string;
  slug: string;
  filePath: string;
  title: string;
  summary: string;
  publishedAt: string;
  status: string;
  draft: boolean;
  content: string;
  rawContent: string;
};

export type SearchResult = {
  id: string;
  title: string;
  slug: string;
  collection: string;
  summary: string;
  rank: number;
};

export type IndexedLink = {
  fromDocumentId: string;
  fromTitle: string;
  toDocumentId?: string;
  kind: string;
  target: string;
  label?: string;
  external: boolean;
};

export function listIndexedDocuments(dbPath: string): IndexedDocument[] {
  const db = openBrainDatabase(dbPath);
  try {
    return db
      .query<DatabaseDocumentRow, []>(
        `
          SELECT *
          FROM documents
          ORDER BY collection, slug
        `,
      )
      .all()
      .map(toIndexedDocument);
  } finally {
    db.close();
  }
}

export function getIndexedDocument(
  dbPath: string,
  idOrSlug: string,
): IndexedDocument | undefined {
  const db = openBrainDatabase(dbPath);
  try {
    const row = db
      .query<DatabaseDocumentRow, [string, string]>(
        `
          SELECT *
          FROM documents
          WHERE id = ?1 OR slug = ?2
          LIMIT 1
        `,
      )
      .get(idOrSlug, idOrSlug);

    return row ? toIndexedDocument(row) : undefined;
  } finally {
    db.close();
  }
}

export function searchIndexedDocuments(
  dbPath: string,
  query: string,
  limit = 10,
): SearchResult[] {
  const db = openBrainDatabase(dbPath);
  try {
    return db
      .query<SearchResultRow, [string, number]>(
        `
          SELECT
            d.id,
            d.title,
            d.slug,
            d.collection,
            d.summary,
            bm25(search_fts) AS rank
          FROM search_fts
          JOIN documents d ON d.id = search_fts.document_id
          WHERE search_fts MATCH ?1
          ORDER BY rank
          LIMIT ?2
        `,
      )
      .all(query, limit)
      .map((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        collection: row.collection,
        summary: row.summary,
        rank: row.rank,
      }));
  } finally {
    db.close();
  }
}

export function listBacklinks(dbPath: string, idOrSlug: string): IndexedLink[] {
  const document = getIndexedDocument(dbPath, idOrSlug);
  if (!document) return [];

  const db = openBrainDatabase(dbPath);
  try {
    return db
      .query<IndexedLinkRow, [string]>(
        `
          SELECT
            l.from_document_id AS fromDocumentId,
            source.title AS fromTitle,
            l.to_document_id AS toDocumentId,
            l.kind,
            l.target,
            l.label,
            l.external
          FROM links l
          JOIN documents source ON source.id = l.from_document_id
          WHERE l.to_document_id = ?1
          ORDER BY source.title, l.target
        `,
      )
      .all(document.id)
      .map(toIndexedLink);
  } finally {
    db.close();
  }
}

export function listUnresolvedLinks(dbPath: string): IndexedLink[] {
  const db = openBrainDatabase(dbPath);
  try {
    return db
      .query<IndexedLinkRow, []>(
        `
          SELECT
            l.from_document_id AS fromDocumentId,
            source.title AS fromTitle,
            l.to_document_id AS toDocumentId,
            l.kind,
            l.target,
            l.label,
            l.external
          FROM links l
          JOIN documents source ON source.id = l.from_document_id
          WHERE l.external = 0 AND l.to_document_id IS NULL
          ORDER BY source.title, l.target
        `,
      )
      .all()
      .map(toIndexedLink);
  } finally {
    db.close();
  }
}

type DatabaseDocumentRow = {
  id: string;
  kind: string;
  collection: string;
  slug: string;
  file_path: string;
  title: string;
  summary: string;
  published_at: string;
  status: string;
  draft: number;
  content: string;
  raw_content: string;
};

type SearchResultRow = {
  id: string;
  title: string;
  slug: string;
  collection: string;
  summary: string;
  rank: number;
};

type IndexedLinkRow = {
  fromDocumentId: string;
  fromTitle: string;
  toDocumentId: string | null;
  kind: string;
  target: string;
  label: string | null;
  external: number;
};

function toIndexedDocument(row: DatabaseDocumentRow): IndexedDocument {
  return {
    id: row.id,
    kind: row.kind,
    collection: row.collection,
    slug: row.slug,
    filePath: row.file_path,
    title: row.title,
    summary: row.summary,
    publishedAt: row.published_at,
    status: row.status,
    draft: Boolean(row.draft),
    content: row.content,
    rawContent: row.raw_content,
  };
}

function toIndexedLink(row: IndexedLinkRow): IndexedLink {
  return {
    fromDocumentId: row.fromDocumentId,
    fromTitle: row.fromTitle,
    toDocumentId: row.toDocumentId ?? undefined,
    kind: row.kind,
    target: row.target,
    label: row.label ?? undefined,
    external: Boolean(row.external),
  };
}
