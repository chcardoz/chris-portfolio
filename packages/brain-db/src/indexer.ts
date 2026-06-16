import {
  buildBrainGraph,
  readBrainDocuments,
  type BrainConfig,
  type BrainDocument,
  type BrainGraph,
  type BrainLinkEdge,
} from "@florence/brain-core";
import type { Database } from "bun:sqlite";
import { createBrainSchema, openBrainDatabase } from "./schema";

export type ReindexResult = {
  dbPath: string;
  documentCount: number;
  linkCount: number;
  unresolvedLinkCount: number;
};

export function reindexBrainDatabase(
  config: BrainConfig,
  dbPath: string,
): ReindexResult {
  const documents = readBrainDocuments(config);
  const graph = buildBrainGraph(documents);
  const db = openBrainDatabase(dbPath);

  try {
    createBrainSchema(db);
    insertGraph(db, graph);

    return {
      dbPath,
      documentCount: graph.documents.length,
      linkCount: graph.links.length,
      unresolvedLinkCount: graph.unresolvedLinks.length,
    };
  } finally {
    db.close();
  }
}

function insertGraph(db: Database, graph: BrainGraph): void {
  const insert = db.transaction(() => {
    for (const document of graph.documents) {
      insertDocument(db, document);
    }

    for (const link of graph.links) {
      insertLink(db, link);
    }

    db.query(
      `
        INSERT INTO index_runs (indexed_at, document_count, link_count)
        VALUES (?1, ?2, ?3)
      `,
    ).run(new Date().toISOString(), graph.documents.length, graph.links.length);
  });

  insert();
}

function insertDocument(db: Database, document: BrainDocument): void {
  db.query(
    `
      INSERT INTO documents (
        id,
        kind,
        collection,
        slug,
        file_path,
        extension,
        title,
        summary,
        published_at,
        image,
        status,
        draft,
        content,
        raw_content
      )
      VALUES (
        ?1,
        ?2,
        ?3,
        ?4,
        ?5,
        ?6,
        ?7,
        ?8,
        ?9,
        ?10,
        ?11,
        ?12,
        ?13,
        ?14
      )
    `,
  ).run(
    document.id,
    document.kind,
    document.collection,
    document.slug,
    document.filePath,
    document.extension,
    document.frontmatter.title,
    document.frontmatter.summary ?? "",
    document.frontmatter.publishedAt ?? "",
    document.frontmatter.image ?? null,
    document.frontmatter.status,
    document.frontmatter.draft ? 1 : 0,
    document.content,
    document.rawContent,
  );

  const headingQuery = db.query(`
    INSERT INTO headings (document_id, position, depth, slug, text)
    VALUES (?1, ?2, ?3, ?4, ?5)
  `);

  document.headings.forEach((heading, index) => {
    headingQuery.run(
      document.id,
      index,
      heading.depth,
      heading.id,
      heading.text,
    );
  });

  const tagQuery = db.query(`
    INSERT INTO tags (document_id, tag)
    VALUES (?1, ?2)
  `);

  for (const tag of document.tags) {
    tagQuery.run(document.id, tag);
  }

  const aliasQuery = db.query(`
    INSERT INTO aliases (document_id, alias)
    VALUES (?1, ?2)
  `);

  for (const alias of document.aliases) {
    aliasQuery.run(document.id, alias);
  }

  db.query(
    `
      INSERT INTO search_fts (document_id, title, summary, content)
      VALUES (?1, ?2, ?3, ?4)
    `,
  ).run(
    document.id,
    document.frontmatter.title,
    document.frontmatter.summary ?? "",
    document.content,
  );
}

function insertLink(db: Database, link: BrainLinkEdge): void {
  db.query(
    `
      INSERT INTO links (
        from_document_id,
        to_document_id,
        kind,
        target,
        label,
        external
      )
      VALUES (
        ?1,
        ?2,
        ?3,
        ?4,
        ?5,
        ?6
      )
    `,
  ).run(
    link.fromDocumentId,
    link.toDocumentId ?? null,
    link.kind,
    link.target,
    link.label ?? null,
    link.external ? 1 : 0,
  );
}
